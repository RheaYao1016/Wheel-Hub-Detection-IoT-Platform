/**
 * Command Center (Visualize) Page E2E Tests
 * Tests for the command center with charts, queue, and logs
 */
import { test, expect } from '../fixtures';

test.describe('Command Center Page', () => {
  test('should load command center page after login', async ({ loginPage, commandCenterPage }) => {
    // Login as admin (redirects to /admin) then navigate to /visualize
    await loginPage.loginWithRole('admin');
    await commandCenterPage.goto();
    await commandCenterPage.expectPageLoaded();
  });

  test('should display command center page title', async ({ loginPage, commandCenterPage }) => {
    await loginPage.loginWithRole('admin');
    await commandCenterPage.goto();
    await commandCenterPage.expectPageLoaded();

    const title = await commandCenterPage.getTitle();
    expect(title).toBeTruthy();
  });

  test('should display workflow steps', async ({ loginPage, commandCenterPage }) => {
    await loginPage.loginWithRole('admin');
    await commandCenterPage.goto();

    await expect(commandCenterPage.workflowSteps).toBeVisible();
  });

  test('should display quality chart section', async ({ loginPage, commandCenterPage }) => {
    await loginPage.loginWithRole('admin');
    await commandCenterPage.goto();
    await commandCenterPage.expectQualityChartVisible();
  });

  test('should display throughput chart section', async ({ loginPage, commandCenterPage }) => {
    await loginPage.loginWithRole('admin');
    await commandCenterPage.goto();
    await commandCenterPage.expectThroughputChartVisible();
  });

  test('should display execution log section', async ({ loginPage, commandCenterPage }) => {
    await loginPage.loginWithRole('admin');
    await commandCenterPage.goto();
    await commandCenterPage.expectExecutionLogVisible();
  });

  test('should have quick jump navigation', async ({ loginPage, commandCenterPage }) => {
    await loginPage.loginWithRole('admin');
    await commandCenterPage.goto();
    await commandCenterPage.expectQuickJumpNavVisible();
  });

  test('should display hero section with story cards', async ({ loginPage, commandCenterPage, page }) => {
    await loginPage.loginWithRole('admin');
    await commandCenterPage.goto();

    // Verify hero section exists
    const heroSection = page.locator('#cmd-hero');
    await expect(heroSection).toBeVisible();

    // Verify story cards strip
    const storyStrip = page.locator('.command-story-strip');
    await expect(storyStrip).toBeVisible();
  });

  test('should display metric tiles', async ({ loginPage, commandCenterPage, page }) => {
    await loginPage.loginWithRole('admin');
    await commandCenterPage.goto();

    // Verify metric row exists
    const metricRow = page.locator('.command-metric-row');
    await expect(metricRow).toBeVisible();
  });

  test('should display operations scope card', async ({ loginPage, commandCenterPage, page }) => {
    await loginPage.loginWithRole('admin');
    await commandCenterPage.goto();

    // Verify operations scope card
    const opsScope = page.locator('.command-hero-visual');
    await expect(opsScope).toBeVisible();
  });

  test('should display live queue section', async ({ loginPage, commandCenterPage, page }) => {
    await loginPage.loginWithRole('admin');
    await commandCenterPage.goto();

    // Verify live queue section
    const liveQueue = page.locator('#cmd-queue');
    await expect(liveQueue).toBeVisible();
  });

  test('should display back button', async ({ loginPage, commandCenterPage }) => {
    await loginPage.loginWithRole('admin');
    await commandCenterPage.goto();

    // Verify back button exists
    const backButton = commandCenterPage.page.locator('[class*="BackButton"]').first();
    await expect(backButton).toBeVisible();
  });
});

test.describe('Command Center - Navigation', () => {
  test('should navigate from home to command center', async ({ loginPage, homePage, page }) => {
    // Login as viewer (redirects to /home)
    await loginPage.loginWithRole('viewer');
    await homePage.goto();
    await homePage.expectHomePageLoaded();

    // Navigate to command center
    await homePage.navigateToModule('指挥中心');
    await page.waitForURL(/\/visualize/, { timeout: 10000 });

    // Verify we are on command center page
    await expect(page).toHaveURL(/\/visualize/);
  });
});
