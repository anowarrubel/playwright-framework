import { Page, expect } from '@playwright/test';
import { getCurrentEnv, TestEnv } from '../config/env';
import { getBaseUrl, getSite, SiteId, SiteConfig } from '../config/sites';

/**
 * Behaviour every page object shares: resolving the base URL for the active
 * site and environment, plus a few common navigation and assertion helpers.
 * Every page object extends this.
 */
export abstract class BasePage {
  protected readonly env: TestEnv;
  protected readonly site: SiteConfig;

  constructor(
    public readonly page: Page,
    siteId: SiteId,
  ) {
    this.env = getCurrentEnv();
    this.site = getSite(siteId);
  }

  /** Absolute URL for the current site + environment, optionally with a path appended. */
  protected url(path = ''): string {
    const base = getBaseUrl(this.site.id, this.env).replace(/\/$/, '');
    const suffix = path.startsWith('/') ? path : `/${path}`;
    return path ? `${base}${suffix}` : base;
  }

  /** Navigate to the given path on the current site. */
  async goto(path = ''): Promise<void> {
    await this.page.goto(this.url(path), { waitUntil: 'domcontentloaded' });
  }

  async expectTitleContains(fragment: string | RegExp): Promise<void> {
    await expect(this.page).toHaveTitle(
      typeof fragment === 'string' ? new RegExp(fragment, 'i') : fragment,
    );
  }

  async expectUrlMatches(pattern: RegExp): Promise<void> {
    await expect(this.page).toHaveURL(pattern);
  }
}
