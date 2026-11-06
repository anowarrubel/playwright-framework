import { test } from '../../fixtures/test-fixtures';
import { getBaseUrl, sites, SiteId } from '../../config/sites';
import { getCurrentEnv } from '../../config/env';
import { expectFinding } from '../../utils/findings';
import {
  DEFAULT_BUDGET,
  measureWebVitals,
  PERF_CHECKS,
  PerfBudget,
  WebVitals,
} from '../../utils/perfHelper';

/** Web Vitals against per-site budgets, median of three loads. Chromium only. Known misses: `perfKnownIssues`. */
const env = getCurrentEnv();

for (const siteId of Object.keys(sites) as SiteId[]) {
  const site = sites[siteId];
  const budget: PerfBudget = { ...DEFAULT_BUDGET, ...site.perfBudget };

  test.describe(`performance :: ${site.displayName} (${env})`, { tag: `@${siteId}` }, () => {
    test.describe.configure({ mode: 'default' });

    let vitals: WebVitals;

    test.beforeAll(async ({ browser }) => {
      test.setTimeout(120_000);
      vitals = await measureWebVitals(browser, getBaseUrl(siteId, env));
    });

    for (const check of PERF_CHECKS) {
      test(check.title, async () => {
        const { passed, detail } = check.run(vitals, budget);
        await expectFinding(
          test.info(),
          { id: check.id, title: check.title, passed, detail },
          site.perfKnownIssues,
        );
      });
    }
  });
}
