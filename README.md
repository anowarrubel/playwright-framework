# Playwright Multi-Site Test Framework

A TypeScript Playwright framework that:

- targets **multiple sites** (DemoQA, Academy Bugs, SauceDemo) from one suite
- runs the same tests against **dev / qa / prod**
- includes **accessibility scans** (axe-core, WCAG 2.1 AA)
- runs in **GitHub Actions** with environment + site selection from the UI

This guide is written for a junior QA. Read it top to bottom the first time.

---

## 1. What you'll find here

```
playwright-framework/
├── .github/workflows/playwright.yml   GitHub Actions CI pipeline
├── config/
│   ├── env.ts                         Resolves dev / qa / prod
│   └── sites.ts                       Per-site URLs, credentials, known a11y issues
├── pages/
│   ├── BasePage.ts                    Shared page-object behaviour
│   ├── demoqa/HomePage.ts
│   ├── academybugs/HomePage.ts
│   └── saucedemo/{Login,Inventory}Page.ts
├── fixtures/
│   └── test-fixtures.ts               Custom Playwright fixtures + a11y
├── utils/
│   └── a11yHelper.ts                  axe-core wrapper
├── tests/
│   ├── functional/                    One spec per site
│   └── accessibility/                 axe scans for every site
├── eslint.config.mjs
├── playwright.config.ts
├── package.json
├── tsconfig.json
├── .env.example
└── README.md  (this file)
```

---

## 2. One-time setup (do this once on your laptop)

### 2.1 Prerequisites

| Tool    | Minimum version | How to check    |
|---------|-----------------|-----------------|
| Node.js | 20.x or 22.x    | `node -v`       |
| npm     | 9.x+            | `npm -v`        |
| Git     | any             | `git --version` |

> Install Node from <https://nodejs.org> if you don't have it. Use the **LTS** build.

### 2.2 Clone & install

```bash
# 1. Clone the repo (replace with your real repo URL)
git clone <your-repo-url> playwright-framework
cd playwright-framework

# 2. Install Node dependencies
npm install

# 3. Install Playwright browsers (Chromium, Firefox, WebKit)
npm run install:browsers

# 4. Copy the env template and edit it
cp .env.example .env
```

### 2.3 Verify the install

```bash
npx playwright --version       # should print 1.63 or newer
npm run typecheck              # should exit cleanly
npm run lint                   # should exit cleanly
```

If those three commands work, you're ready.

---

## 3. Running tests locally

You drive the framework with **two environment variables**:

| Variable   | Values                                              | Default | Meaning                         |
|------------|-----------------------------------------------------|---------|---------------------------------|
| `TEST_ENV` | `dev` \| `qa` \| `prod`                             | `qa`    | Which environment URL to hit    |
| `SITE`     | `demoqa` \| `academybugs` \| `saucedemo` \| empty   | empty   | Filter to one site, empty = all |

Set them in your `.env` file or pass them inline. `SITE` works because every
test group is tagged with its site id (for example `@saucedemo`), and
`playwright.config.ts` turns the variable into a `grep` on that tag.

### 3.1 The everyday commands

```bash
# All sites, qa env (default)
npm test

# Just the SauceDemo specs against dev
TEST_ENV=dev SITE=saucedemo npm test

# Run only accessibility scans across every site, prod URLs
TEST_ENV=prod npm run test:a11y

# Only functional tests
npm run test:functional

# Open the visual UI (great for debugging)
npm run test:ui
```

There are also shortcut npm scripts you'll use a lot:

```bash
npm run test:dev        # TEST_ENV=dev, all sites
npm run test:qa         # TEST_ENV=qa, all sites
npm run test:prod       # TEST_ENV=prod, all sites
npm run test:demoqa     # SITE=demoqa
npm run test:saucedemo  # SITE=saucedemo
```

### 3.2 Pointing at real environments

The three sample sites only exist at one public URL, so dev / qa / prod all
resolve to the same host out of the box. For a real project you don't edit
code - set a URL override named `<SITE>_<ENV>_URL`:

```bash
DEMOQA_DEV_URL=https://dev.example.com TEST_ENV=dev SITE=demoqa npm test
```

Put these in `.env` (see `.env.example`) or in your CI secrets. An override
wins over whatever is in `config/sites.ts`.

### 3.3 Reading the report

After every run:

```bash
npm run report
```

This opens the HTML report in your browser. For each failed test you'll get:

- the failure message
- a screenshot
- a video of the run
- a Playwright trace (open it; you can step through the DOM)
- for a11y tests: the `axe-results.json` attachment listing every violation

---

## 4. Writing your first test (the junior workflow)

### Step 1 - Pick or create a Page Object

Page objects live under `pages/<site>/`. They wrap the selectors and actions
for one page so tests stay readable. Put assertions in `expect*` methods on
the page object so the spec reads like a sentence.

If the page already exists, reuse it. If not:

```ts
// pages/demoqa/FormsPage.ts
import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../BasePage';

export class DemoQaFormsPage extends BasePage {
  readonly heading: Locator;

  constructor(page: Page) {
    super(page, 'demoqa');           // <-- the site id from config/sites.ts
    this.heading = page.getByRole('heading', { name: 'Forms' });
  }

  async open(): Promise<void> {
    await this.goto('/forms');       // BasePage builds the full URL for you
  }

  async expectLoaded(): Promise<void> {
    await expect(this.heading).toBeVisible();
  }
}
```

### Step 2 - Expose it as a fixture (optional, recommended)

Open `fixtures/test-fixtures.ts` and add the page to the `Pages` type and the
`test.extend({ ... })` block. Then any spec can request it as a parameter.

### Step 3 - Write the spec

Tag the describe block with the site id. That tag is what `SITE=demoqa`
filters on.

```ts
// tests/functional/demoqa-forms.spec.ts
import { test } from '../../fixtures/test-fixtures';

test.describe('DemoQA - forms', { tag: '@demoqa' }, () => {
  test('Forms page heading renders', async ({ demoqaFormsPage }) => {
    await demoqaFormsPage.open();
    await demoqaFormsPage.expectLoaded();
  });
});
```

### Step 4 - Run it

```bash
SITE=demoqa npm test -- tests/functional/demoqa-forms.spec.ts
```

### Step 5 - Add an accessibility check

Inside the same test, request the `a11y` fixture:

```ts
test('Forms page is accessible', async ({ demoqaFormsPage, a11y }) => {
  await demoqaFormsPage.open();
  await a11y({ wcagLevel: 'AA' });
});
```

By default **serious and critical** violations fail the test. Lesser findings
are still written to the console and to the `axe-results.json` attachment, they
just don't fail the build. Change that with `failOnImpact`.

---

## 5. Adding a new site

1. Open `config/sites.ts`.
2. Add the new entry to the `SiteId` union and the `sites` map with its
   `dev` / `qa` / `prod` URLs.
3. Create a folder under `pages/<your-site>/` and add page objects.
4. Add a spec under `tests/functional/<your-site>.spec.ts`, with
   `{ tag: '@<your-site>' }` on its describe block.
5. Run it: `SITE=<your-site> npm test`.

The accessibility suite picks up new sites automatically.

If a site has accessibility problems you can't fix (a third-party app, say),
list the axe rule ids under that site's `a11yKnownIssues` in `config/sites.ts`
with a one-line reason. They stay visible in the output but stop failing the
build, and the reason is right there for the next person.

---

## 6. Adding a new environment

1. Open `config/env.ts`.
2. Add the new value to `TestEnv` and `VALID_ENVS` (e.g. add `'staging'`).
3. Add a matching key to every site's `baseUrls` in `config/sites.ts`.
4. Update `.github/workflows/playwright.yml` `inputs.environment.options`.
5. Run with `TEST_ENV=staging npm test`.

---

## 7. GitHub Actions

The workflow lives at `.github/workflows/playwright.yml`. It runs:

- on **every PR** and **push to main**, against `qa`
- **nightly at 02:00 UTC** against `qa`
- **on demand** via the **Run workflow** button (Actions tab) where you can
  pick environment, site, and suite from dropdowns

### 7.1 What CI does on each run

1. Installs Node + npm dependencies (cached).
2. Installs the Playwright browser matching the matrix entry (chromium / firefox / webkit).
3. Type-checks with `tsc --noEmit`.
4. Lints with ESLint.
5. Runs the tests for the selected suite.
6. Uploads the HTML report as an **artifact** named
   `playwright-report-<browser>-<env>` (download it from the run summary page).
7. Writes a step summary visible directly on the PR check.

### 7.2 Secrets

Add these in **Settings → Secrets and variables → Actions** if you don't want
to use the public defaults:

- `SAUCE_USERNAME`
- `SAUCE_PASSWORD`

### 7.3 Triggering a manual run

1. Go to **Actions → Playwright Tests**.
2. Click **Run workflow**.
3. Pick `environment`, `site`, `suite`. Hit **Run**.
4. Watch the matrix kick off three jobs (one per browser).
5. When done, scroll to the bottom of the run page → **Artifacts** → download
   the report ZIP, unzip, open `index.html` in a browser.

---

## 8. Debugging cheatsheet

| Symptom                              | Try this                                                   |
|--------------------------------------|------------------------------------------------------------|
| Test fails locally, passes in CI     | `TEST_ENV=qa npm run test:headed` - watch the browser      |
| Locator can't find an element        | `npm run test:ui` and use the **Pick locator** tool        |
| Click times out, element looks fine  | Something is covering it - check the trace for an overlay  |
| Need to step through                 | `npm run test:debug`                                       |
| Want a fresh trace                   | Failed run → open report → **Trace** column → click        |
| Accessibility violation, want detail | Open report → expand failed a11y test → `axe-results.json` |

---

## 9. House rules (please follow)

1. **Never commit real credentials.** Use `.env` locally and GitHub Secrets in
   CI. The SauceDemo defaults in `config/sites.ts` are that site's public demo
   login, nothing else.
2. **One assertion topic per test.** If you find yourself writing six expects
   that test six different things, split the test.
3. **Don't ignore an axe rule without a reason.** Add it to the site's
   `a11yKnownIssues` with a one-line explanation, never silently.
4. **Don't run prod tests that mutate state.** Read-only smoke + a11y only.
5. **Open a PR for every change.** CI must be green before you merge.

---

## 10. Quick reference

```bash
# Install
npm install && npm run install:browsers

# Run everything against QA
npm test

# Run one site against dev
TEST_ENV=dev SITE=saucedemo npm test

# Run only a11y scans against prod
TEST_ENV=prod npm run test:a11y

# View the last report
npm run report

# Check before pushing
npm run typecheck && npm run lint
```

Welcome aboard. If something in this guide is unclear, that's a bug in the
guide, not a failing on your part. Open a PR and fix it.
