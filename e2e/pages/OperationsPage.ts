import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object for the Operations Page
 */
export class OperationsPage extends BasePage {
  // Locators
  readonly heroTitle: Locator;
  readonly workflowSteps: Locator;
  readonly summaryCards: Locator;
  readonly monitoringCard: Locator;
  readonly digitalTwinCard: Locator;
  readonly governanceSection: Locator;
  readonly refreshButton: Locator;
  readonly quickJumpButtons: Locator;

  constructor(page: Page) {
    super(page);

    this.heroTitle = page.locator('#ops-hero h1');
    this.workflowSteps = page.locator('.workflow-steps, [class*="WorkflowSteps"]');
    this.summaryCards = page.locator('#ops-summary .operations-summary-card');
    this.monitoringCard = page.locator('#ops-domains .operations-card').first();
    this.digitalTwinCard = page.locator('#ops-domains .operations-card').nth(1);
    this.governanceSection = page.locator('#ops-governance');
    this.refreshButton = page.locator('.operations-refresh-button');
    this.quickJumpButtons = page.locator('#ops-hero ~ .quick-jump-strip button, .operations-shell .quick-jump-strip button');
  }

  /** Navigate to operations page */
  async goto(): Promise<void> {
    await super.goto('/operations');
    await this.waitForPageLoad();
  }

  /** Click the refresh button */
  async refresh(): Promise<void> {
    await this.refreshButton.click();
  }

  /** Get summary card values */
  async getSummaryCardCount(): Promise<number> {
    return this.summaryCards.count();
  }

  /** Navigate to monitoring details */
  async navigateToMonitoring(): Promise<void> {
    await this.monitoringCard.locator('a').click();
  }

  /** Navigate to digital twin details */
  async navigateToDigitalTwin(): Promise<void> {
    await this.digitalTwinCard.locator('a').click();
  }

  /** Assert operations page is loaded */
  async expectPageLoaded(): Promise<void> {
    await expect(this.heroTitle).toBeVisible({ timeout: 15000 });
    await expect(this.workflowSteps).toBeVisible();
  }

  /** Assert summary cards are visible */
  async expectSummaryCardsVisible(): Promise<void> {
    await expect(this.summaryCards.first()).toBeVisible({ timeout: 15000 });
  }

  /** Assert monitoring card is visible */
  async expectMonitoringCardVisible(): Promise<void> {
    await expect(this.monitoringCard).toBeVisible({ timeout: 15000 });
  }

  /** Assert governance section is visible */
  async expectGovernanceSectionVisible(): Promise<void> {
    await expect(this.governanceSection).toBeVisible({ timeout: 15000 });
  }
}
