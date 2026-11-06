import { test, expect } from '@playwright/test';
import { sites, SiteId } from '../../config/sites';
import { I18N_CHECKS } from '../../utils/i18nHelper';
import { LAYOUT_CHECKS, VIEWPORTS } from '../../utils/responsiveHelper';
import { PERF_CHECKS } from '../../utils/perfHelper';
import { SECURITY_CHECKS } from '../../utils/securityHelper';
import { SEO_CHECKS } from '../../utils/seoHelper';

const oneOf = (checks: { id: string }[]) => (id: string) => checks.some((c) => c.id === id);
const responsiveIds = VIEWPORTS.flatMap((v) => LAYOUT_CHECKS.map((c) => `${v.name}:${c.id}`));
const isLinkKey = (id: string) => id === 'links-found' || id.startsWith('broken-link:');

// A misspelt key would silently do nothing, so check each list against the
// checks it is meant to match.
for (const siteId of Object.keys(sites) as SiteId[]) {
  const site = sites[siteId];
  const lists: [string, Record<string, string> | undefined, (id: string) => boolean][] = [
    ['securityKnownIssues', site.securityKnownIssues, oneOf(SECURITY_CHECKS)],
    ['seoKnownIssues', site.seoKnownIssues, oneOf(SEO_CHECKS)],
    ['perfKnownIssues', site.perfKnownIssues, oneOf(PERF_CHECKS)],
    ['i18nKnownIssues', site.i18nKnownIssues, oneOf(I18N_CHECKS)],
    ['responsiveKnownIssues', site.responsiveKnownIssues, (id) => responsiveIds.includes(id)],
    ['linkKnownIssues', site.linkKnownIssues, isLinkKey],
  ];

  test.describe(`config :: ${site.displayName}`, { tag: `@${siteId}` }, () => {
    for (const [name, list, isValid] of lists) {
      test(`${name} only names real checks and gives a reason`, () => {
        for (const [id, reason] of Object.entries(list ?? {})) {
          expect(isValid(id), `"${id}" is not a known check id`).toBe(true);
          expect(reason.trim(), `reason for "${id}"`).not.toBe('');
        }
      });
    }
  });
}
