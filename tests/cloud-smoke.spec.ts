import { test, expect, Page } from "@playwright/test";

const BASE_URL = process.env.TEST_BASE_URL || "http://118.31.164.41:8080/wheelhub";

const ACCOUNTS = [
  { username: "admin-demo", password: "admin123", role: "admin" },
  { username: "engineer-demo", password: "engineer123", role: "engineer" },
  { username: "operator-demo", password: "user123", role: "operator" },
  { username: "viewer-demo", password: "viewer123", role: "viewer" },
];

async function login(page: Page, username: string, password: string, role: string) {
  await page.goto(BASE_URL + "/login");
  await page.waitForSelector(".auth-form", { timeout: 15000 });

  // 选择与账号对应的角色（按顺序：admin / engineer / operator / viewer）
  const roleIndex = ["admin", "engineer", "operator", "viewer"].indexOf(role);
  const roleCard = page.locator(".auth-role-card").nth(roleIndex);
  if (await roleCard.isVisible().catch(() => false)) {
    await roleCard.click();
  }

  await page.fill(".auth-form input[autocomplete='username']", username);
  await page.fill(".auth-form input[autocomplete='current-password']", password);
  await page.click(".auth-form button[type='submit']");
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });
}

const ROUTES = [
  "/admin",
  "/admin/data-import",
  "/monitor",
  "/visualize",
  "/digital-twin",
  "/platform-config",
  "/ai-assistant",
  "/data-hub",
  "/training",
  "/annotation",
  "/operations",
];

function isKnownNonFatal(text: string) {
  return (
    /Minified React error #(418|423|425)/.test(text) ||
    /Failed to execute '(insertBefore|removeChild)' on 'Node'/.test(text) ||
    /THREE\.RGBELoader/.test(text) ||
    /Invalid typed array length/.test(text) ||
    /Failed to fetch/.test(text)
  );
}

test("云端子目录根路径可访问", async ({ page }) => {
  await page.goto(BASE_URL + "/");
  await page.waitForURL((url) => url.pathname !== "/wheelhub/", { timeout: 15000 });
  const finalPath = new URL(page.url()).pathname;
  expect(finalPath).not.toBe("/wheelhub/");
});

test("云端登录页可访问", async ({ page }) => {
  await page.goto(BASE_URL + "/login");
  await expect(page.locator(".auth-form").first()).toBeVisible({ timeout: 15000 });
});

for (const account of ACCOUNTS) {
  test(`${account.role} 角色登录并遍历主要页面`, async ({ page }) => {
    test.setTimeout(300000);
    const errors: string[] = [];
    const failedRequests: string[] = [];

    page.on("pageerror", (e) => {
      if (!isKnownNonFatal(e.message)) errors.push(`[pageerror] ${e.message}`);
    });
    page.on("console", (msg) => {
      if (msg.type() === "error" && !isKnownNonFatal(msg.text())) {
        errors.push(`[console] ${msg.text()}`);
      }
    });
    page.on("requestfailed", (req) => {
      failedRequests.push(`${req.method()} ${req.url()} -> ${req.failure()?.errorText || "failed"}`);
    });

    await login(page, account.username, account.password, account.role);
    await page.waitForTimeout(500);

    for (const route of ROUTES) {
      await page.goto(BASE_URL + route);
      try {
        await page.waitForLoadState("networkidle", { timeout: 15000 });
      } catch {
        await page.waitForLoadState("domcontentloaded", { timeout: 10000 });
      }
      await page.waitForTimeout(600);

      const bodyText = await page.locator("body").innerText({ timeout: 5000 }).catch(() => "");
      const lower = bodyText.toLowerCase();
      const crashed =
        lower.includes("application error") ||
        lower.includes("server error") ||
        lower.includes("internal server error") ||
        lower.includes("this page crashed") ||
        lower.includes("unhandled runtime error");

      expect.soft(crashed, `Route ${route} should not show a crash for ${account.role}`).toBe(false);
    }

    if (failedRequests.length > 0) {
      await test.info().attach("failed-requests.txt", {
        body: failedRequests.slice(0, 50).join("\n"),
        contentType: "text/plain",
      });
    }
    if (errors.length > 0) {
      await test.info().attach("console-errors.txt", {
        body: errors.join("\n"),
        contentType: "text/plain",
      });
    }

    expect(errors.length, `Unexpected console errors: ${errors.join("\n")}`).toBe(0);
  });
}
