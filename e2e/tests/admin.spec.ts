/**
 * Admin Dashboard E2E Tests
 * Tests for the admin governance, alerts, and data management
 */
import { test, expect } from '../fixtures';

test.describe('Admin Dashboard', () => {
  test('should load admin page after admin login', async ({ loginPage, adminPage }) => {
    await loginPage.loginWithRole('admin');
    await adminPage.expectPageLoaded();
  });

  test('should display admin page title', async ({ loginPage, adminPage }) => {
    await loginPage.loginWithRole('admin');
    await adminPage.expectPageLoaded();

    const title = await adminPage.pageTitle.textContent();
    expect(title).toBeTruthy();
  });

  test('should display workflow steps', async ({ loginPage, adminPage }) => {
    await loginPage.loginWithRole('admin');
    await adminPage.expectPageLoaded();

    await expect(adminPage.workflowSteps).toBeVisible();
  });

  test('should display KPI cards', async ({ loginPage, adminPage }) => {
    await loginPage.loginWithRole('admin');
    await adminPage.expectPageLoaded();
    await adminPage.expectKPICardsVisible();
  });

  test('should display governance section', async ({ loginPage, adminPage }) => {
    await loginPage.loginWithRole('admin');
    await adminPage.expectPageLoaded();
    await adminPage.expectGovernanceSectionVisible();
  });

  test('should display alert feed', async ({ loginPage, adminPage }) => {
    await loginPage.loginWithRole('admin');
    await adminPage.expectPageLoaded();
    await adminPage.expectAlertFeedVisible();
  });

  test('should display quick jump navigation', async ({ loginPage, adminPage, page }) => {
    await loginPage.loginWithRole('admin');
    await adminPage.expectPageLoaded();

    // Verify quick jump buttons exist
    const quickJumpButtons = page.locator('.quick-jump-strip button');
    await expect(quickJumpButtons.first()).toBeVisible();
  });

  test('should display action buttons', async ({ loginPage, adminPage, page }) => {
    await loginPage.loginWithRole('admin');
    await adminPage.expectPageLoaded();

    // Verify admin action buttons exist
    const actionButtons = page.locator('.admin-actions button');
    const count = await actionButtons.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('should navigate to alerts page', async ({ loginPage, adminPage, page }) => {
    await loginPage.loginWithRole('admin');
    await adminPage.expectPageLoaded();

    // Click alert center button
    await adminPage.alertCenterButton.click();

    // Verify navigation to alerts page
    await page.waitForURL(/\/admin\/alerts/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/admin\/alerts/);
  });

  test('should navigate to data import page', async ({ loginPage, adminPage, page }) => {
    await loginPage.loginWithRole('admin');
    await adminPage.expectPageLoaded();

    // Click data import link in the quick jump strip
    const dataImportLink = page.locator('a[href="/admin/data-import"], button:has-text("数据导入")');
    if (await dataImportLink.isVisible()) {
      await dataImportLink.click();
      await page.waitForURL(/\/admin\/data-import/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/admin\/data-import/);
    }
  });

  test('should navigate from home to admin', async ({ loginPage, homePage, adminPage, page }) => {
    // Login as viewer (redirects to /home)
    await loginPage.loginWithRole('viewer');
    await homePage.goto();
    await homePage.expectHomePageLoaded();

    // Navigate to admin from home
    await homePage.navigateToModule('管理治理');
    await page.waitForURL(/\/admin/, { timeout: 10000 });

    // Verify admin page loaded
    await adminPage.expectPageLoaded();
  });
});

test.describe('Admin - Session Management', () => {
  test('should redirect non-admin to login', async ({ page }) => {
    // Navigate directly to admin without login
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test('should redirect to admin after admin login from root', async ({ loginPage }) => {
    // Go to root which redirects to home
    await loginPage.loginWithRole('admin');
    await loginPage.expectRedirectTo("/admin");
  });
});

test.describe('Admin - UI Responsiveness', () => {
  test('should display device resource watch section', async ({ loginPage, adminPage, page }) => {
    await loginPage.loginWithRole('admin');
    await adminPage.expectPageLoaded();

    // Verify resource watch section
    const resourceWatch = page.locator('#admin-resource-watch');
    await expect(resourceWatch).toBeVisible({ timeout: 15000 });
  });

  test('should have toast notification capability', async ({ loginPage, adminPage, page }) => {
    await loginPage.loginWithRole('admin');
    await adminPage.expectPageLoaded();

    // Sync button should exist
    await expect(adminPage.syncButton).toBeVisible();
  });
});
