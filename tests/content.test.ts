import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { buildTestPayload, checkContent, getExam } from '../src/lib/content/index.ts';
import { loadExam } from '../src/lib/content/load.ts';
import { parseYaml } from '../src/lib/content/yaml.ts';

describe('real content', () => {
  it('has no validation errors', () => {
    const { issues } = checkContent();
    expect(issues.filter((i) => i.level === 'error')).toEqual([]);
  });

  it('compiles answers to indices', () => {
    const exam = getExam('gmat');
    const di = buildTestPayload(exam, exam.practice.find((t) => t.id === 'di-sampler')!);
    expect(di.questions['tpa-0001'].response).toMatchObject({ kind: 'two-part', answer: [4, 0] });
    expect(di.questions['msr-0002'].response).toMatchObject({ kind: 'dichotomous' });
    expect(di.questions['ds-0002'].response).toMatchObject({ kind: 'choice', answer: 3 });
    expect(Object.keys(di.sources)).toEqual(['msr-s001']);
    const quant = buildTestPayload(exam, exam.practice.find((t) => t.id === 'quant-sampler')!);
    expect(quant.questions['ps-0001'].response).toMatchObject({ kind: 'choice', answer: 0 });
    expect(quant.sections[0].timeMinutes).toBe(11); // 5 questions at the section's 45/21 pace, rounded up
  });

  it('lists practice sets by order, samplers first', () => {
    const exam = getExam('gmat');
    const quant = exam.practice.filter((t) => t.sections[0].id === 'quant').map((t) => t.id);
    expect(quant).toEqual(['quant-sampler', 'quant-arithmetic', 'quant-algebra', 'quant-word-problems']);
  });

  it('keeps practice sets free of mock questions and of each other', () => {
    const exam = getExam('gmat');
    const inMocks = new Set(exam.mocks.flatMap((t) => t.sections.flatMap((s) => s.questions)));
    const practice = exam.practice.flatMap((t) => t.sections.flatMap((s) => s.questions));
    expect(practice.filter((q) => inMocks.has(q))).toEqual([]);
    expect(new Set(practice).size).toBe(practice.length);
  });
});

describe('yaml', () => {
  it('keeps decimals exactly as written', () => {
    expect(parseYaml('a: 1.50\nb: 700\nc: [0.10, x]')).toEqual({ a: '1.50', b: 700, c: ['0.10', 'x'] });
  });
});

// ------------------------------------------------------------------ fixtures
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mv-content-'));
afterAll(() => fs.rmSync(root, { recursive: true, force: true }));

function write(rel: string, text: string) {
  const file = path.join(root, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text.replace(/^\n/, ''));
}

const exam = `
name: Demo
description: Demo exam
sections:
  - id: quant
    name: Quant
    shortName: Q
    description: Quant section
    questionCount: 2
    timeMinutes: 4
    questionTypes: [problem-solving, reading-comprehension, graphics-interpretation]
    score: { min: 60, max: 90 }
    topics: [{ id: algebra, name: Algebra }]
rules:
  sectionOrder: fixed
  requireAnswerToAdvance: true
  allowBackNavigation: false
  bookmarks: true
  reviewAndEdit: { enabled: true, maxAnswerChanges: 3 }
  optionalBreak: null
totalScore: { min: 205, max: 805, step: 10 }
`;

const ps = (answer: string) => `
---
type: problem-solving
difficulty: 3
topics: [algebra]
origin: original
choices: ["1", "2", "3", "4", "5"]
answer: ${answer}
---

What is $x$?

## Explanation

It is 2.
`;

const gi = `
---
type: graphics-interpretation
difficulty: 2
topics: [algebra]
origin: original
chart: { kind: bar, categories: [a, b], series: [{ name: s, values: [1, 2, 3] }] }
statements:
  - { text: "No blank here", options: ["x", "y"], answer: "z" }
---

Look at the chart.

## Explanation

Because.
`;

describe('validation', () => {
  write('demo/exam.yaml', exam);
  write('demo/questions/quant/ps-0001.md', ps('B'));
  write('demo/questions/quant/ps-0002.md', ps('B'));
  write('demo/questions/quant/ps-0003.md', ps('F'));
  write('demo/questions/quant/ps-0004.md', ps('A').replace('topics: [algebra]', 'topics: [geometry]'));
  write('demo/questions/quant/ps-0005.md', ps('A').replace('## Explanation', '## Solution'));
  write('demo/questions/quant/ps-0006.md', ps('A').replace('origin: original', 'origin: adapted'));
  write('demo/questions/quant/rc-0001.md', ps('A').replace('type: problem-solving', 'type: reading-comprehension\npassage: rc-p404'));
  write('demo/questions/quant/gi-0001.md', gi);
  write('demo/tests/mocks/m1.yaml', 'title: M1\nsections:\n  quant: [ps-0001, ps-0002]\n');
  write('demo/tests/mocks/m2.yaml', 'title: M2\nsections:\n  quant: [ps-0001]\n');
  write('demo/tests/practice/p1.yaml', 'title: P1\nsection: quant\nquestions: [ps-0002, ps-9999]\n');

  const { bundle, issues } = loadExam('demo', root);
  const messages = issues.map((i) => `${i.level} ${path.basename(i.file)} ${i.message}`);
  const has = (re: RegExp) =>
    expect(messages.some((m) => re.test(m)), `expected ${re} in:\n${messages.join('\n')}`).toBe(true);

  it('loads the valid questions', () => expect(bundle?.questions.has('ps-0001')).toBe(true));
  it('rejects an out-of-range answer letter', () => has(/error ps-0003\.md answer:/));
  it('rejects unknown topics', () => has(/error ps-0004\.md unknown topic "geometry"/));
  it('requires an Explanation heading', () => has(/error ps-0005\.md .*## Explanation/));
  it('requires original questions', () => has(/error ps-0006\.md origin:/));
  it('checks passage references', () => has(/error rc-0001\.md passage "rc-p404" not found/));
  it('checks chart series length', () => has(/error gi-0001\.md chart\.series\.0: has 3 values but there are 2 categories/));
  it('requires exactly one blank per statement', () => has(/error gi-0001\.md statements\.0\.text: must contain exactly one ___/));
  it('requires dropdown answers to be options', () => has(/error gi-0001\.md statements\.0\.answer: "z"/));
  it('checks mock section sizes', () => has(/error m2\.yaml sections\.quant: has 1 questions, the exam format needs 2/));
  it('forbids reusing a question across mocks', () => has(/error ps-0001\.md used in more than one mock: m1, m2/));
  it('warns when a mock question is reused in practice', () => has(/warning ps-0002\.md used in mock "m1" and also in a practice set/));
  it('checks test question references', () => has(/error p1\.yaml questions: question "ps-9999" not found/));
  it('warns about unreviewed questions', () => has(/warning m1\.yaml sections\.quant: 2 question\(s\) not yet reviewed/));

  it('flags math errors and unescaped dollar signs when rendering', () => {
    write('bad/exam.yaml', exam);
    write('bad/questions/quant/ps-0001.md', ps('A').replace('What is $x$?', 'Pay $40 and $60. Then $\\frac{1}{$ x.'));
    const found = checkContent(root).issues.filter((i) => i.file.includes('bad'));
    expect(found.some((i) => i.level === 'warning' && /escape dollar amounts/.test(i.message))).toBe(true);
    expect(found.some((i) => i.level === 'error' && /KaTeX/.test(i.message))).toBe(true);
  });
});
