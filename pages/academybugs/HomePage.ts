import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../BasePage';

export class AcademyBugsHomePage extends BasePage {
  readonly examplesHeading: Locator;
  readonly findBugsLink: Locator;

  constructor(page: Page) {
    super(page, 'academybugs');
    this.examplesHeading = page.getByRole('heading', { name: 'Examples of Bugs' });
    this.findBugsLink = page.getByRole('link', { name: 'Find Bugs', exact: true }).first();
  }

  async open(): Promise<void> {
    await this.goto('/');
    // First-time visitors get a guided tour whose full-page canvas swallows
    // every click; hide it so the tests exercise the actual page.
    await this.page.addStyleTag({
      content: '#TourTipDisabledArea, .TourTip, .TourTipCover { display: none !important; }',
    });
  }

  async expectLoaded(): Promise<void> {
    await expect(this.examplesHeading).toBeVisible();
    await expect(this.findBugsLink).toBeVisible();
  }

  async openFindBugs(): Promise<void> {
    await this.findBugsLink.click();
  }
}
