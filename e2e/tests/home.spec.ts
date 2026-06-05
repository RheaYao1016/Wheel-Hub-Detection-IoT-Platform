/**
 * Home Page E2E Tests
 * Tests for the landing/home page with module cards, roadmap, and navigation
 */
import { test, expect } from '../fixtures';

test.describe('Home Page', () => {
  test('should load home page successfully', async ({ homePage }) => {
    await homePage.goto();
    await homePage.expectHomePageLoaded();
  });

  test('should display module cards for all platform sections', async ({ homePage }) => {
    await homePage.goto();

    // Verify key module cards exist
    await homePage.expectModuleCard('指挥中心');
    await homePage.expectModuleCard('运营交接');
    await homePage.expectModuleCard('监控中心');
    await homePage.expectModuleCard('数字孪生');
    await homePage.expectModuleCard('AI工作台');
    await homePage.expectModuleCard('管理治理');
  });

  test('should display roadmap section', async ({ homePage }) => {
    await homePage.goto();
    await homePage.expectRoadmapVisible();
  });

  test('should navigate to command center from home page', async ({ homePage, page }) => {
    await homePage.goto();
    await homePage.expectHomePageLoaded();

    // Click on command center module card
    await homePage.navigateToModule('指挥中心');

    // Verify navigation to visualize page
    await page.waitForURL(/\/visualize/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/visualize/);
  });

  test('should navigate to operations hub from home page', async ({ homePage, page }) => {
    await homePage.goto();
    await homePage.expectHomePageLoaded();

    // Click on operations module card
    await homePage.navigateToModule('运营交接');

    // Verify navigation to operations page
    await page.waitForURL(/\/operations/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/operations/);
  });

  test('should navigate to admin from home page', async ({ homePage, page }) => {
    await homePage.goto();
    await homePage.expectHomePageLoaded();

    // Click on admin module card
    await homePage.navigateToModule('管理治理');

    // Verify navigation to admin page
    await page.waitForURL(/\/admin/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/admin/);
  });

  test('should navigate to digital twin from home page', async ({ homePage, page }) => {
    await homePage.goto();
    await homePage.expectHomePageLoaded();

    // Click on digital twin module card
    await homePage.navigateToModule('数字孪生');

    // Verify navigation to digital twin page
    await page.waitForURL(/\/digital-twin/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/digital-twin/);
  });

  test('should have quick jump navigation buttons', async ({ homePage, page }) => {
    await homePage.goto();

    // Verify quick jump buttons exist
    await expect(homePage.quickJumpButtons.first()).toBeVisible();

    // Click core flow quick jump and verify scroll
    await homePage.quickJumpToSection('核心流程');
    // Scroll should have moved (we just verify no error)
  });

  test('should display workflow steps', async ({ homePage, page }) => {
    await homePage.goto();

    // Verify workflow steps section exists
    const workflowSteps = page.locator('[class*="WorkflowSteps"]');
    await expect(workflowSteps).toBeVisible();
  });

  test('should display hero section with metrics', async ({ homePage, page }) => {
    await homePage.goto();

    // Verify hero section with metric cards
    const metricCards = page.locator('.command-story-card, .command-metric-tile');
    const count = await metricCards.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('Home Page - Redirect from Root', () => {
  test('should redirect from / to /home', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Verify redirect happened
    await expect(page).toHaveURL(/\/home/);
  });
});
