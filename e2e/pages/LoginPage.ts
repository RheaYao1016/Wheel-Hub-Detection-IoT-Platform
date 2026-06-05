import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export type UserRole = 'admin' | 'engineer' | 'operator' | 'viewer';

const ROLE_INDEX: Record<UserRole, number> = {
  admin: 0,
  engineer: 1,
  operator: 2,
  viewer: 3,
};

/**
 * Credentials for demo accounts used in E2E tests
 */
export const DEMO_ACCOUNTS: Record<UserRole, { username: string; password: string }> = {
  admin: { username: 'admin-demo', password: 'admin123' },
  engineer: { username: 'engineer-demo', password: 'engineer123' },
  operator: { username: 'operator-demo', password: 'user123' },
  viewer: { username: 'viewer-demo', password: 'viewer123' },
};

/**
 * Page Object for the Login Page
 */
export class LoginPage extends BasePage {
  // Locators
  readonly loginTabButton: Locator;
  readonly registerTabButton: Locator;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginSubmitButton: Locator;
  readonly roleButtons: Locator;
  readonly messageElement: Locator;
  readonly demoAccountCards: Locator;

  constructor(page: Page) {
    super(page);

    // Login page specific selectors based on the actual component structure
    this.loginTabButton = page.locator('.auth-tabs button').first();
    this.registerTabButton = page.locator('.auth-tabs button').nth(1);
    this.usernameInput = page.locator('input[autocomplete="username"]');
    this.passwordInput = page.locator('input[autocomplete="current-password"]');
    this.loginSubmitButton = page.locator('.auth-submit');
    this.roleButtons = page.locator('.auth-role-card');
    this.messageElement = page.locator('.auth-message');
    this.demoAccountCards = page.locator('.auth-demo-card');
  }

  /** Navigate to login page */
  async goto(): Promise<void> {
    await super.goto('/login');
    await this.waitForPageLoad();
  }

  /** Login with credentials */
  async login(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginSubmitButton.click();
  }

  /** Login with a demo account role */
  async loginWithRole(role: UserRole): Promise<void> {
    const account = DEMO_ACCOUNTS[role];
    await this.goto();
    const demoCard = this.demoAccountCards.filter({ hasText: account.username });
    if (await demoCard.count()) {
      await demoCard.first().click();
    } else {
      await this.roleButtons.nth(ROLE_INDEX[role]).click();
      await this.usernameInput.fill(account.username);
      await this.passwordInput.fill(account.password);
    }
    await this.loginSubmitButton.click();
  }

  /** Select a role (admin, engineer, operator, viewer) */
  async selectRole(roleName: string): Promise<void> {
    await this.page.getByRole('button', { name: roleName }).click();
  }

  /** Click on a demo account card */
  async clickDemoAccount(accountName: string): Promise<void> {
    await this.page.locator('.auth-demo-card').filter({ hasText: accountName }).click();
  }

  /** Get the displayed message */
  async getMessage(): Promise<string> {
    const message = await this.messageElement.textContent();
    return message ?? '';
  }

  /** Get the current role selected */
  async getSelectedRole(): Promise<string | null> {
    const activeRole = this.page.locator('.auth-role-card-active strong');
    return activeRole.textContent();
  }

  /** Assert login page is visible */
  async expectLoginPage(): Promise<void> {
    await expect(this.loginTabButton).toBeVisible();
    await expect(this.usernameInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.loginSubmitButton).toBeVisible();
  }

  /** Assert user has been redirected after login */
  async expectRedirectTo(expectedPath: string): Promise<void> {
    await this.page.waitForURL(new RegExp(expectedPath), { timeout: 15000 });
  }
}
