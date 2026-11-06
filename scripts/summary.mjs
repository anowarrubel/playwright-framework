#!/usr/bin/env node
/**
 * Turns reports/findings.jsonl into a markdown summary. In GitHub Actions it
 * is appended to the job summary; locally it prints to the terminal.
 */
import { appendFileSync, existsSync, readFileSync } from 'node:fs';

const file = 'reports/findings.jsonl';
if (!existsSync(file)) {
  console.log('No findings were recorded in this run.');
  process.exit(0);
}

// A retried test logs once per attempt; the last attempt is the one that counts.
const latest = new Map();
for (const line of readFileSync(file, 'utf8').split('\n').filter(Boolean)) {
  const r = JSON.parse(line);
  latest.set([r.suite, r.site, r.env, r.browser, r.id].join('|'), r);
}
const rows = [...latest.values()];
const count = (status) => rows.filter((r) => r.status === status).length;
const cell = (text) => String(text ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');

const lines = [
  '## Check summary',
  '',
  `${rows.length} checks recorded: ${count('pass')} passed, ${count('fail')} failed, ` +
    `${count('known-issue')} known issues, ${count('known-issue-fixed')} known issues now passing.`,
  '',
];

const section = (heading, status, columns) => {
  const subset = rows.filter((r) => r.status === status);
  if (!subset.length) return;
  lines.push(`### ${heading}`, '', `| Suite | Site | Env | Check | ${columns} |`, '|---|---|---|---|---|');
  for (const r of subset) {
    lines.push(`| ${r.suite} | ${r.site} | ${r.env} | ${cell(r.id)} | ${cell(status === 'known-issue-fixed' ? r.reason : r.detail)} |`);
  }
  lines.push('');
};

section('Failures', 'fail', 'Detail');
section('Known issues now passing (remove from config/sites.ts)', 'known-issue-fixed', 'Was');
section('Known issues (not gating)', 'known-issue', 'Detail');

const output = lines.join('\n');
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${output}\n`);
else console.log(output);
