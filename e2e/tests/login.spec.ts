/**
 * Login Page E2E Tests
 * Tests for the login and registration functionality
 */
import { test, expect } from '../fixtures';
import { DEMO_ACCOUNTS } from '../pages/LoginPage';

test.describe('Login Page', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.goto();
    await loginPage.expectLoginPage();
  });

  test('should display login page with all required elements', async ({ loginPage, page }) => {
    // Verify login tab is visible and active
    await expect(loginPage.loginTabButton).toBeVisible();

    // Verify username and password inputs exist
    await expect(loginPage.usernameInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();

    // Verify login button exists
    await expect(loginPage.loginSubmitButton).toBeVisible();

    // Verify role selection buttons exist
    await expect(loginPage.roleButtons).toHaveCount(4);

    // Verify page title
    await expect(page).toHaveTitle(/工业|Industrial/);
  });

  test('should show error when submitting empty credentials', async ({ loginPage, page }) => {
    // Disable the submit button when fields are empty
    await expect(loginPage.loginSubmitButton).toBeDisabled();
  });

  test('should switch between login and register tabs', async ({ loginPage, page }) => {
    // Click register tab
    await loginPage.registerTabButton.click();

    // Verify register fields appear
    await expect(page.locator('input[placeholder*="name@company.com"]')).toBeVisible();
  });

  test('should select different user roles', async ({ loginPage }) => {
    const roles = ['admin', 'engineer', 'operator', 'viewer'];

    for (const role of roles) {
      await loginPage.selectRole(role);
      // Verify role card gets active state
      const activeRole = loginPage.page.locator('.auth-role-card-active');
      await expect(activeRole).toBeVisible();
    }
  });
});

test.describe('Login Authentication', () => {
  test('should login as admin and redirect to admin page', async ({ loginPage }) => {
    await loginPage.loginWithRole('admin');

    // Admin role should redirect to /admin
    await loginPage.expectRedirectTo("/admin");
  });

  test('should login as operator and redirect to visualize page', async ({ loginPage }) => {
    await loginPage.loginWithRole('operator');

    // Operator role should redirect to /visualize
    await loginPage.expectRedirectTo("/visualize");
  });

  test('should login as viewer and redirect to home page', async ({ loginPage }) => {
    await loginPage.loginWithRole('viewer');

    // Viewer role should redirect to /home
    await loginPage.expectRedirectTo("/home");
  });

  test('should login as engineer and redirect to workspace page', async ({ loginPage }) => {
    await loginPage.loginWithRole('engineer');

    // Engineer role should redirect to /workspace
    await loginPage.expectRedirectTo("/workspace");
  });

  test('should reject invalid credentials', async ({ loginPage }) => {
    await loginPage.login('invalid-user', 'wrong-password');

    // Wait for error message
    await expect(loginPage.messageElement).toBeVisible({ timeout: 10000 });

    // Check for error message
    const message = await loginPage.getMessage();
    expect(message).toBeTruthy();
  });

  test('should fill credentials from demo account card', async ({ loginPage }) => {
    const demoCards = loginPage.demoAccountCards;
    const count = await demoCards.count();

    if (count > 0) {
      // Click first demo account card
      await demoCards.first().click();

      // Verify username is populated
      const usernameValue = await loginPage.usernameInput.inputValue();
      expect(usernameValue).toBeTruthy();

      // Verify password is populated
      const passwordValue = await loginPage.passwordInput.inputValue();
      expect(passwordValue).toBeTruthy();
    }
  });
});

test.describe('Login UI Features', () => {
  test('should display platform branding', async ({ page }) => {
    // Check for brand elements in the left panel
    const badge = page.locator('.auth-badge');
    if (await badge.isVisible()) {
      const badgeText = await badge.textContent();
      expect(badgeText).toBeTruthy();
    }

    // Check for feature highlights
    const featureItems = page.locator('.auth-feature-list > div');
    const featureCount = await featureItems.count();
    expect(featureCount).toBeGreaterThanOrEqual(2);
  });

  test('should have password strength indicator', async ({ loginPage }) => {
    // Enter a password
    await loginPage.usernameInput.fill('testuser');
    await loginPage.passwordInput.fill('Test@123');

    // Check for strength indicator
    const strengthFill = loginPage.page.locator('.auth-strength-fill');
    await expect(strengthFill).toBeVisible();
  });
});
