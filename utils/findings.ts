import fs from 'node:fs';
import path from 'node:path';
import { TestInfo, expect } from '@playwright/test';
import { getCurrentEnv } from '../config/env';

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
  record(testInfo, finding, reason);

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

const FINDINGS_FILE = path.join('reports', 'findings.jsonl');

/** One line per finding; scripts/summary.mjs turns the file into the CI summary. */
function record(testInfo: TestInfo, finding: Finding, reason: string | undefined): void {
  const status = finding.passed
    ? reason ? 'known-issue-fixed' : 'pass'
    : reason ? 'known-issue' : 'fail';
  fs.mkdirSync(path.dirname(FINDINGS_FILE), { recursive: true });
  fs.appendFileSync(
    FINDINGS_FILE,
    `${JSON.stringify({
      suite: path.basename(path.dirname(testInfo.file)),
      site: testInfo.tags.find((t) => t.startsWith('@'))?.slice(1) ?? 'n/a',
      env: getCurrentEnv(),
      browser: testInfo.project.name,
      id: finding.id,
      title: finding.title,
      status,
      detail: finding.detail,
      reason,
    })}\n`,
  );
}

/** Records every finding, then fails once if any unexpected one failed, so one miss doesn't hide the rest. */
export async function expectFindings(
  testInfo: TestInfo,
  findings: Finding[],
  knownIssues: KnownIssues = {},
): Promise<void> {
  const unexpected: string[] = [];
  for (const finding of findings) {
    const reason = knownIssues[finding.id];
    record(testInfo, finding, reason);
    if (!finding.passed && !reason) unexpected.push(`${finding.id}: ${finding.detail}`);
    if (finding.passed && reason) {
      testInfo.annotations.push({
        type: 'known-issue-fixed',
        description: `"${finding.id}" now passes - remove it from the known issues list. (Was: ${reason})`,
      });
    }
    if (!finding.passed && reason) {
      testInfo.annotations.push({ type: 'known-issue', description: `${finding.detail} - ${reason}` });
    }
  }
  expect(unexpected, 'unexpected failing checks').toEqual([]);
}
