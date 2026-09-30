// Prints how the question bank is spread across types, difficulty and topics,
// and which questions are not yet used in any test.
//   npm run coverage
import { getExams } from '../src/lib/content/index.ts';
import { notesByTopic } from '../src/lib/content/revision.ts';

const pad = (s: string | number, n: number) => String(s).padEnd(n);
const padL = (s: string | number, n: number) => String(s).padStart(n);

for (const exam of getExams()) {
  const all = [...exam.questions.values()];
  const used = new Set([...exam.mocks, ...exam.practice].flatMap((t) => t.sections.flatMap((s) => s.questions)));
  console.log(`\n=== ${exam.config.name} (${exam.id}) — ${all.length} questions, ${exam.mocks.length} mocks, ${exam.practice.length} practice sets`);

  const notes = notesByTopic(exam);
  for (const section of exam.config.sections) {
    const qs = all.filter((q) => q.section === section.id);
    console.log(`\n${section.name}: ${qs.length} questions (${qs.filter((q) => q.data.status === 'reviewed').length} reviewed)`);
    console.log(`  ${pad('type', 26)}${[1, 2, 3, 4, 5].map((d) => padL('d' + d, 5)).join('')}${padL('total', 7)}`);
    for (const type of section.questionTypes) {
      const t = qs.filter((q) => q.data.type === type);
      const cells = [1, 2, 3, 4, 5].map((d) => padL(t.filter((q) => q.data.difficulty === d).length, 5)).join('');
      console.log(`  ${pad(type, 26)}${cells}${padL(t.length, 7)}`);
    }
    console.log('  topics:');
    for (const topic of section.topics) {
      const n = qs.filter((q) => q.data.topics.includes(topic.id)).length;
      const note = notes.has(`${section.id}/${topic.id}`) ? '  note' : '  no note';
      console.log(`    ${pad(topic.name, 34)}${padL(n, 4)}${note}${n === 0 ? '  ← no questions yet' : ''}`);
    }
  }

  const unused = all.filter((q) => !used.has(q.id)).map((q) => q.id);
  console.log(`\nNot used in any test (${unused.length}): ${unused.join(', ') || '—'}`);
}
