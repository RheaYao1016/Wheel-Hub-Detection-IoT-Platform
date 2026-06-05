import { type Page } from '@playwright/test';
import { LoginPage, type UserRole } from './LoginPage';
import { HomePage } from './HomePage';
import { CommandCenterPage } from './CommandCenterPage';
import { OperationsPage } from './OperationsPage';
import { AdminPage } from './AdminPage';

/**
 * Fixture that provides all page objects for E2E tests
 */
export const testPages = {
  LoginPage,
  HomePage,
  CommandCenterPage,
  OperationsPage,
  AdminPage,
};

/**
 * Helper to perform login and return the appropriate page object
 */
export async function loginAndGetPage<T>(
  page: Page,
  role: UserRole,
  PageClass: new (page: Page) => T
): Promise<T> {
  const loginPage = new LoginPage(page);
  await loginPage.loginWithRole(role);

  // Wait for redirect after login
  const targetPage = new PageClass(page);
  await page.waitForLoadState('networkidle');
  return targetPage;
}

/**
 * Helper: Navigate to root and follow redirect
 * The root page (/) redirects to /home
 */
export async function navigateToRoot(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
}
