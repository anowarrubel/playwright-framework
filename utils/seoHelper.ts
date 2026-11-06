import { APIRequestContext, Page } from '@playwright/test';

/** Everything the SEO checks need, read once from the rendered page. */
export interface SeoSnapshot {
  url: string;
  title: string;
  description: string | null;
  canonical: string | null;
  lang: string | null;
  viewport: string | null;
  h1Count: number;
  robotsMeta: string | null;
  robotsTxtStatus: number;
  /** 200 and the body looks like a robots file, not an HTML fallback page. */
  robotsTxtValid: boolean;
  hasSitemap: boolean;
}

export interface SeoCheck {
  id: string;
  title: string;
  run: (snapshot: SeoSnapshot) => { passed: boolean; detail: string };
}

/**
 * Reads SEO signals from the page as the browser sees it (so it works for
 * client-rendered sites too), plus robots.txt and sitemap from the server.
 */
export async function collectSeoSnapshot(
  page: Page,
  request: APIRequestContext,
): Promise<SeoSnapshot> {
  const dom = await page.evaluate(() => {
    const meta = (name: string) =>
      document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)?.content ?? null;
    return {
      title: document.title,
      description: meta('description'),
      canonical: document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href ?? null,
      lang: document.documentElement.getAttribute('lang'),
      viewport: meta('viewport'),
      h1Count: document.querySelectorAll('h1').length,
      robotsMeta: meta('robots'),
    };
  });

  const origin = new URL(page.url()).origin;
  const robots = await request.get(`${origin}/robots.txt`, { failOnStatusCode: false });
  const robotsBody = robots.ok() ? await robots.text() : '';
  // Single-page apps often answer every path with their HTML shell and a 200.
  const robotsTxtValid = /^\s*(user-agent|disallow|allow|sitemap):/im.test(robotsBody);

  // robots.txt may point at the sitemap; otherwise try the usual spot.
  const declared = /^\s*sitemap:\s*(\S+)/im.exec(robotsBody)?.[1];
  const sitemap = await request.get(declared ?? `${origin}/sitemap.xml`, { failOnStatusCode: false });
  const hasSitemap = sitemap.ok() && /<(urlset|sitemapindex)\b/.test(await sitemap.text());

  return { url: page.url(), ...dom, robotsTxtStatus: robots.status(), robotsTxtValid, hasSitemap };
}

export const SEO_CHECKS: SeoCheck[] = [
  {
    id: 'title',
    title: 'Page has a title of 10-70 characters',
    run: (s) => ({
      passed: s.title.length >= 10 && s.title.length <= 70,
      detail: `"${s.title}" (${s.title.length} characters)`,
    }),
  },
  {
    id: 'meta-description',
    title: 'Page has a meta description of 50-160 characters',
    run: (s) => {
      const length = s.description?.length ?? 0;
      return {
        passed: length >= 50 && length <= 160,
        detail: s.description ? `${length} characters` : 'meta description missing',
      };
    },
  },
  {
    id: 'canonical',
    title: 'Page declares a canonical URL',
    run: (s) => ({ passed: Boolean(s.canonical), detail: s.canonical ?? 'canonical link missing' }),
  },
  {
    id: 'html-lang',
    title: '<html> has a lang attribute',
    run: (s) => ({ passed: Boolean(s.lang), detail: s.lang ?? 'lang attribute missing' }),
  },
  {
    id: 'viewport',
    title: 'Page has a viewport meta tag (mobile friendly)',
    run: (s) => ({ passed: Boolean(s.viewport), detail: s.viewport ?? 'viewport meta missing' }),
  },
  {
    id: 'single-h1',
    title: 'Page has exactly one <h1>',
    run: (s) => ({ passed: s.h1Count === 1, detail: `found ${s.h1Count}` }),
  },
  {
    id: 'indexable',
    title: 'Page is not blocked from indexing (no noindex)',
    run: (s) => ({
      passed: !/noindex/i.test(s.robotsMeta ?? ''),
      detail: s.robotsMeta ?? 'no robots meta tag',
    }),
  },
  {
    id: 'robots-txt',
    title: 'robots.txt is reachable',
    run: (s) => ({
      passed: s.robotsTxtValid,
      detail: `HTTP ${s.robotsTxtStatus}, ${s.robotsTxtValid ? 'valid robots file' : 'no robots directives in body'}`,
    }),
  },
  {
    id: 'sitemap',
    title: 'A sitemap is declared in robots.txt or served at /sitemap.xml',
    run: (s) => ({ passed: s.hasSitemap, detail: s.hasSitemap ? 'sitemap found' : 'no sitemap found' }),
  },
];
