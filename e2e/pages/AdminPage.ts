import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object for the Admin Dashboard Page
 */
export class AdminPage extends BasePage {
  // Locators
  readonly pageTitle: Locator;
  readonly workflowSteps: Locator;
  readonly quickJumpButtons: Locator;
  readonly kpiCards: Locator;
  readonly governanceSection: Locator;
  readonly alertFeed: Locator;
  readonly resourceWatch: Locator;
  readonly syncButton: Locator;
  readonly dataImportButton: Locator;
  readonly alertCenterButton: Locator;

  constructor(page: Page) {
    super(page);

    this.pageTitle = page.locator('.admin-header h1');
    this.workflowSteps = page.locator('.workflow-steps, [class*="WorkflowSteps"]');
    this.quickJumpButtons = page.locator('.quick-jump-strip button');
    this.kpiCards = page.locator('.admin-kpi-card');
    this.governanceSection = page.locator('#admin-governance');
    this.alertFeed = page.locator('#admin-alert-feed');
    this.resourceWatch = page.locator('#admin-resource-watch');
    this.syncButton = page.locator('.admin-actions button.secondary');
    this.dataImportButton = page.locator('.admin-actions button').first();
    this.alertCenterButton = page.locator('.admin-actions button.danger');
  }

  /** Navigate to admin page */
  async goto(): Promise<void> {
    await super.goto('/admin');
    await this.waitForPageLoad();
  }

  /** Click sync platform button */
  async syncPlatform(): Promise<void> {
    await this.syncButton.click();
  }

  /** Navigate to data import */
  async navigateToDataImport(): Promise<void> {
    await this.dataImportButton.click();
  }

  /** Navigate to alert center */
  async navigateToAlertCenter(): Promise<void> {
    await this.alertCenterButton.click();
  }

  /** Get KPI card count */
  async getKPICardCount(): Promise<number> {
    return this.kpiCards.count();
  }

  /** Assert admin page is loaded */
  async expectPageLoaded(): Promise<void> {
    await expect(this.pageTitle).toBeVisible({ timeout: 15000 });
    await expect(this.workflowSteps).toBeVisible();
  }

  /** Assert governance section is visible */
  async expectGovernanceSectionVisible(): Promise<void> {
    await expect(this.governanceSection).toBeVisible({ timeout: 15000 });
  }

  /** Assert alert feed is visible */
  async expectAlertFeedVisible(): Promise<void> {
    await expect(this.alertFeed).toBeVisible({ timeout: 15000 });
  }

  /** Assert KPI cards are present */
  async expectKPICardsVisible(): Promise<void> {
    await expect(this.kpiCards.first()).toBeVisible({ timeout: 15000 });
  }
}
