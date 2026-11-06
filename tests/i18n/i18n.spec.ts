import { test, expect } from '../../fixtures/test-fixtures';
import { getBaseUrl, sites, SiteId } from '../../config/sites';
import { getCurrentEnv } from '../../config/env';
import { expectFinding } from '../../utils/findings';
import { collectI18n, I18N_CHECKS, I18nSnapshot, PROBE_LOCALES } from '../../utils/i18nHelper';

/** Language declarations, UTF-8, hreflang, and loading under de/ja/ar locales. Known misses: `i18nKnownIssues`. */
const env = getCurrentEnv();

for (const siteId of Object.keys(sites) as SiteId[]) {
  const site = sites[siteId];
  const url = getBaseUrl(siteId, env);

  test.describe(`i18n :: ${site.displayName} (${env})`, { tag: `@${siteId}` }, () => {
    test.describe.configure({ mode: 'default' });

    let snapshot: I18nSnapshot;

    test.beforeAll(async ({ browser }) => {
      const context = await browser.newContext();
      try {
        const page = await context.newPage();
        const response = await page.goto(url, { waitUntil: 'load' });
        snapshot = await collectI18n(page, response);
      } finally {
        await context.close();
      }
    });

    for (const check of I18N_CHECKS) {
      test(check.title, async () => {
        const { passed, detail } = check.run(snapshot);
        await expectFinding(
          test.info(),
          { id: check.id, title: check.title, passed, detail },
          site.i18nKnownIssues,
        );
      });
    }

    for (const locale of PROBE_LOCALES) {
      test(`loads cleanly for a ${locale.code} visitor (${locale.note})`, async ({ browser }) => {
        const context = await browser.newContext({ locale: locale.code });
        try {
          const page = await context.newPage();
          const response = await page.goto(url, { waitUntil: 'load' });
          expect(response?.status(), 'HTTP status').toBeLessThan(400);
          await expect(page).toHaveTitle(/.+/);
        } finally {
          await context.close();
        }
      });
    }
  });
}
