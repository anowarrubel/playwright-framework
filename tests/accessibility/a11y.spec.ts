import { test } from '../../fixtures/test-fixtures';
import { getBaseUrl, sites, SiteId } from '../../config/sites';
import { getCurrentEnv } from '../../config/env';

/**
 * Runs a WCAG 2.1 AA axe scan on the home page of every registered site.
 * Serious and critical violations fail the test; lesser findings and any
 * rule listed in a site's `a11yKnownIssues` are reported but don't fail it.
 *
 * The full axe report is attached to each test as axe-results.json.
 * Each describe block is tagged with its site id so SITE=<id> can filter it.
 */
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
