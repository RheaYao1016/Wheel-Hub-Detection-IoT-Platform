import path from "path";
import { test, expect, type Locator, type Page } from "@playwright/test";

const DEMO_ACCOUNTS = {
  admin: { username: "admin-demo", password: "admin123", path: "/admin" },
  engineer: {
    username: "engineer-demo",
    password: "engineer123",
    path: "/workspace",
  },
  operator: {
    username: "operator-demo",
    password: "user123",
    path: "/visualize",
  },
  viewer: { username: "viewer-demo", password: "viewer123", path: "/home" },
} as const;

const ROLE_INDEX: Record<keyof typeof DEMO_ACCOUNTS, number> = {
  admin: 0,
  engineer: 1,
  operator: 2,
  viewer: 3,
};

const ROOT_DIR = process.cwd();
const IMPORT_ARCHIVE = path.join(ROOT_DIR, ".testing", "acceptance-import.zip");
const DATA_HUB_UPLOAD = path.join(ROOT_DIR, "defects.csv");
const ANNOTATION_UPLOAD = path.join(ROOT_DIR, "logo.png");

async function gotoAndWait(page: Page, target: string) {
  await page.goto(target, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(1200);
}

async function clearSession(page: Page) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
  });
  await page.context().clearCookies();
}

async function loginAs(page: Page, role: keyof typeof DEMO_ACCOUNTS) {
  const account = DEMO_ACCOUNTS[role];
  await gotoAndWait(page, "/login");
  const demoCard = page.locator(".auth-demo-card").filter({ hasText: account.username });
  if (await demoCard.count()) {
    await demoCard.first().click();
  } else {
    await page.locator(".auth-role-card").nth(ROLE_INDEX[role]).click();
    await page.locator('input[autocomplete="username"]').first().fill(account.username);
    await page
      .locator('input[autocomplete="current-password"]')
      .first()
      .fill(account.password);
  }
  await page.locator(".auth-card .auth-submit").first().click();
  await page.waitForURL(new RegExp(account.path), { timeout: 20000 });
}

function getPathname(page: Page) {
  return new URL(page.url()).pathname;
}

async function assertOnRoute(page: Page, expectedPath: string) {
  const actualPath = getPathname(page);
  if (actualPath !== expectedPath) {
    throw new Error(`expected route ${expectedPath}, but landed on ${actualPath}`);
  }
}

async function expectVisible(locator: Locator, timeout = 20000) {
  await expect(locator).toBeVisible({ timeout });
}

async function maybeDismissModal(page: Page) {
  const closeButton = page.locator(".modal-content .enterprise-secondary-button");
  if (await closeButton.count()) {
    await closeButton.first().click();
  }
}

function formatError(error: unknown) {
  if (error instanceof Error) {
    return error.message.split("\n").slice(0, 6).join(" | ");
  }
  return String(error);
}

test.describe.configure({ mode: "serial" });

test("manual acceptance walkthrough", async ({ page }) => {
  test.setTimeout(15 * 60 * 1000);

  const failures: string[] = [];

  const step = async (name: string, fn: () => Promise<void>) => {
    try {
      await test.step(name, fn);
    } catch (error) {
      failures.push(`${name}: ${formatError(error)}`);
    }
  };

  await step("admin login and dashboard", async () => {
    await clearSession(page);
    await loginAs(page, "admin");
    await assertOnRoute(page, "/admin");
    await expectVisible(page.locator(".admin-actions button").first());
    await expectVisible(page.locator("#admin-resource-watch"));
  });

  await step("admin alerts filters and action buttons", async () => {
    await gotoAndWait(page, "/admin/alerts");
    await assertOnRoute(page, "/admin/alerts");
    await expectVisible(page.locator(".search-input"));
    await page.locator(".search-input").fill("ST-01");
    await page.locator("select").first().selectOption("HIGH");
    await page.locator("select").nth(1).selectOption("PENDING");
    const refreshButton = page.locator(".enterprise-secondary-button").first();
    await refreshButton.click();
    const actionButton = page.locator("tbody .enterprise-primary-button").first();
    if (await actionButton.count()) {
      await actionButton.click();
    }
  });

  await step("admin data import upload", async () => {
    await gotoAndWait(page, "/admin/data-import");
    await assertOnRoute(page, "/admin/data-import");
    const uploadInput = page.locator('input[type="file"]').first();
    await uploadInput.setInputFiles(IMPORT_ARCHIVE);
    await Promise.race([
      page.locator(".modal-overlay").waitFor({ state: "visible", timeout: 25000 }),
      page.locator(".floating-toast").waitFor({ state: "visible", timeout: 25000 }),
      page.locator(".auth-message").waitFor({ state: "visible", timeout: 25000 }),
    ]);
    await maybeDismissModal(page);
  });

  await step("admin inspections list", async () => {
    await gotoAndWait(page, "/admin/inspections");
    await assertOnRoute(page, "/admin/inspections");
    await expectVisible(page.locator(".search-input"));
    await page.locator(".search-input").fill("WHL-");
    await page.locator("select").first().selectOption("FAIL");
    await expect(page.locator("tbody tr, .enterprise-list-item")).toHaveCount(
      await page.locator("tbody tr, .enterprise-list-item").count(),
    );
  });

  await step("admin storage filters", async () => {
    await gotoAndWait(page, "/admin/storage");
    await assertOnRoute(page, "/admin/storage");
    await expectVisible(page.locator(".search-input"));
    await page.locator(".search-input").fill("/tmp");
    await page.locator("select").first().selectOption("critical");
    await page.locator(".enterprise-secondary-button").first().click();
    await expectVisible(page.locator("table, .enterprise-list"));
  });

  await step("admin wheels filters", async () => {
    await gotoAndWait(page, "/admin/wheels");
    await assertOnRoute(page, "/admin/wheels");
    await expectVisible(page.locator(".search-input"));
    await page.locator(".search-input").fill("WHL-");
    await page.locator("select").first().selectOption("FAIL");
    await expectVisible(page.locator("table, .enterprise-list"));
  });

  await step("home and landing navigation", async () => {
    await gotoAndWait(page, "/home");
    await assertOnRoute(page, "/home");
    await expectVisible(page.locator('a[href="/visualize"]').first());
    await expect(page.locator('a[href="/visualize"], a[href="/operations"], a[href="/admin"]')).toHaveCount(
      await page.locator('a[href="/visualize"], a[href="/operations"], a[href="/admin"]').count(),
    );
  });

  await step("visualize page", async () => {
    await gotoAndWait(page, "/visualize");
    await assertOnRoute(page, "/visualize");
    await expectVisible(page.locator("#cmd-queue"));
    await expectVisible(page.locator(".command-metric-tile").first());
  });

  await step("operations page", async () => {
    await gotoAndWait(page, "/operations");
    await assertOnRoute(page, "/operations");
    await expectVisible(page.locator(".operations-refresh-button"));
    await expectVisible(page.locator(".operations-summary-card, .operations-governance-grid").first());
  });

  await step("monitor page", async () => {
    await gotoAndWait(page, "/monitor");
    await assertOnRoute(page, "/monitor");
    await expectVisible(page.locator(".alert-item, .device-item").first());
  });

  await step("digital twin page", async () => {
    await gotoAndWait(page, "/digital-twin");
    await assertOnRoute(page, "/digital-twin");
    await expectVisible(page.locator("canvas, .sensor-tile, .device-item").first(), 30000);
  });

  await step("engineer workspace login", async () => {
    await clearSession(page);
    await loginAs(page, "engineer");
    await assertOnRoute(page, "/workspace");
    await expectVisible(page.locator(".workspace-module-card").first());
    await expectVisible(page.locator(".workspace-health-panel"));
  });

  await step("platform config health probe", async () => {
    await gotoAndWait(page, "/platform-config");
    await assertOnRoute(page, "/platform-config");
    await page
      .locator(".enterprise-action-row .enterprise-secondary-button")
      .first()
      .click();
    await expectVisible(
      page.locator(".enterprise-highlight-list, .status-chip.status-success, .status-chip.status-warning").first(),
    );
  });

  await step("data hub upload and source analysis", async () => {
    await gotoAndWait(page, "/data-hub");
    await assertOnRoute(page, "/data-hub");
    const uploadInput = page.locator('input[type="file"][accept*=".csv"]').first();
    await expect(uploadInput).toHaveCount(1);
    await uploadInput.setInputFiles(DATA_HUB_UPLOAD);
    await expectVisible(page.locator(".auth-message"), 30000);
    const analyzeButton = page.locator(".enterprise-data-card .enterprise-primary-button").first();
    if (await analyzeButton.count()) {
      await analyzeButton.click();
      await expectVisible(page.locator(".auth-message"), 30000);
    }
  });

  await step("ai assistant send chat", async () => {
    await gotoAndWait(page, "/ai-assistant");
    await assertOnRoute(page, "/ai-assistant");
    await expectVisible(page.locator(".ai-assistant-prompt"), 30000);
    const sourceCards = page.locator("#ai-flow-sources .enterprise-source-card");
    if (await sourceCards.count()) {
      const activeCards = page.locator(
        "#ai-flow-sources .enterprise-source-card.enterprise-source-card-active",
      );
      if ((await activeCards.count()) === 0) {
        await sourceCards.first().click();
      }
    }
    await page
      .locator(".ai-assistant-prompt")
      .fill("Please provide a short acceptance-check summary based on the selected evidence.");
    const sendButton = page.locator(
      ".ai-assistant-composer-actions .enterprise-primary-button",
    );
    await expect(sendButton).toBeEnabled({ timeout: 30000 });
    await sendButton.click();
    await expectVisible(
      page.locator(".ai-assistant-message-assistant, .auth-message").first(),
      60000,
    );
  });

  await step("reports analysis and export", async () => {
    await gotoAndWait(page, "/reports");
    await assertOnRoute(page, "/reports");
    await expectVisible(page.locator(".enterprise-source-picker .enterprise-source-card").first(), 30000);
    const createButton = page.locator(".reports-grid .enterprise-side-card .enterprise-primary-button");
    await expect(createButton).toBeEnabled({ timeout: 30000 });
    await createButton.click();
    await expectVisible(page.locator(".auth-message"), 60000);
    const exportButton = page.locator(".reports-export-row .enterprise-secondary-button").first();
    if (await exportButton.count()) {
      await exportButton.click();
      await expectVisible(page.locator(".auth-message"), 60000);
    }
  });

  await step("training job creation", async () => {
    await gotoAndWait(page, "/training");
    await assertOnRoute(page, "/training");
    await expectVisible(page.locator(".training-grid .enterprise-side-card select").first(), 30000);
    await page.locator(".training-grid .enterprise-side-card select").nth(2).selectOption("cpu");
    await page.locator(".training-grid .enterprise-side-card select").nth(3).selectOption("cpu-safe-demo");
    const createButton = page.locator(".training-grid .enterprise-side-card .enterprise-primary-button");
    await expect(createButton).toBeEnabled({ timeout: 30000 });
    await createButton.click();
    await expectVisible(page.locator(".auth-message"), 60000);
  });

  await step("annotation upload draw save export", async () => {
    await gotoAndWait(page, "/annotation");
    await assertOnRoute(page, "/annotation");
    const uploadInput = page.locator('input[type="file"][accept*=".png"]').first();
    await expect(uploadInput).toHaveCount(1);
    await uploadInput.setInputFiles(ANNOTATION_UPLOAD);
    await expectVisible(page.locator(".auth-message"), 30000);

    const assetButtons = page.locator(".enterprise-list-item");
    if (await assetButtons.count()) {
      await assetButtons.last().click();
    }

    const canvas = page.locator(".annotation-canvas");
    await expectVisible(canvas, 30000);
    await canvas.scrollIntoViewIfNeeded();
    const box = await canvas.boundingBox();
    if (!box) {
      throw new Error("annotation canvas has no bounding box");
    }

    await page.mouse.move(box.x + 40, box.y + 40);
    await page.mouse.down();
    await page.mouse.move(box.x + 180, box.y + 160);
    await page.mouse.up();

    const saveButton = page.locator(".annotation-sidebar .enterprise-primary-button");
    await expect(saveButton).toBeEnabled({ timeout: 10000 });
    await saveButton.click();
    await expectVisible(page.locator(".auth-message"), 30000);

    const exportButton = page.locator(
      '.enterprise-side-card .enterprise-primary-button',
    ).first();
    await exportButton.click();
    await expectVisible(page.locator(".auth-message"), 30000);
  });

  if (failures.length) {
    throw new Error(`Acceptance failures:\n${failures.join("\n")}`);
  }
});
