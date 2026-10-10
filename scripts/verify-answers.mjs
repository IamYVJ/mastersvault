// Runs every answer check and fails if any keyed answer disagrees with the independently computed one.
// The checks are kept with the content, in <content>/<exam>/verify/, because they contain the answers.
// Each one recomputes answers by brute force from the question files, and the Data Sufficiency checks
// also confirm that no two statements contradict each other. Questions that rest on written reasoning
// (Verbal, and verbal two-part questions) can't be checked this way.
//
//   npm run verify                 run every check
//   npm run verify -- --verbose    also print each check's lines
//   npm run verify -- --balance    print each mock's answer-letter and difficulty counts instead
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { CONTENT_ROOT, listExamIds } from '../src/lib/content/load.ts';

const verbose = process.argv.includes('--verbose');
const BALANCE = 'balance.mjs';
const dirs = listExamIds()
  .map((exam) => path.join(CONTENT_ROOT, exam, 'verify'))
  .filter((dir) => fs.existsSync(dir));

if (process.argv.includes('--balance')) {
  for (const dir of dirs) if (fs.existsSync(path.join(dir, BALANCE))) spawnSync(process.execPath, [path.join(dir, BALANCE)], { stdio: 'inherit' });
  process.exit(0);
}

const scripts = dirs.flatMap((dir) =>
  fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.mjs') && !f.endsWith('.part.mjs') && f !== BALANCE)
    .sort()
    .map((f) => path.join(dir, f)),
);
if (!scripts.length) {
  console.log(`No answer checks found under ${CONTENT_ROOT}`);
  process.exit(1);
}

let failed = 0;
for (const script of scripts) {
  const run = spawnSync(process.execPath, [script], { encoding: 'utf8' });
  const lines = `${run.stdout}${run.stderr}`.split('\n').filter(Boolean);
  const checks = lines.filter((l) => /^(ok|FAIL)\b/.test(l));
  const failures = checks.filter((l) => l.startsWith('FAIL'));
  const ok = run.status === 0 && failures.length === 0;
  if (!ok) failed++;
  console.log(`${ok ? '✓' : '✖'} ${path.basename(script)}: ${checks.length - failures.length}/${checks.length} checks passed`);
  if (verbose) lines.forEach((l) => console.log(`    ${l}`));
  else if (!ok) (failures.length ? failures : lines.slice(-10)).forEach((l) => console.log(`    ${l}`));
}

console.log(failed ? `\n${failed} script(s) failed` : `\nAll answer checks passed (${scripts.length} scripts)`);
process.exit(failed ? 1 : 0);
