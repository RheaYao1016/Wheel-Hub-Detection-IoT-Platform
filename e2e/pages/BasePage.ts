import { test as base, type Page, type Locator } from '@playwright/test';

/**
 * Base page providing common utilities shared across all page objects
 */
export class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /** Navigate to a path relative to baseURL */
  async goto(path: string): Promise<void> {
    await this.page.goto(path);
  }

  /** Wait for the page to be fully loaded */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  /** Get page URL */
  url(): string {
    return this.page.url();
  }

  /** Take a screenshot */
  async screenshot(name: string): Promise<void> {
    await this.page.screenshot({
      path: `e2e/test-results/screenshots/${name}.png`,
      fullPage: true,
    });
  }

  /** Wait for a specific element to be visible */
  async waitForVisible(selector: string, timeout?: number): Promise<Locator> {
    const locator = this.page.locator(selector);
    await locator.waitFor({ state: 'visible', timeout: timeout ?? 10000 });
    return locator;
  }

  /** Check if element is visible */
  async isVisible(selector: string): Promise<boolean> {
    return this.page.locator(selector).isVisible();
  }

  /** Get text content of an element */
  async getText(selector: string): Promise<string> {
    return this.page.locator(selector).textContent() as Promise<string>;
  }
}
