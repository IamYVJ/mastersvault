// Runs every answer check in scripts/verify/ and fails if any keyed answer disagrees with the
// independently computed one. Each check recomputes answers by brute force from the question files,
// and the Data Sufficiency checks also confirm that no two statements contradict each other.
// Questions that rest on written reasoning (Verbal, and verbal two-part questions) can't be checked this way.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'verify');
const verbose = process.argv.includes('--verbose');
const scripts = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith('.mjs') && !f.endsWith('.part.mjs') && f !== 'balance.mjs')
  .sort();

let failed = 0;
for (const script of scripts) {
  const run = spawnSync(process.execPath, [path.join(dir, script)], { encoding: 'utf8' });
  const lines = `${run.stdout}${run.stderr}`.split('\n').filter(Boolean);
  const checks = lines.filter((l) => /^(ok|FAIL)\b/.test(l));
  const failures = checks.filter((l) => l.startsWith('FAIL'));
  const ok = run.status === 0 && failures.length === 0;
  if (!ok) failed++;
  console.log(`${ok ? '✓' : '✖'} ${script}: ${checks.length - failures.length}/${checks.length} checks passed`);
  if (verbose) lines.forEach((l) => console.log(`    ${l}`));
  else if (!ok) (failures.length ? failures : lines.slice(-10)).forEach((l) => console.log(`    ${l}`));
}

console.log(failed ? `\n${failed} script(s) failed` : `\nAll answer checks passed (${scripts.length} scripts)`);
process.exit(failed ? 1 : 0);
