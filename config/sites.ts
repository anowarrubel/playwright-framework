/**
 * Per-site configuration. Add a new entry here when onboarding a new site.
 *
 * Each site declares its base URL per environment so the same test suite
 * can run against dev / qa / prod simply by switching TEST_ENV.
 */

import { TestEnv } from './env';

export type SiteId = 'demoqa' | 'academybugs' | 'saucedemo';

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
      'image-alt': 'Home page image without alt text (1 node) - third-party demo site, not ours to fix',
      'link-name': 'Home page link with no discernible text (1 node) - third-party demo site',
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
      'color-contrast': 'Two low-contrast text nodes on the home page - third-party demo site',
      'link-name': 'Home page link with no discernible text (1 node) - third-party demo site',
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
