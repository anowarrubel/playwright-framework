import { defineConfig, devices, ReporterDescription } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env BEFORE we read any framework config that depends on it.
dotenv.config({ path: path.resolve(__dirname, '.env') });

import { getCurrentEnv } from './config/env';
import { getSiteFilter } from './config/sites';

const TEST_ENV = getCurrentEnv();
const siteFilter = getSiteFilter();
const isCI = !!process.env.CI;

// These suites run on chromium only.
const CHROMIUM_ONLY = ['**/security/**', '**/api/**', '**/performance/**', '**/visual/**', '**/config/**'];

// Visual baselines are per OS, so CI only runs them when RUN_VISUAL=1.
const ciSkips = isCI && !process.env.RUN_VISUAL ? ['**/visual/**'] : [];

const reporter: ReporterDescription[] = [
  ['list'],
  ['html', { open: 'never', outputFolder: 'playwright-report' }],
];
if (isCI) reporter.push(['github']);

export default defineConfig({
  testDir: './tests',
  outputDir: 'test-results',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : undefined,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter,

  // SITE=<id>[,<id>] runs only those sites' tests; describe blocks are tagged '@<id>'.
  grep: siteFilter.length ? new RegExp(`@(${siteFilter.join('|')})\\b`) : undefined,

  use: {
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: true,
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: TEST_ENV !== 'prod', // Be strict in prod, lenient in lower envs.
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: ciSkips,
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      // Responsive runs on the Chrome and Safari engines only.
      testIgnore: [...CHROMIUM_ONLY, '**/responsive/**'],
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testIgnore: CHROMIUM_ONLY,
    },
  ],
});
