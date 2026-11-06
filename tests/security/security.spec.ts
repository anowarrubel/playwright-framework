import { test } from '../../fixtures/test-fixtures';
import { getBaseUrl, sites, SiteId } from '../../config/sites';
import { getCurrentEnv } from '../../config/env';
import { expectFinding } from '../../utils/findings';
import { gatherSecurityContext, SecurityContext, SECURITY_CHECKS } from '../../utils/securityHelper';

/** Security header, cookie and TLS checks on each site's home page. Known misses: `securityKnownIssues`. */
const env = getCurrentEnv();

for (const siteId of Object.keys(sites) as SiteId[]) {
  const site = sites[siteId];

  test.describe(`security :: ${site.displayName} (${env})`, { tag: `@${siteId}` }, () => {
    // Not serial mode, which would skip the remaining checks after one failure.
    test.describe.configure({ mode: 'default' });

    let context: SecurityContext;

    test.beforeAll(async ({ playwright }) => {
      const request = await playwright.request.newContext();
      try {
        context = await gatherSecurityContext(request, getBaseUrl(siteId, env));
      } finally {
        await request.dispose();
      }
    });

    for (const check of SECURITY_CHECKS) {
      test(check.title, async () => {
        const { passed, detail } = check.run(context);
        await expectFinding(
          test.info(),
          { id: check.id, title: check.title, passed, detail },
          site.securityKnownIssues,
        );
      });
    }
  });
}
