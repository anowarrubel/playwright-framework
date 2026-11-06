import { APIRequestContext, Page } from '@playwright/test';
import { Finding, KnownIssues } from './findings';

export const MAX_LINKS = 30;

/** Same-site links on the loaded page (hash stripped, duplicates dropped, capped). */
export async function sameSiteLinks(page: Page): Promise<string[]> {
  const origin = new URL(page.url()).origin;
  const hrefs = await page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]')).map((a) => a.href.split('#')[0]),
  );
  return hrefs.filter((h, i) => h.startsWith(origin) && hrefs.indexOf(h) === i).slice(0, MAX_LINKS);
}

/** One finding per broken link, one per known issue that is fixed, plus whether any links were found at all. */
export async function checkLinks(
  request: APIRequestContext,
  links: string[],
  known: KnownIssues,
): Promise<Finding[]> {
  const findings: Finding[] = [];
  for (const href of links) {
    const res = await request.get(href, { failOnStatusCode: false, timeout: 30_000 });
    if (res.status() >= 400) {
      findings.push({
        id: `broken-link:${new URL(href).pathname}`,
        title: 'Same-site link resolves',
        passed: false,
        detail: `HTTP ${res.status()}`,
      });
    }
  }
  const broken = new Set(findings.map((f) => f.id));
  for (const id of Object.keys(known).filter((k) => k !== 'links-found' && !broken.has(k))) {
    findings.push({ id, title: 'Same-site link resolves', passed: true, detail: 'now resolves' });
  }
  findings.push({
    id: 'links-found',
    title: 'Home page has same-site links to check',
    passed: links.length > 0,
    detail: `${links.length} found`,
  });
  return findings;
}
