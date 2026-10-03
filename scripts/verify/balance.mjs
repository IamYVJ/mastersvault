// Prints the spread of correct-answer letters and difficulty levels in each mock section.
// Run from the project root: node scripts/verify/balance.mjs
import { getExam } from '../../src/lib/content/index.ts';
const exam = getExam('gmat');
for (const mock of exam.mocks) { console.log('--- mock', mock.id);
for (const s of mock.sections) {
  const letters = {}; const diff = {};
  for (const id of s.questions) {
    const d = exam.questions.get(id).data;
    if (d.answer && typeof d.answer === 'string') letters[d.answer] = (letters[d.answer] ?? 0) + 1;
    diff[d.difficulty] = (diff[d.difficulty] ?? 0) + 1;
  }
  console.log(s.id, 'letters', JSON.stringify(letters), 'difficulty', JSON.stringify(diff));
}}
