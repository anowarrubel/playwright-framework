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

  // SITE=<id> narrows the run to that site's tests. Every describe block is
  // tagged with its site id (e.g. '@saucedemo'), so no per-spec skip logic.
  grep: siteFilter ? new RegExp(`@${siteFilter}\\b`) : undefined,

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
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
