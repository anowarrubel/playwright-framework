import { Page, TestInfo, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { ImpactValue } from 'axe-core';

export type WcagLevel = 'A' | 'AA' | 'AAA';

export interface A11yScanOptions {
  /** WCAG conformance level. Defaults to AA. */
  wcagLevel?: WcagLevel;
  /** Only check inside this CSS selector. */
  include?: string | string[];
  /** Skip this CSS selector(s). */
  exclude?: string | string[];
  /** Disable specific axe rules (e.g. ['color-contrast']). Use sparingly and document why. */
  disableRules?: string[];
  /**
   * Impact levels that fail the test. Anything else is still reported in the
   * attachment and console output but does not fail the build.
   * Default: serious and critical.
   */
  failOnImpact?: NonNullable<ImpactValue>[];
  /**
   * Rule ids we already know about and are not gating on (see
   * SiteConfig.a11yKnownIssues). They are reported, not failed.
   */
  knownIssues?: string[];
  /** Set false to run the scan and attach the report without ever failing. Default true. */
  failOnViolations?: boolean;
}

/**
 * Run an axe-core scan on the current page and attach the full report to the
 * test result, so the exact violations are in the HTML report and CI artifact.
 *
 *   await checkA11y(page, testInfo, { wcagLevel: 'AA' });
 */
export async function checkA11y(
  page: Page,
  testInfo: TestInfo,
  options: A11yScanOptions = {},
): Promise<void> {
  const {
    wcagLevel = 'AA',
    include,
    exclude,
    disableRules = [],
    failOnImpact = ['serious', 'critical'],
    knownIssues = [],
    failOnViolations = true,
  } = options;

  let builder = new AxeBuilder({ page }).withTags(buildWcagTags(wcagLevel));
  for (const selector of toArray(include)) builder = builder.include(selector);
  for (const selector of toArray(exclude)) builder = builder.exclude(selector);
  if (disableRules.length) builder = builder.disableRules(disableRules);

  const results = await builder.analyze();

  await testInfo.attach('axe-results.json', {
    body: JSON.stringify(results, null, 2),
    contentType: 'application/json',
  });

  const known = new Set(knownIssues);
  const blocking = results.violations.filter(
    (v) => !known.has(v.id) && v.impact != null && failOnImpact.includes(v.impact),
  );

  if (results.violations.length > 0) {
    const summary = results.violations
      .map((v) => {
        const status = blocking.includes(v) ? 'FAIL' : known.has(v.id) ? 'known' : 'info';
        return `- [${status}] [${v.impact ?? 'n/a'}] ${v.id}: ${v.help} (${v.nodes.length} node(s))\n  ${v.helpUrl}`;
      })
      .join('\n');
    console.log(`\nAccessibility findings on ${page.url()}:\n${summary}\n`);
  }

  if (failOnViolations) {
    const ids = blocking.map((v) => `${v.id} (${v.impact})`).join(', ');
    expect(
      blocking,
      `${blocking.length} blocking accessibility violation(s): ${ids}. See the axe-results.json attachment.`,
    ).toEqual([]);
  }
}

function toArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function buildWcagTags(level: WcagLevel): string[] {
  // Cumulative: AA includes A, AAA includes A + AA
  const base = ['wcag2a', 'wcag21a'];
  if (level === 'A') return base;
  const aa = [...base, 'wcag2aa', 'wcag21aa'];
  if (level === 'AA') return aa;
  return [...aa, 'wcag2aaa'];
}
