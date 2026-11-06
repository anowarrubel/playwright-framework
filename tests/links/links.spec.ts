import { test } from '../../fixtures/test-fixtures';
import { getBaseUrl, sites, SiteId } from '../../config/sites';
import { getCurrentEnv } from '../../config/env';
import { expectFindings } from '../../utils/findings';
import { MAX_LINKS, checkLinks, sameSiteLinks } from '../../utils/linkHelper';

const env = getCurrentEnv();

for (const siteId of Object.keys(sites) as SiteId[]) {
  const site = sites[siteId];

  test.describe(`links :: ${site.displayName} (${env})`, { tag: `@${siteId}` }, () => {
    test(`first ${MAX_LINKS} same-site links on the home page respond without an error`, async ({ page, request }, testInfo) => {
      await page.goto(getBaseUrl(siteId, env), { waitUntil: 'load' });
      const links = await sameSiteLinks(page);
      const known = site.linkKnownIssues ?? {};
      await expectFindings(testInfo, await checkLinks(request, links, known), known);
    });
  });
}
