import { test as base } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { HomePage } from './pages/HomePage';
import { CommandCenterPage } from './pages/CommandCenterPage';
import { OperationsPage } from './pages/OperationsPage';
import { AdminPage } from './pages/AdminPage';

/**
 * Test fixtures providing pre-initialized page objects
 */
export const test = base.extend<{
  loginPage: LoginPage;
  homePage: HomePage;
  commandCenterPage: CommandCenterPage;
  operationsPage: OperationsPage;
  adminPage: AdminPage;
}>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },
  commandCenterPage: async ({ page }, use) => {
    await use(new CommandCenterPage(page));
  },
  operationsPage: async ({ page }, use) => {
    await use(new OperationsPage(page));
  },
  adminPage: async ({ page }, use) => {
    await use(new AdminPage(page));
  },
});

export { expect } from '@playwright/test';
