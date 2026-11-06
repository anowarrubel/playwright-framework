import { test } from '../../fixtures/test-fixtures';
import { ANALYTICS_VENDORS } from '../../config/analytics-vendors';
import { getBaseUrl, sites, SiteId } from '../../config/sites';
import { getCurrentEnv } from '../../config/env';

/** Checks each site's analytics against its `analytics` block in config/sites.ts. */
const env = getCurrentEnv();

for (const siteId of Object.keys(sites) as SiteId[]) {
  const site = sites[siteId];
  const config = site.analytics;
  if (!config) continue;

  test.describe(`analytics :: ${site.displayName} (${env})`, { tag: `@${siteId}` }, () => {
    const url = getBaseUrl(siteId, env);

    if (config.vendors.length === 0) {
      test('loads no analytics or tracking requests', async ({ page, analytics }) => {
        // networkidle gives late trackers a chance to fire before we assert.
        // eslint-disable-next-line playwright/no-networkidle
        await page.goto(url, { waitUntil: 'networkidle' });
        await analytics.expectNoTracking();
      });

      return;
    }

    for (const vendorId of config.vendors) {
      test(`fires ${ANALYTICS_VENDORS[vendorId].label} on page load`, async ({ page, analytics }) => {
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        await analytics.expectVendor(vendorId);
      });
    }

    test('initialises the data layer', async ({ page, analytics }) => {
      analytics.useDataLayer(config.dataLayerName ?? 'dataLayer');
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await analytics.expectDataLayerNotEmpty();
    });

    for (const eventName of config.dataLayerEvents ?? []) {
      test(`data layer receives the "${eventName}" event`, async ({ page, analytics }) => {
        analytics.useDataLayer(config.dataLayerName ?? 'dataLayer');
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        await analytics.expectDataLayerEvent(eventName);
      });
    }
  });
}
