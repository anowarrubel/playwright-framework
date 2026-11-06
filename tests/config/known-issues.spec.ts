import { test, expect } from '@playwright/test';
import { sites, SiteId } from '../../config/sites';
import { I18N_CHECKS } from '../../utils/i18nHelper';
import { LAYOUT_CHECKS, VIEWPORTS } from '../../utils/responsiveHelper';
import { PERF_CHECKS } from '../../utils/perfHelper';
import { SECURITY_CHECKS } from '../../utils/securityHelper';
import { SEO_CHECKS } from '../../utils/seoHelper';

const ids = (checks: { id: string }[]) => checks.map((c) => c.id);
const responsiveIds = VIEWPORTS.flatMap((v) => LAYOUT_CHECKS.map((c) => `${v.name}:${c.id}`));

// A misspelt key would silently do nothing, so check each list against the
// checks it is meant to match.
for (const siteId of Object.keys(sites) as SiteId[]) {
  const site = sites[siteId];
  const lists: [string, Record<string, string> | undefined, string[]][] = [
    ['securityKnownIssues', site.securityKnownIssues, ids(SECURITY_CHECKS)],
    ['seoKnownIssues', site.seoKnownIssues, ids(SEO_CHECKS)],
    ['perfKnownIssues', site.perfKnownIssues, ids(PERF_CHECKS)],
    ['i18nKnownIssues', site.i18nKnownIssues, ids(I18N_CHECKS)],
    ['responsiveKnownIssues', site.responsiveKnownIssues, responsiveIds],
  ];

  test.describe(`config :: ${site.displayName}`, { tag: `@${siteId}` }, () => {
    for (const [name, list, valid] of lists) {
      test(`${name} only names real checks and gives a reason`, () => {
        for (const [id, reason] of Object.entries(list ?? {})) {
          expect(valid, `"${id}" is not a known check id`).toContain(id);
          expect(reason.trim(), `reason for "${id}"`).not.toBe('');
        }
      });
    }
  });
}
