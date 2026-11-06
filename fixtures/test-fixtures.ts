import { test as base } from '@playwright/test';
import { DemoQaHomePage } from '../pages/demoqa/HomePage';
import { AcademyBugsHomePage } from '../pages/academybugs/HomePage';
import { SauceLoginPage } from '../pages/saucedemo/LoginPage';
import { SauceInventoryPage } from '../pages/saucedemo/InventoryPage';
import { checkA11y, A11yScanOptions } from '../utils/a11yHelper';
import { getCurrentEnv, TestEnv } from '../config/env';

/**
 * Custom Playwright fixtures.
 *
 * Each test gets fresh page-object instances, so nothing is shared between
 * tests, and the accessibility helper is wired in once as `a11y`.
 *
 * Import `test` and `expect` from here rather than from '@playwright/test':
 *   import { test, expect } from '../../fixtures/test-fixtures';
 */
type Pages = {
  demoqaHome: DemoQaHomePage;
  academybugsHome: AcademyBugsHomePage;
  sauceLogin: SauceLoginPage;
  sauceInventory: SauceInventoryPage;
};

type Helpers = {
  a11y: (options?: A11yScanOptions) => Promise<void>;
  env: TestEnv;
};

export const test = base.extend<Pages & Helpers>({
  demoqaHome: async ({ page }, use) => {
    await use(new DemoQaHomePage(page));
  },
  academybugsHome: async ({ page }, use) => {
    await use(new AcademyBugsHomePage(page));
  },
  sauceLogin: async ({ page }, use) => {
    await use(new SauceLoginPage(page));
  },
  sauceInventory: async ({ page }, use) => {
    await use(new SauceInventoryPage(page));
  },

  a11y: async ({ page }, use, testInfo) => {
    await use(async (options?: A11yScanOptions) => {
      await checkA11y(page, testInfo, options);
    });
  },

  // Playwright requires a destructured first argument, even when empty.
  // eslint-disable-next-line no-empty-pattern
  env: async ({}, use) => {
    await use(getCurrentEnv());
  },
});

export { expect } from '@playwright/test';
