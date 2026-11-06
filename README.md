# Playwright Multi-Site Test Framework

[![Playwright Tests](https://github.com/anowarrubel/playwright-framework/actions/workflows/playwright.yml/badge.svg)](https://github.com/anowarrubel/playwright-framework/actions/workflows/playwright.yml)

Playwright + TypeScript suite that runs the same checks against several sites
and environments. Functional, accessibility, security, SEO, analytics,
performance, responsive, API, visual, i18n and broken-link checks run against three public
demo sites (DemoQA, Academy Bugs, Sauce Demo), and GitHub Actions can run any
combination on demand.

## Setup

Needs Node 20+ and npm.

```bash
npm install
npm run install:browsers
cp .env.example .env
npm run typecheck && npm run lint
```

## Running tests

`npm run t` is the launcher. Name the pieces in any order, separated by spaces
or colons; whatever you leave out falls back to a default (env from `.env`,
else `qa`; browser chromium; site and suite all).

```bash
npm run t -- demoqa prod seo              # chromium, headless
npm run t -- demoqa:prod:seo:firefox
npm run t -- saucedemo a11y --headed
npm run t -- --suite=security,seo --env=prod --browser=all
npm run t                                 # menu (terminal only, never in CI)
```

Suites: `functional`, `accessibility` (`a11y`), `security`, `seo`, `analytics`,
`performance` (`perf`), `responsive`, `api`, `visual`, `i18n`, `links`, `config`.
Flags: `--suite --site --env --browser`, `--headed --ui --debug`, `--update`
(visual baselines), `--yes` (skip the menu). Anything after a second `--` goes
straight to Playwright.

The plain scripts still work, for example `npm test`, `npm run test:seo`, or
`TEST_ENV=prod SITE=saucedemo npm test`. `TEST_ENV` and `SITE` can also live in
`.env`.

To point a site at real hosts, set `<SITE>_<ENV>_URL` (for example
`DEMOQA_QA_URL`) in `.env` or CI. It overrides `config/sites.ts` for every
suite, API included.

## What each suite checks

| Suite | Checks | Browsers |
|---|---|---|
| Functional | login, cart and navigation flows through page objects | all |
| Accessibility | axe-core WCAG 2.1 AA; serious and critical violations fail | all |
| Security | https redirect, HSTS, nosniff, clickjacking, CSP, Referrer-Policy, version leaks, cookie flags, TLS expiry | chromium |
| SEO | title, description, canonical, lang, viewport, one h1, noindex, robots.txt, sitemap | all |
| Analytics | expected vendors fire, data layer exists and gets its events, no-tracking sites load none | all |
| Performance | TTFB, FCP, LCP, CLS, request count against budgets (median of 3 loads) | chromium |
| Responsive | at 375px and 768px: viewport meta, no sideways scroll, media fits, readable text | chromium, webkit |
| API | status, JSON, response time and shape for each listed endpoint | chromium |
| Visual | screenshot of each listed page against a baseline (0.2% pixel tolerance) | chromium |
| i18n | valid lang, UTF-8, hreflang, no garbled text, loads under de/ja/ar locales | all |
| Links | first 30 same-site links on the home page answer without a 4xx or 5xx | chromium |
| Config | every known-issue key names a real check and has a reason | chromium |

Everything is driven from `config/sites.ts`: each site can define `analytics`,
`api`, `visual`, `perfBudget` and the known-issue lists below.

### Known issues

Each check family has a per-site list (`a11yKnownIssues`, `securityKnownIssues`,
`seoKnownIssues`, `perfKnownIssues`, `responsiveKnownIssues`,
`i18nKnownIssues`, `linkKnownIssues`) mapping a check id to a one-line reason. A listed check that
fails does not fail the build; it shows as a `known-issue` annotation in the
report. If it starts passing the report says `known-issue-fixed`, and the entry
can be deleted. A failing check that isn't listed fails the build.

### Analytics and data layers

`tests/analytics/datalayer-push.spec.ts` shows how to verify a push caused by a
click, for Google (`window.dataLayer`) and Adobe (`window.adobeDataLayer`),
against a local page:

```ts
await page.getByRole('button', { name: 'Add to cart' }).click();
await analytics.expectDataLayerEvent('add_to_cart');
// or match an entry exactly, nested objects included:
await analytics.expectDataLayerEntry({ event: 'promo:click', eventInfo: { path: 'page.promo' } });
```

For an Adobe site use `analytics: { vendors: ['adobe'], dataLayerName: 'adobeDataLayer' }`.
Vendor detection lives in `config/analytics-vendors.ts`.

### Visual baselines

Create or refresh them, look at the images, then commit:

```bash
npm run t -- saucedemo visual --update
```

Baselines are named per OS (`...-chromium-darwin.png`), so CI needs its own.
Run the workflow with suite `visual` and `update_snapshots` ticked, download the
`visual-baselines-*` artifact and commit it. Until then CI skips visual tests on
automatic runs.

### Reports

`playwright-report/` (open with `npm run report`) has the HTML report. Security,
SEO, performance and similar checks attach their findings as JSON, and axe
attaches its full results. Traces, screenshots and video are kept for failures.

## Project layout

```
config/       env.ts, sites.ts, analytics-vendors.ts
pages/        page objects (BasePage plus one folder per site)
fixtures/     custom fixtures (page objects, a11y, analytics)
utils/        helpers behind each suite (axe, security, seo, perf, ...)
tests/        functional, accessibility, security, seo, analytics,
              performance, responsive, api, visual, i18n
scripts/      run.mjs (the `npm run t` launcher), summary.mjs (CI findings table)
```

## Adding a site

1. Add the id to `SiteId` and an entry to `sites` in `config/sites.ts` with its
   `dev` / `qa` / `prod` URLs.
2. Add page objects under `pages/<site>/` and a spec in
   `tests/functional/<site>.spec.ts`, with `{ tag: '@<site>' }` on the describe
   block.
3. Run it: `npm run t -- <site>`.

Accessibility, security, SEO, performance, responsive and i18n pick the site up
automatically. Add `analytics`, `api` or `visual` blocks to include it in those
suites. Expect some checks to fail on a first run; record each one as a known
issue with a reason, or fix the site.

## Adding an environment

Add the value to `TestEnv` in `config/env.ts` and `VALID_ENVS`, a matching key
to every site's `baseUrls`, and the workflow's `environment` options. The
launcher reads the list from `TestEnv`.

## GitHub Actions

`.github/workflows/playwright.yml` runs on pull requests and pushes to main
(against `qa`), nightly at 02:00 UTC, and on demand with environment, site and
suite dropdowns. Each run type-checks, lints, then runs a matrix of chromium,
firefox and webkit, and uploads the HTML report as `playwright-report-<browser>-<env>`.
Suites that are chromium-only simply have nothing to run in the other jobs.

CI runs inside the official Playwright container image (`mcr.microsoft.com/playwright`),
so browsers and system packages are already there. When `@playwright/test` is upgraded
in `package-lock.json`, update the image tag and `IMAGE_PLAYWRIGHT_VERSION` in the
workflow to match; a check step fails with a clear message if they drift.

Optional secrets: `SAUCE_USERNAME` and `SAUCE_PASSWORD` (the public demo values
are the default).

## Debugging

```bash
npm run t -- demoqa seo --ui        # interactive runner
npm run t -- demoqa seo --debug     # step through in the inspector
npx playwright show-trace test-results/<folder>/trace.zip
```
