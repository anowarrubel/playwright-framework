/**
 * Per-site configuration. Add a new entry here when onboarding a new site.
 *
 * Each site declares its base URL per environment so the same test suite
 * can run against dev / qa / prod simply by switching TEST_ENV.
 */

import { TestEnv } from './env';
import { AnalyticsVendorId } from './analytics-vendors';
import { PerfBudget } from '../utils/perfHelper';

export type SiteId = 'demoqa' | 'academybugs' | 'saucedemo';

export interface AnalyticsConfig {
  /**
   * Vendors this site is expected to call on page load (see
   * config/analytics-vendors.ts). An empty list means "this site should load
   * NO analytics or tracking", and the suite asserts exactly that.
   */
  vendors: AnalyticsVendorId[];
  /** Data layer name when it isn't `dataLayer` (Adobe uses 'adobeDataLayer'). */
  dataLayerName?: string;
  /** Data layer `event` names that must show up after page load. */
  dataLayerEvents?: string[];
}

/** One API call to verify: what to request and what a good answer looks like. */
export interface ApiEndpoint {
  title: string;
  /** Path (and query) appended to the site's API base URL. */
  path: string;
  method?: 'GET' | 'POST';
  /** Expected HTTP status. Negative cases (400, 401, 404) are welcome here. */
  status: number;
  /**
   * Expected JSON shape. `arrayAt` is the property holding the list ('' when
   * the response itself is the list); every item must have all `itemKeys`.
   */
  list?: { arrayAt: string; itemKeys: string[]; minItems?: number };
  /** Keys that must exist at the top of an object response (error bodies, for example). */
  keys?: string[];
}

export interface ApiConfig {
  /** Appended to the site's base URL (so a <SITE>_<ENV>_URL override applies). */
  basePath?: string;
  /** Every endpoint must answer faster than this many ms. Default 3000. */
  maxResponseMs?: number;
  endpoints: ApiEndpoint[];
}

export interface VisualPage {
  /** Used in the snapshot file name, so keep it short and stable. */
  name: string;
  path: string;
  /** Selectors to blank out before comparing (dates, ads, anything that changes). */
  mask?: string[];
  viewport?: { width: number; height: number };
}

export interface SiteConfig {
  id: SiteId;
  displayName: string;
  /** Map of environment -> base URL for this site. */
  baseUrls: Record<TestEnv, string>;
  /** Optional default credentials, override via .env or CI secrets. */
  credentials?: {
    username?: string;
    password?: string;
  };
  /**
   * Accessibility findings we know about and are not gating on, as
   * rule id -> why. They are still listed in the run output; they just
   * don't fail the build. Delete an entry once the site fixes it.
   */
  a11yKnownIssues?: Record<string, string>;
  /** Same idea for security checks: check id (see utils/securityHelper.ts) -> why. */
  securityKnownIssues?: Record<string, string>;
  /** Same idea for SEO checks: check id (see utils/seoHelper.ts) -> why. */
  seoKnownIssues?: Record<string, string>;
  /** Omit to skip analytics tests for this site. */
  analytics?: AnalyticsConfig;
  /** Performance budget overrides; anything not set uses DEFAULT_BUDGET. */
  perfBudget?: Partial<PerfBudget>;
  /** Check id (see utils/perfHelper.ts) -> why we tolerate it. */
  perfKnownIssues?: Record<string, string>;
  /** Keyed '<viewport>:<check id>', e.g. 'mobile:no-horizontal-scroll'. See utils/responsiveHelper.ts. */
  responsiveKnownIssues?: Record<string, string>;
  /** Check id (see utils/i18nHelper.ts) -> why. */
  i18nKnownIssues?: Record<string, string>;
  /** Omit to skip API tests for this site. */
  api?: ApiConfig;
  /** Omit to skip visual-regression tests for this site. Pick stable pages only. */
  visual?: VisualPage[];
}

/**
 * The three sample sites are public demo apps with a single URL each, so
 * dev / qa / prod all point at the same host by default. For a real project,
 * set <SITE>_<ENV>_URL (e.g. SAUCEDEMO_QA_URL) in .env or CI instead of
 * editing this file - see getBaseUrl().
 */
export const sites: Record<SiteId, SiteConfig> = {
  demoqa: {
    id: 'demoqa',
    displayName: 'DemoQA',
    baseUrls: {
      dev: 'https://demoqa.com',
      qa: 'https://demoqa.com',
      prod: 'https://demoqa.com',
    },
    a11yKnownIssues: {
      'image-alt': 'One home page image has no alt text',
      'link-name': 'One home page link has no text or aria-label',
    },
    securityKnownIssues: {
      'strict-transport-security': 'No Strict-Transport-Security header on the HTTPS response',
      'x-content-type-options': 'X-Content-Type-Options header missing',
      'clickjacking-protection': 'No X-Frame-Options or frame-ancestors rule, so the page can be framed',
      'content-security-policy': 'No Content-Security-Policy header',
      'referrer-policy': 'No Referrer-Policy header; browsers fall back to their default',
      'info-disclosure': 'Exposes nginx version and X-Powered-By: Express',
    },
    seoKnownIssues: {
      title: 'Page title is just "demosite" (8 characters)',
      'meta-description': 'No <meta name="description"> on the home page',
      canonical: 'No <link rel="canonical"> in the head',
      'single-h1': 'Home page has no <h1>',
      'robots-txt': '/robots.txt returns the HTML app shell, not a robots file',
      sitemap: '/sitemap.xml returns the HTML app shell, not a sitemap',
    },
    responsiveKnownIssues: {
      'mobile:no-horizontal-scroll': 'Home page is 388px wide on a 375px phone screen (13px overflow)',
    },
    // Tag Manager announces itself with a 'gtm.js' event once it has loaded.
    analytics: { vendors: ['gtm', 'ua'], dataLayerEvents: ['gtm.js'] },
    // The BookStore API behind the site's "Book Store Application" section.
    api: {
      basePath: '/BookStore/v1',
      endpoints: [
        {
          title: 'GET /Books returns the book catalogue',
          path: '/Books',
          status: 200,
          list: { arrayAt: 'books', itemKeys: ['isbn', 'title', 'author', 'pages'], minItems: 1 },
        },
        {
          title: 'GET /Book with an unknown ISBN is rejected with an error body',
          path: '/Book?ISBN=not-a-real-isbn',
          status: 400,
          keys: ['code', 'message'],
        },
      ],
    },
  },
  academybugs: {
    id: 'academybugs',
    displayName: 'Academy Bugs',
    baseUrls: {
      dev: 'https://academybugs.com',
      qa: 'https://academybugs.com',
      prod: 'https://academybugs.com',
    },
    a11yKnownIssues: {
      'color-contrast': 'Two low-contrast text nodes on the home page',
      'link-name': 'One home page link has no text or aria-label',
    },
    securityKnownIssues: {
      'strict-transport-security': 'No Strict-Transport-Security header on the HTTPS response',
      'x-content-type-options': 'X-Content-Type-Options header missing',
      'clickjacking-protection': 'No X-Frame-Options or frame-ancestors rule, so the page can be framed',
      'content-security-policy': 'No Content-Security-Policy header',
      'referrer-policy': 'No Referrer-Policy header; browsers fall back to their default',
      'cookie-flags': 'aiovg_rand_seed cookie is set without Secure, HttpOnly or SameSite',
      'info-disclosure': 'Server header reveals the nginx version (it varies between requests)',
    },
    seoKnownIssues: {
      'meta-description': 'No <meta name="description"> on the home page',
      'single-h1': 'Home page has no <h1>',
    },
    analytics: { vendors: ['ga4'] },
    // The shared host answers in roughly 700ms, which sits right on the default
    // 800ms budget and would make the check flaky.
    perfBudget: { ttfb: 1200 },
    // WordPress ships a public REST API.
    api: {
      basePath: '/wp-json/wp/v2',
      endpoints: [
        {
          title: 'GET /posts returns a list of posts',
          path: '/posts?per_page=3',
          status: 200,
          list: { arrayAt: '', itemKeys: ['id', 'date', 'slug', 'title', 'content'], minItems: 1 },
        },
        {
          title: 'GET /posts/<unknown id> returns a 404 with an error body',
          path: '/posts/99999999',
          status: 404,
          keys: ['code', 'message'],
        },
      ],
    },
  },
  saucedemo: {
    id: 'saucedemo',
    displayName: 'Sauce Demo',
    baseUrls: {
      dev: 'https://www.saucedemo.com',
      qa: 'https://www.saucedemo.com',
      prod: 'https://www.saucedemo.com',
    },
    // Public demo credentials; real ones should come from .env / CI secrets.
    credentials: {
      username: process.env.SAUCE_USERNAME ?? 'standard_user',
      password: process.env.SAUCE_PASSWORD ?? 'secret_sauce',
    },
    securityKnownIssues: {
      'strict-transport-security': 'Hosted on GitHub Pages, which does not allow custom headers',
      'x-content-type-options': 'Hosted on GitHub Pages, which does not allow custom headers',
      'clickjacking-protection': 'Hosted on GitHub Pages, which does not allow custom headers',
      'content-security-policy': 'Hosted on GitHub Pages, which does not allow custom headers',
      'referrer-policy': 'Hosted on GitHub Pages, which does not allow custom headers',
    },
    seoKnownIssues: {
      title: 'Page title is just "Swag Labs" (9 characters)',
      'meta-description': 'Meta description is only 24 characters',
      canonical: 'Single-page demo app declares no canonical URL',
      'single-h1': 'Home page has no <h1>',
      indexable: 'Deliberately noindex: it is a practice app, not meant to be searchable',
      sitemap: 'Demo app publishes no sitemap',
    },
    // An empty vendor list asserts the site loads no analytics or tracking.
    analytics: { vendors: [] },
    // Static, stable pages only: a visual baseline is useless if the page changes by itself.
    visual: [
      { name: 'login', path: '/' },
      { name: 'login-mobile', path: '/', viewport: { width: 375, height: 812 } },
    ],
  },
};

export function getSite(id: SiteId): SiteConfig {
  const cfg = sites[id];
  if (!cfg) {
    throw new Error(
      `Unknown site "${id}". Available sites: ${Object.keys(sites).join(', ')}`,
    );
  }
  return cfg;
}

/**
 * Base URL for a site in a given environment. An env var named
 * <SITE>_<ENV>_URL (for example DEMOQA_DEV_URL) wins over the value in
 * config, so real hosts can be supplied without touching code.
 */
export function getBaseUrl(id: SiteId, env: TestEnv): string {
  const override = process.env[`${id}_${env}_URL`.toUpperCase()]?.trim();
  return override || getSite(id).baseUrls[env];
}

/** Returns the SITE env filter (or null to mean "run all"). */
export function getSiteFilter(): SiteId | null {
  const raw = process.env.SITE?.trim().toLowerCase();
  if (!raw) return null;
  if (!(raw in sites)) {
    throw new Error(
      `SITE="${raw}" is not registered. Add it to config/sites.ts or remove the variable.`,
    );
  }
  return raw as SiteId;
}
