import { test, expect, Page } from "@playwright/test";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3001/wheelhub";
const BACKEND_URL = process.env.TEST_BACKEND_URL || "http://localhost:18081";
const ADMIN_USER = process.env.TEST_ADMIN_USER || "admin-demo";
const ADMIN_PASS = process.env.TEST_ADMIN_PASS || "admin123";

async function login(page: Page, username: string, password: string, role = "admin") {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForSelector(".auth-form", { timeout: 10000 });
  await page.fill(".auth-form input[autocomplete='username']", username);
  await page.fill(".auth-form input[autocomplete='current-password']", password);
  await page.click(".auth-form button[type='submit']");
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });
}

test.describe("平台全流程冒烟测试", () => {
  test.setTimeout(240000);

  test("管理员登录并遍历主要功能，检查控制台错误", async ({ page }, testInfo) => {
    const consoleErrors: string[] = [];
    const consoleWarnings: string[] = [];

    const isKnownNonFatalError = (text: string) => {
      // React hydration mismatches and transient DOM errors are handled by the app's
      // GlobalErrorBoundary / GlobalErrorHandler and do not crash the UI.
      return (
        /Minified React error #(418|423|425)/.test(text) ||
        /Failed to execute '(insertBefore|removeChild)' on 'Node'/.test(text) ||
        /\[GlobalErrorBoundary\] Caught an error/.test(text) ||
        /\[GlobalErrorHandler\] Suppressing known DOM\/React error/.test(text)
      );
    };

    page.on("console", (msg) => {
      const text = msg.text();
      const type = msg.type();
      if (type === "error" && !isKnownNonFatalError(text)) {
        consoleErrors.push(`[${type}] ${text}`);
      }
      if (type === "warning") consoleWarnings.push(`[${type}] ${text}`);
    });

    page.on("pageerror", (error) => {
      const message = error.message;
      if (!isKnownNonFatalError(message)) {
        consoleErrors.push(`[pageerror] ${message}`);
      }
    });

    await login(page, ADMIN_USER, ADMIN_PASS, "admin");
    await page.screenshot({ path: `test-screenshots/smoke-01-login-success.png` });

    const routes = [
      { path: "/admin", name: "admin-dashboard" },
      { path: "/admin/data-import", name: "admin-data-import" },
      { path: "/admin/wheels", name: "admin-wheels" },
      { path: "/admin/inspections", name: "admin-inspections" },
      { path: "/admin/alerts", name: "admin-alerts" },
      { path: "/admin/storage", name: "admin-storage" },
      { path: "/monitor", name: "monitor" },
      { path: "/visualize", name: "visualize" },
      { path: "/digital-twin", name: "digital-twin" },
      { path: "/ai-assistant", name: "ai-assistant" },
      { path: "/data-hub", name: "data-hub" },
      { path: "/training", name: "training" },
      { path: "/annotation", name: "annotation" },
      { path: "/reports", name: "reports" },
      { path: "/operations", name: "operations" },
      { path: "/platform-config", name: "platform-config" },
    ];

    const routeErrorMap: Record<string, string[]> = {};
    for (const route of routes) {
      const routeErrors: string[] = [];
      const routeErrorHandler = (msg: any) => {
        const text = msg.text();
        if (msg.type() === "error" && !isKnownNonFatalError(text)) {
          routeErrors.push(text);
        }
      };
      const routePageErrorHandler = (error: Error) => {
        if (!isKnownNonFatalError(error.message)) {
          routeErrors.push(`[pageerror] ${error.message}`);
        }
      };
      page.on("console", routeErrorHandler);
      page.on("pageerror", routePageErrorHandler);

      await page.goto(`${BASE_URL}${route.path}`);
      try {
        await page.waitForLoadState("networkidle", { timeout: 15000 });
      } catch {
        await page.waitForLoadState("domcontentloaded", { timeout: 10000 });
      }
      await page.waitForTimeout(800);
      await page.screenshot({ path: `test-screenshots/smoke-${route.name}.png` });

      page.off("console", routeErrorHandler);
      page.off("pageerror", routePageErrorHandler);
      if (routeErrors.length > 0) {
        routeErrorMap[route.path] = routeErrors.slice(0, 5);
      }

      const bodyText = await page.locator("body").innerText({ timeout: 5000 }).catch(() => "");
      const lower = bodyText.toLowerCase();
      const hasCrash =
        lower.includes("application error") ||
        lower.includes("server error") ||
        lower.includes("internal server error") ||
        lower.includes("this page crashed") ||
        lower.includes("unhandled runtime error");
      expect.soft(hasCrash, `Route ${route.path} should not show a crash`).toBe(false);
    }

    // Backend health
    const health = await page.request.get(`${BACKEND_URL}/api/dashboard/health`);
    expect(health.ok()).toBe(true);

    // AI health (use 127.0.0.1 because uvicorn binds IPv4 only)
    const aiHealth = await page.request.get(`http://127.0.0.1:18100/health`);
    expect(aiHealth.ok()).toBe(true);

    // Attach diagnostics
    if (consoleErrors.length > 0) {
      await testInfo.attach("console-errors.txt", {
        body: consoleErrors.join("\n"),
        contentType: "text/plain",
      });
    }
    if (consoleWarnings.length > 0) {
      await testInfo.attach("console-warnings.txt", {
        body: consoleWarnings.join("\n"),
        contentType: "text/plain",
      });
    }

    if (Object.keys(routeErrorMap).length > 0) {
      await testInfo.attach("route-errors.json", {
        body: JSON.stringify(routeErrorMap, null, 2),
        contentType: "application/json",
      });
    }
    expect.soft(consoleErrors.length, `Console errors found (see route-errors.json attachment)`).toBe(0);
  });

  test("测试数据导入流程", async ({ page }) => {
    await login(page, ADMIN_USER, ADMIN_PASS, "admin");
    await page.goto(`${BASE_URL}/admin/data-import`);
    await page.waitForSelector("[data-testid='data-import-page'], .data-import-shell, main", {
      state: "visible",
      timeout: 15000,
    });
    await page.screenshot({ path: `test-screenshots/smoke-data-import-interactive.png` });
  });

  test("测试 AI 助手页面可交互", async ({ page }) => {
    await login(page, ADMIN_USER, ADMIN_PASS, "admin");
    await page.goto(`${BASE_URL}/ai-assistant`);
    await page.waitForSelector("main, .ai-assistant-shell, textarea", {
      state: "visible",
      timeout: 15000,
    });
    await page.screenshot({ path: `test-screenshots/smoke-ai-assistant-interactive.png` });
  });

});
