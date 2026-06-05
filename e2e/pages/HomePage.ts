import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object for the Home Page
 */
export class HomePage extends BasePage {
  // Locators
  readonly heroTitle: Locator;
  readonly moduleCards: Locator;
  readonly quickJumpButtons: Locator;
  readonly roadmapSection: Locator;
  readonly workflowSteps: Locator;
  readonly valueCards: Locator;

  constructor(page: Page) {
    super(page);

    this.heroTitle = page.locator('h1').first();
    this.moduleCards = page.locator('.innovation-feature-card');
    this.quickJumpButtons = page.locator('.quick-jump-strip .enterprise-secondary-button');
    this.roadmapSection = page.locator('#home-roadmap');
    this.workflowSteps = page.locator('.workflow-steps, [class*="WorkflowSteps"]');
    this.valueCards = page.locator('.command-story-card, .command-metric-tile');
  }

  /** Navigate to home page */
  async goto(): Promise<void> {
    await super.goto('/home');
    await this.waitForPageLoad();
  }

  /** Click a module card by title */
  async navigateToModule(moduleTitle: string): Promise<void> {
    await this.moduleCards.filter({ hasText: moduleTitle }).locator('a').click();
  }

  /** Click a quick jump button */
  async quickJumpToSection(sectionLabel: string): Promise<void> {
    await this.quickJumpButtons.filter({ hasText: sectionLabel }).click();
  }

  /** Get all module card titles */
  async getModuleTitles(): Promise<string[]> {
    const cards = this.moduleCards;
    const count = await cards.count();
    const titles: string[] = [];
    for (let i = 0; i < count; i++) {
      const title = await cards.nth(i).locator('h3').textContent();
      if (title) titles.push(title);
    }
    return titles;
  }

  /** Assert home page is visible with key elements */
  async expectHomePageLoaded(): Promise<void> {
    await expect(this.heroTitle).toBeVisible();
    await expect(this.moduleCards.first()).toBeVisible();
    await expect(this.roadmapSection).toBeVisible();
  }

  /** Assert a specific module card is present */
  async expectModuleCard(title: string): Promise<void> {
    await expect(this.moduleCards.filter({ hasText: title }).first()).toBeVisible();
  }

  /** Assert roadmap is visible */
  async expectRoadmapVisible(): Promise<void> {
    await expect(this.roadmapSection).toBeVisible();
  }
}
