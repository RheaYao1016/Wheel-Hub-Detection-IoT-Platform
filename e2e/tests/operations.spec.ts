/**
 * Operations Page E2E Tests
 * Tests for the operations hub with monitoring and digital twin integration
 */
import { test, expect } from '../fixtures';

test.describe('Operations Page', () => {
  test('should load operations page after login', async ({ loginPage, operationsPage }) => {
    await loginPage.loginWithRole('admin');
    await operationsPage.goto();
    await operationsPage.expectPageLoaded();
  });

  test('should display hero section with title', async ({ loginPage, operationsPage }) => {
    await loginPage.loginWithRole('admin');
    await operationsPage.goto();

    await expect(operationsPage.heroTitle).toBeVisible({ timeout: 15000 });
  });

  test('should display workflow steps', async ({ loginPage, operationsPage }) => {
    await loginPage.loginWithRole('admin');
    await operationsPage.goto();

    await expect(operationsPage.workflowSteps).toBeVisible();
  });

  test('should display summary cards', async ({ loginPage, operationsPage }) => {
    await loginPage.loginWithRole('admin');
    await operationsPage.goto();
    await operationsPage.expectSummaryCardsVisible();
  });

  test('should have correct number of summary cards', async ({ loginPage, operationsPage }) => {
    await loginPage.loginWithRole('admin');
    await operationsPage.goto();

    const cardCount = await operationsPage.getSummaryCardCount();
    expect(cardCount).toBeGreaterThanOrEqual(3);
  });

  test('should display monitoring domain card', async ({ loginPage, operationsPage }) => {
    await loginPage.loginWithRole('admin');
    await operationsPage.goto();
    await operationsPage.expectMonitoringCardVisible();
  });

  test('should display governance section', async ({ loginPage, operationsPage }) => {
    await loginPage.loginWithRole('admin');
    await operationsPage.goto();
    await operationsPage.expectGovernanceSectionVisible();
  });

  test('should have refresh button', async ({ loginPage, operationsPage, page }) => {
    await loginPage.loginWithRole('admin');
    await operationsPage.goto();

    // Verify refresh button exists
    const refreshButton = page.locator('.operations-refresh-button');
    await expect(refreshButton).toBeVisible();
  });

  test('should navigate to monitoring details', async ({ loginPage, operationsPage, page }) => {
    await loginPage.loginWithRole('admin');
    await operationsPage.goto();
    await operationsPage.expectMonitoringCardVisible();

    // Click to monitoring
    await operationsPage.navigateToMonitoring();

    // Verify navigation to monitor page
    await page.waitForURL(/\/monitor/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/monitor/);
  });

  test('should navigate to digital twin details', async ({ loginPage, operationsPage, page }) => {
    await loginPage.loginWithRole('admin');
    await operationsPage.goto();
    await operationsPage.expectMonitoringCardVisible();

    // Click to digital twin
    await operationsPage.navigateToDigitalTwin();

    // Verify navigation to digital twin page
    await page.waitForURL(/\/digital-twin/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/digital-twin/);
  });

  test('should navigate to admin governance', async ({ loginPage, operationsPage, page }) => {
    await loginPage.loginWithRole('admin');
    await operationsPage.goto();
    await operationsPage.expectGovernanceSectionVisible();

    // Click go to admin governance link
    const adminLink = page.locator('a[href="/admin"]');
    await adminLink.click();

    // Verify navigation
    await page.waitForURL(/\/admin/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/admin/);
  });
});

test.describe('Operations Page - Navigation from Home', () => {
  test('should navigate from home to operations', async ({ loginPage, homePage, operationsPage, page }) => {
    // Login as viewer (redirects to /home)
    await loginPage.loginWithRole('viewer');
    await homePage.goto();
    await homePage.expectHomePageLoaded();

    // Navigate to operations
    await homePage.navigateToModule('运营交接');
    await page.waitForURL(/\/operations/, { timeout: 10000 });

    // Verify operations page loaded
    await operationsPage.expectPageLoaded();
  });
});
