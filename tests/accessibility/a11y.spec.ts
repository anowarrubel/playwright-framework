import { test } from '../../fixtures/test-fixtures';
import { getBaseUrl, sites, SiteId } from '../../config/sites';
import { getCurrentEnv } from '../../config/env';

/** axe-core WCAG 2.1 AA scan of each home page; serious and critical violations fail. */
const env = getCurrentEnv();

for (const siteId of Object.keys(sites) as SiteId[]) {
  const site = sites[siteId];

  test.describe(`a11y :: ${site.displayName} (${env})`, { tag: `@${siteId}` }, () => {
    test('home page has no serious or critical WCAG 2.1 AA violations', async ({ page, a11y }) => {
      await page.goto(getBaseUrl(siteId, env), { waitUntil: 'domcontentloaded' });
      await a11y({
        wcagLevel: 'AA',
        knownIssues: Object.keys(site.a11yKnownIssues ?? {}),
      });
    });
  });
}
