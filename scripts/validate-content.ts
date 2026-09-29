// Validates everything under content/: schemas, cross-references, test
// composition and Markdown/math rendering. Exits non-zero on any error.
//   npm run validate
import { checkContent } from '../src/lib/content/index.ts';

const { exams, issues } = checkContent();
const errors = issues.filter((i) => i.level === 'error');
const warnings = issues.filter((i) => i.level === 'warning');

const byFile = new Map<string, typeof issues>();
for (const i of issues) byFile.set(i.file, [...(byFile.get(i.file) ?? []), i]);
for (const [file, list] of [...byFile].sort(([a], [b]) => a.localeCompare(b))) {
  console.log(`\n${file}`);
  for (const i of list) console.log(`  ${i.level === 'error' ? '✖ error  ' : '⚠ warning'}  ${i.message}`);
}

for (const e of exams) {
  const tests = e.mocks.length + e.practice.length;
  console.log(`\n${e.id}: ${e.questions.size} questions, ${e.passages.size} passages, ${e.sources.size} source sets, ${tests} tests`);
}
console.log(`\n${errors.length} error(s), ${warnings.length} warning(s)`);
process.exit(errors.length ? 1 : 0);
