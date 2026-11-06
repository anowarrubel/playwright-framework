import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../BasePage';

export class SauceInventoryPage extends BasePage {
  readonly title: Locator;
  readonly inventoryItems: Locator;
  readonly cartLink: Locator;
  readonly cartBadge: Locator;

  constructor(page: Page) {
    super(page, 'saucedemo');
    this.title = page.locator('.title');
    this.inventoryItems = page.locator('.inventory_item');
    this.cartLink = page.locator('.shopping_cart_link');
    this.cartBadge = page.locator('.shopping_cart_badge');
  }

  async expectLoaded(): Promise<void> {
    await expect(this.title).toHaveText('Products');
  }

  async addFirstItemToCart(): Promise<void> {
    await this.inventoryItems.first().getByRole('button', { name: /add to cart/i }).click();
  }

  async expectCartCount(count: number): Promise<void> {
    await expect(this.cartBadge).toHaveText(String(count));
  }

  async openCart(): Promise<void> {
    await this.cartLink.click();
  }
}
