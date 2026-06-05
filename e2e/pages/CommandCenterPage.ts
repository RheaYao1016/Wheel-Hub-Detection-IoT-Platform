import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object for the Command Center (Visualize) Page
 */
export class CommandCenterPage extends BasePage {
  // Locators
  readonly pageTitle: Locator;
  readonly workflowSteps: Locator;
  readonly qualityChart: Locator;
  readonly throughputChart: Locator;
  readonly liveQueue: Locator;
  readonly executionLog: Locator;
  readonly quickJumpButtons: Locator;
  readonly backButton: Locator;

  constructor(page: Page) {
    super(page);

    this.pageTitle = page.locator('#cmd-hero h1');
    this.workflowSteps = page.locator('.workflow-steps, [class*="WorkflowSteps"]');
    this.qualityChart = page.locator('#cmd-quality');
    this.throughputChart = page.locator('#cmd-throughput');
    this.liveQueue = page.locator('#cmd-queue');
    this.executionLog = page.locator('#cmd-log');
    this.quickJumpButtons = page.locator('.quick-jump-strip button');
    this.backButton = page.locator('.back-button, [class*="BackButton"]').first();
  }

  /** Navigate to command center page */
  async goto(): Promise<void> {
    await super.goto('/visualize');
    await this.waitForPageLoad();
  }

  /** Click a quick jump button */
  async quickJumpToSection(sectionLabel: string): Promise<void> {
    await this.quickJumpButtons.filter({ hasText: sectionLabel }).click();
  }

  /** Get the page title text */
  async getTitle(): Promise<string | null> {
    return this.pageTitle.textContent();
  }

  /** Assert command center page is loaded */
  async expectPageLoaded(): Promise<void> {
    await expect(this.pageTitle).toBeVisible({ timeout: 15000 });
    await expect(this.workflowSteps).toBeVisible();
  }

  /** Assert quality chart section is visible */
  async expectQualityChartVisible(): Promise<void> {
    await expect(this.qualityChart).toBeVisible({ timeout: 15000 });
  }

  /** Assert throughput chart section is visible */
  async expectThroughputChartVisible(): Promise<void> {
    await expect(this.throughputChart).toBeVisible({ timeout: 15000 });
  }

  /** Assert execution log section is visible */
  async expectExecutionLogVisible(): Promise<void> {
    await expect(this.executionLog).toBeVisible({ timeout: 15000 });
  }

  /** Assert quick jump navigation exists */
  async expectQuickJumpNavVisible(): Promise<void> {
    await expect(this.quickJumpButtons.first()).toBeVisible();
  }
}
