import { test, expect } from '../../fixtures/test-fixtures';
import { getBaseUrl, sites, SiteId } from '../../config/sites';
import { getCurrentEnv } from '../../config/env';

/**
 * Screenshot comparison for pages listed under a site's `visual`.
 * Baselines are per OS; refresh with `npm run t -- saucedemo visual --update`.
 */
const env = getCurrentEnv();

for (const siteId of Object.keys(sites) as SiteId[]) {
  const site = sites[siteId];
  if (!site.visual) continue;

  test.describe(`visual :: ${site.displayName} (${env})`, { tag: `@${siteId}` }, () => {
    for (const visual of site.visual ?? []) {
      test(`${visual.name} looks the same as the baseline`, async ({ page }) => {
        await page.setViewportSize(visual.viewport ?? { width: 1440, height: 900 });
        await page.goto(new URL(visual.path, getBaseUrl(siteId, env)).toString(), { waitUntil: 'load' });

        await expect(page).toHaveScreenshot(`${siteId}-${visual.name}.png`, {
          fullPage: true,
          animations: 'disabled',
          maxDiffPixelRatio: 0.02,
          mask: (visual.mask ?? []).map((selector) => page.locator(selector)),
        });
      });
    }
  });
}
