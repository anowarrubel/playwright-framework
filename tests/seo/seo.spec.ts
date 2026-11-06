import { test } from '../../fixtures/test-fixtures';
import { getBaseUrl, sites, SiteId } from '../../config/sites';
import { getCurrentEnv } from '../../config/env';
import { expectFinding } from '../../utils/findings';
import { collectSeoSnapshot, SeoSnapshot, SEO_CHECKS } from '../../utils/seoHelper';

/** On-page SEO checks (title, description, canonical, h1, robots, sitemap). Known misses: `seoKnownIssues`. */
const env = getCurrentEnv();

for (const siteId of Object.keys(sites) as SiteId[]) {
  const site = sites[siteId];

  test.describe(`seo :: ${site.displayName} (${env})`, { tag: `@${siteId}` }, () => {
    // Not serial mode, which would skip the remaining checks after one failure.
    test.describe.configure({ mode: 'default' });

    let snapshot: SeoSnapshot;

    test.beforeAll(async ({ browser }) => {
      const context = await browser.newContext();
      try {
        const page = await context.newPage();
        await page.goto(getBaseUrl(siteId, env), { waitUntil: 'load' });
        snapshot = await collectSeoSnapshot(page, page.request);
      } finally {
        await context.close();
      }
    });

    for (const check of SEO_CHECKS) {
      test(check.title, async () => {
        const { passed, detail } = check.run(snapshot);
        await expectFinding(
          test.info(),
          { id: check.id, title: check.title, passed, detail },
          site.seoKnownIssues,
        );
      });
    }
  });
}
