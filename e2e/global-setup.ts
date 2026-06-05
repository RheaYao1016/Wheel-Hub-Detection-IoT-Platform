/**
 * Global Test Setup
 * Shared utilities and configuration for all E2E tests
 */
import { test as base, expect } from '@playwright/test';

/**
 * Extend the base test with common helper methods
 */
export const test = base.extend<{
  /** Helper to wait for animations to complete */
  waitForAnimations: () => Promise<void>;
}>({
  waitForAnimations: async ({ page }, use) => {
    await use(async () => {
      // Wait for any running animations to complete
      await page.waitForTimeout(500);
    });
  },
});

export { expect };
