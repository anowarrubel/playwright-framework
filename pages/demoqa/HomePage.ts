import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../BasePage';

export class DemoQaHomePage extends BasePage {
  readonly heading: Locator;
  readonly elementsCard: Locator;
  readonly formsCard: Locator;
  readonly categoryCards: Locator;

  constructor(page: Page) {
    super(page, 'demoqa');
    this.heading = page.locator('header img[src*="Toolsqa"]');
    this.elementsCard = page.locator('.card', { hasText: 'Elements' });
    this.formsCard = page.locator('.card', { hasText: 'Forms' });
    this.categoryCards = page.locator('.category-cards .card');
  }

  async open(): Promise<void> {
    await this.goto('/');
  }

  async expectLoaded(): Promise<void> {
    await expect(this.heading).toBeVisible();
  }

  async expectCategoryCount(count: number): Promise<void> {
    await expect(this.categoryCards).toHaveCount(count);
  }

  async openElements(): Promise<void> {
    await this.elementsCard.click();
  }

  async openForms(): Promise<void> {
    await this.formsCard.click();
  }
}
