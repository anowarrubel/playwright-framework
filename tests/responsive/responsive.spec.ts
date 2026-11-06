import { test } from '../../fixtures/test-fixtures';
import { getBaseUrl, sites, SiteId } from '../../config/sites';
import { getCurrentEnv } from '../../config/env';
import { expectFinding } from '../../utils/findings';
import { collectLayout, LAYOUT_CHECKS, LayoutSnapshot, VIEWPORTS } from '../../utils/responsiveHelper';

/** Layout checks at phone and tablet width. Known misses: `responsiveKnownIssues`, keyed `<viewport>:<check>`. */
const env = getCurrentEnv();

for (const siteId of Object.keys(sites) as SiteId[]) {
  const site = sites[siteId];

  for (const viewport of VIEWPORTS) {
    test.describe(
      `responsive :: ${site.displayName} :: ${viewport.name} ${viewport.width}x${viewport.height} (${env})`,
      { tag: `@${siteId}` },
      () => {
        test.describe.configure({ mode: 'default' });

        let layout: LayoutSnapshot;

        test.beforeAll(async ({ browser }) => {
          const context = await browser.newContext({
            viewport: { width: viewport.width, height: viewport.height },
            isMobile: true,
            hasTouch: true,
          });
          try {
            const page = await context.newPage();
            await page.goto(getBaseUrl(siteId, env), { waitUntil: 'load' });
            layout = await collectLayout(page);
          } finally {
            await context.close();
          }
        });

        for (const check of LAYOUT_CHECKS) {
          test(check.title, async () => {
            const { passed, detail } = check.run(layout);
            await expectFinding(
              test.info(),
              { id: `${viewport.name}:${check.id}`, title: check.title, passed, detail },
              site.responsiveKnownIssues,
            );
          });
        }
      },
    );
  }
}
