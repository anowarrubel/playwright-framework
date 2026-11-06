import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../BasePage';

export class SauceLoginPage extends BasePage {
  readonly username: Locator;
  readonly password: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    super(page, 'saucedemo');
    this.username = page.locator('#user-name');
    this.password = page.locator('#password');
    this.loginButton = page.locator('#login-button');
    this.errorMessage = page.locator('[data-test="error"]');
  }

  async open(): Promise<void> {
    await this.goto('/');
  }

  async login(user?: string, pass?: string): Promise<void> {
    const u = user ?? this.site.credentials?.username ?? '';
    const p = pass ?? this.site.credentials?.password ?? '';
    await this.username.fill(u);
    await this.password.fill(p);
    await this.loginButton.click();
  }

  async expectLoginError(message: string | RegExp): Promise<void> {
    await expect(this.errorMessage).toContainText(message);
  }
}
