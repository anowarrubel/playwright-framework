import { TestInfo, expect } from '@playwright/test';

/** One pass/fail result from a security or SEO check. */
export interface Finding {
  id: string;
  title: string;
  passed: boolean;
  detail: string;
}

/** Check id -> why we tolerate a failure of it. */
export type KnownIssues = Record<string, string>;

/**
 * A failing check passes (with a `known-issue` annotation) when the site lists
 * it as a known issue. A listed check that now passes gets `known-issue-fixed`.
 * Anything else that fails fails the test.
 */
export async function expectFinding(
  testInfo: TestInfo,
  finding: Finding,
  knownIssues: KnownIssues = {},
): Promise<void> {
  await testInfo.attach(`${finding.id}.json`, {
    body: JSON.stringify(finding, null, 2),
    contentType: 'application/json',
  });

  const reason = knownIssues[finding.id];

  if (!finding.passed && reason) {
    testInfo.annotations.push({ type: 'known-issue', description: `${finding.detail} - ${reason}` });
    return;
  }

  if (finding.passed && reason) {
    testInfo.annotations.push({
      type: 'known-issue-fixed',
      description: `"${finding.id}" now passes - remove it from the known issues list. (Was: ${reason})`,
    });
  }

  expect(finding.passed, `${finding.title} - ${finding.detail}`).toBe(true);
}
