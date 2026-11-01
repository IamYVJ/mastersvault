// The GRE-style formats: two-part measures that adapt section by section, and the question types
// Quantitative Comparison, multiple choice with one or more answers, Numeric Entry, Text Completion,
// Sentence Equivalence and select-a-sentence Reading Comprehension.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { buildTestPayload } from '../src/lib/content/index.ts';
import { loadExam } from '../src/lib/content/load.ts';
import { splitSentences } from '../src/lib/content/sentences.ts';
import type { ResponseSpec, TestPayload } from '../src/lib/content/types.ts';
import { chooseTier } from '../src/lib/engine/adaptive.ts';
import { type Action, type ActionInput, type Attempt, createAttempt, currentSection, reduce, shuffledOrder } from '../src/lib/engine/attempt.ts';
import { isComplete, isCorrect, isPartial } from '../src/lib/engine/grading.ts';
import { initialCalc, press, type Key } from '../src/lib/engine/precedence-calculator.ts';
import { summarize } from '../src/lib/engine/results.ts';
import { scoreEstimates } from '../src/lib/engine/scoring.ts';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mv-gre-'));
afterAll(() => fs.rmSync(root, { recursive: true, force: true }));
const write = (rel: string, text: string) => {
  const file = path.join(root, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text.replace(/^\n/, ''));
};

// ------------------------------------------------------------------ fixtures
// Each measure is 2 + 3 questions, so a mock lists 2 first-part questions and 3 × 3 second-part ones.
const exam = (extra = '') => `
name: Demo GRE
testMaker: the Demo Testing Service (DTS)
trademark: Demo GRE is a trademark of DTS.
description: Demo
published: false
sections:
  - id: verbal
    name: Verbal
    shortName: V
    description: Verbal
    questionCount: 5
    timeMinutes: 10
    parts: [{ questionCount: 2, timeMinutes: 4 }, { questionCount: 3, timeMinutes: 6 }]
    questionTypes: [reading-comprehension, text-completion, sentence-equivalence]
    readingFormats: [mcq, multiple-answer, select-sentence]
    score: { min: 130, max: 170 }
    topics: [{ id: t, name: T }]
  - id: quant
    name: Quant
    shortName: Q
    description: Quant
    questionCount: 5
    timeMinutes: 10
    parts: [{ questionCount: 2, timeMinutes: 4 }, { questionCount: 3, timeMinutes: 6 }]
    questionTypes: [quantitative-comparison, multiple-choice, multiple-answer, numeric-entry]
    tools: [calculator]
    calculator: precedence
    score: { min: 130, max: 170 }
    topics: [{ id: t, name: T }]
${extra}
rules:
  sectionOrder: random
  requireAnswerToAdvance: false
  allowBackNavigation: true
  bookmarks: true
  reviewAndEdit: { enabled: true, maxAnswerChanges: null }
  optionalBreak: null
totalScore: { min: 260, max: 340, step: 1 }
`;

const question = (fields: string, stem = 'Question.', difficulty = 3) => `
---
difficulty: ${difficulty}
topics: [t]
origin: original
${fields.trim()}
---

${stem}

## Explanation

Because.
`;

const passage = `
---
title: Demo
---

Dr. Ames studied tides in 1990. She found that they rose. "Why?" she asked. J. Smith disagreed.

The second paragraph has one sentence about $x = 2.5$. It has another as well.
`;

const SELECT = 'She found that they rose.';

function writeExam(name: string, extra = '') {
  write(`${name}/exam.yaml`, exam(extra));
  write(`${name}/passages/rc-p001.md`, passage);
  write(`${name}/sources/di-s001.yaml`, 'tabs:\n  - title: Data\n    body: "| a | b |\\n|---|---|\\n| 1 | 2 |"\n');
  write(`${name}/figures/fig-001.svg`, '<svg viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg"><line x1="0" y1="0" x2="10" y2="10" stroke="currentColor"/></svg>');
  const v = `${name}/questions/verbal`;
  const q = `${name}/questions/quant`;
  write(`${v}/tc-0001.md`, question('type: text-completion\nblanks:\n  - { options: [a, b, c, d, e], answer: c }', 'One ___ blank.'));
  write(
    `${v}/tc-0002.md`,
    question('type: text-completion\nblanks:\n  - { options: [a, b, c], answer: a }\n  - { options: [d, e, f], answer: f }', 'Two ___ and ___ blanks.'),
  );
  write(`${v}/se-0001.md`, question('type: sentence-equivalence\nchoices: [a, b, c, d, e, f]\nanswer: [B, E]', 'A ___ word.'));
  write(`${v}/rc-0001.md`, question('type: reading-comprehension\npassage: rc-p001\nchoices: [a, b, c, d, e]\nanswer: A', 'Main idea?', 2));
  write(`${v}/rc-0002.md`, question('type: reading-comprehension\npassage: rc-p001\nformat: multiple-answer\nchoices: [a, b, c]\nanswer: [C, A]', 'Which?', 4));
  write(`${v}/rc-0003.md`, question(`type: reading-comprehension\npassage: rc-p001\nformat: select-sentence\nparagraphs: [1]\nanswer: "${SELECT}"`, 'Select it.'));
  for (const [i, d] of [1, 2, 4, 5, 3, 3].entries())
    write(`${v}/tc-01${i}0.md`, question('type: text-completion\nblanks:\n  - { options: [a, b, c, d, e], answer: a }', 'A ___.', d));
  write(`${q}/qc-0001.md`, question('type: quantitative-comparison\nquantityA: "$2^3$"\nquantityB: "$3^2$"\nanswer: B', '', 3));
  write(`${q}/mc-0001.md`, question('type: multiple-choice\nchoices: ["1", "2", "3", "4", "5"]\nanswer: C\nfigure: { file: fig-001, alt: A line from the top left corner to the bottom right corner. }', 'Which?', 3));
  write(`${q}/ma-0001.md`, question('type: multiple-answer\nsource: di-s001\nchoices: ["1", "2", "3", "4"]\nanswer: [D, B]', 'Which?', 3));
  write(`${q}/ne-0001.md`, question('type: numeric-entry\nsource: di-s001\nanswer: 2.50\nafter: "%"', 'How much?', 4));
  write(`${q}/ne-0002.md`, question('type: numeric-entry\nentry: fraction\nanswer: 3/8', 'What fraction?', 4));
  for (const [i, d] of [1, 2, 3, 3, 4, 3].entries())
    write(`${q}/mc-01${i}0.md`, question('type: multiple-choice\nchoices: ["1", "2", "3", "4", "5"]\nanswer: A', 'Pick.', d));
  write(
    `${name}/tests/mocks/01.yaml`,
    `title: Mock 1
sections:
  verbal:
    first: [tc-0001, se-0001]
    second:
      easier: [tc-0100, tc-0110, tc-0002]
      medium: [rc-0001, rc-0002, rc-0003]
      harder: [tc-0120, tc-0130, tc-0140]
  quant:
    first: [qc-0001, mc-0001]
    second:
      easier: [mc-0100, mc-0110, ma-0001]
      medium: [mc-0120, mc-0130, mc-0150]
      harder: [ne-0001, ne-0002, mc-0140]
`,
  );
  write(`${name}/tests/practice/q1.yaml`, 'title: Q1\nsection: quant\nquestions: [ma-0001, ne-0001]\n');
}

// ------------------------------------------------------------------- loading
describe('GRE-style content', () => {
  writeExam('gre');
  const { bundle, issues } = loadExam('gre', root);
  const errors = issues.filter((i) => i.level === 'error');

  it('loads every new question type, figures, data sets and a two-part mock without errors', () => {
    expect(errors).toEqual([]);
    expect(bundle!.config.published).toBe(false);
    expect(bundle!.questions.size).toBe(23);
    const mock = bundle!.mocks[0];
    expect(mock.sections.map((s) => [s.id, s.length, s.questions.length])).toEqual([
      ['verbal', 5, 11],
      ['quant', 5, 11],
    ]);
    expect(bundle!.practice[0].sections[0].timeMinutes).toBe(4); // 2 questions at 10 min / 5
  });

  const payload = buildTestPayload(bundle!, bundle!.mocks[0]);
  const spec = (id: string) => payload.questions[id].response;

  it('compiles a two-part measure into two timed sections, the second filled from its versions', () => {
    expect(payload.sections.map((s) => [s.id, s.timeMinutes, s.questionIds.length, s.measure?.part])).toEqual([
      ['verbal-1', 4, 2, 1],
      ['verbal-2', 6, 0, 2],
      ['quant-1', 4, 2, 1],
      ['quant-2', 6, 0, 2],
    ]);
    expect(payload.sections[3].tiers?.harder).toEqual(['ne-0001', 'ne-0002', 'mc-0140']);
    expect(payload.sections[2].calculator).toBe('precedence');
  });

  it('compiles answers for the new formats', () => {
    expect(spec('qc-0001')).toMatchObject({ kind: 'choice', answer: 1 });
    expect(payload.questions['qc-0001'].comparison?.[0]).toContain('katex');
    expect(spec('ma-0001')).toMatchObject({ kind: 'multi', answer: [1, 3] });
    expect(spec('se-0001')).toMatchObject({ kind: 'multi', answer: [1, 4], pick: 2 });
    expect(spec('rc-0002')).toMatchObject({ kind: 'multi', answer: [0, 2] });
    expect(spec('ne-0001')).toMatchObject({ kind: 'numeric', entry: 'decimal', answer: '2.50', after: '%' });
    expect(spec('tc-0002')).toMatchObject({ kind: 'blanks', blanks: [{ answer: 0 }, { answer: 2 }] });
    // Sentences of paragraph 1 only, and the answer's index across the passage.
    expect(spec('rc-0003')).toEqual({ kind: 'sentence', selectable: [0, 1, 2, 3], answer: 1 });
    expect(payload.passages['rc-p001'].sentences).toBe(true);
    expect(payload.passages['rc-p001'].html).toContain(`<span class="q-sentence" data-s="1" data-p="1">${SELECT}</span>`);
    expect(payload.questions['mc-0001'].figure?.svg).toMatch(/^<svg/);
    expect(payload.questions['ma-0001'].stimulus).toEqual({ kind: 'sources', id: 'di-s001' });
    expect(payload.questions['tc-0002'].stem).toContain('<span class="q-blank-label">(ii)</span>');
  });
});

describe('GRE-style validation', () => {
  const messages = (name: string) => loadExam(name, root).issues.map((i) => `${i.level} ${path.basename(i.file)} ${i.message}`);
  const expectIssue = (list: string[], re: RegExp) => expect(list.some((m) => re.test(m)), `expected ${re} in:\n${list.join('\n')}`).toBe(true);

  writeExam('bad');
  const v = 'bad/questions/verbal';
  const q = 'bad/questions/quant';
  write(`${v}/tc-0003.md`, question('type: text-completion\nblanks:\n  - { options: [a, b, c], answer: a }', 'One ___ blank with three options.'));
  write(`${v}/tc-0004.md`, question('type: text-completion\nblanks:\n  - { options: [a, b, c, d, e], answer: z }', 'No blank at all.'));
  write(`${v}/se-0002.md`, question('type: sentence-equivalence\nchoices: [a, b, c, d, e, f]\nanswer: [B]', 'A ___ word.'));
  write(`${v}/rc-0004.md`, question('type: reading-comprehension\npassage: rc-p001\nformat: select-sentence\nanswer: Not in the passage.', 'Select.'));
  write(`${v}/rc-0005.md`, question('type: reading-comprehension\npassage: rc-p001\nformat: select-sentence\nparagraphs: [3]\nanswer: "She found that they rose."', 'Select.'));
  write(`${q}/ma-0002.md`, question('type: multiple-answer\nchoices: ["1", "2", "3"]\nanswer: [A, E]', 'Which?'));
  write(`${q}/ne-0003.md`, question('type: numeric-entry\nanswer: 1e3', 'How many?'));
  write(`${q}/ne-0004.md`, question('type: numeric-entry\nentry: fraction\nanswer: 3/0', 'What fraction?'));
  write(`${q}/mc-0002.md`, question('type: multiple-choice\nchoices: ["1", "2", "3", "4", "5"]\nanswer: A\nfigure: { file: fig-404, alt: short }', 'Which?'));
  write('bad/figures/fig-002.svg', '<svg viewBox="0 0 1 1"><script>alert(1)</script><a href="https://x.test">x</a></svg>');
  write(
    'bad/tests/mocks/02.yaml',
    `title: Mock 2
sections:
  verbal: [tc-0003]
  quant:
    first: [mc-0002]
    second:
      easier: [mc-0140, mc-0130, mc-0120]
      medium: [mc-0100, mc-0110, mc-0150]
      harder: [mc-0001, ne-0003, ne-0004]
`,
  );
  const found = messages('bad');

  it('checks Text Completion blanks and options', () => {
    expectIssue(found, /error tc-0003\.md blanks\.0\.options: a single blank has 5 options, not 3/);
    expectIssue(found, /error tc-0004\.md the stem has 0 ___ blank\(s\), but blanks lists 1/);
    expectIssue(found, /error tc-0004\.md blanks\.0\.answer: "z" is not one of the options/);
  });
  it('requires two Sentence Equivalence answers', () => expectIssue(found, /error se-0002\.md answer: give exactly two letters/));
  it('checks multiple-answer letters against the choices', () => expectIssue(found, /error ma-0002\.md answer\.1: "E" is past the last choice/));
  it('checks Numeric Entry keys', () => {
    expectIssue(found, /error ne-0003\.md answer: "1e3" is not an integer or decimal/);
    expectIssue(found, /error ne-0004\.md answer: the denominator is 0/);
  });
  it('checks select-sentence answers against the passage', () => {
    expectIssue(found, /error rc-0004\.md answer: not a sentence of the passage/);
    expectIssue(found, /error rc-0005\.md paragraphs: the passage has only 2 paragraph/);
  });
  it('checks figures', () => {
    expectIssue(found, /error mc-0002\.md figure "fig-404" not found/);
    expectIssue(found, /error mc-0002\.md figure\.alt: describe everything/);
    expectIssue(found, /error fig-002\.svg scripts, foreignObject/);
    expectIssue(found, /error fig-002\.svg links are not allowed/);
  });
  it('checks the shape of a two-part mock', () => {
    expectIssue(found, /error 02\.yaml sections\.verbal: this section has two parts/);
    expectIssue(found, /error 02\.yaml sections\.quant\.first: has 1 questions, the first part needs 2/);
    expectIssue(found, /error 02\.yaml sections\.quant\.second: average difficulty must rise/);
  });
  it('checks that the parts add up and that formats are allowed', () => {
    write('parts/exam.yaml', exam().replace('[{ questionCount: 2, timeMinutes: 4 }, { questionCount: 3, timeMinutes: 6 }]', '[{ questionCount: 2, timeMinutes: 4 }, { questionCount: 2, timeMinutes: 7 }]').replace('readingFormats: [mcq, multiple-answer, select-sentence]', 'readingFormats: [mcq]'));
    write('parts/passages/rc-p001.md', passage);
    write('parts/questions/verbal/rc-0002.md', question('type: reading-comprehension\npassage: rc-p001\nformat: multiple-answer\nchoices: [a, b, c]\nanswer: [A]', 'Which?'));
    const list = messages('parts');
    expectIssue(list, /error exam\.yaml sections\.0\.parts: the parts have 4 questions, but the section has 5/);
    expectIssue(list, /error exam\.yaml sections\.0\.parts: the parts take 11 minutes, but the section has 10/);
    expectIssue(list, /error rc-0002\.md format "multiple-answer" is not one of this section's readingFormats/);
  });
});

// ------------------------------------------------------------------- grading
describe('grading the new formats', () => {
  const decimal: ResponseSpec = { kind: 'numeric', entry: 'decimal', answer: '2.5' };
  const fraction: ResponseSpec = { kind: 'numeric', entry: 'fraction', answer: '3/8' };
  const multi: ResponseSpec = { kind: 'multi', choices: ['a', 'b', 'c', 'd'], answer: [0, 2] };
  const pair: ResponseSpec = { kind: 'multi', choices: ['a', 'b', 'c', 'd', 'e', 'f'], answer: [1, 4], pick: 2 };
  const blanks: ResponseSpec = { kind: 'blanks', blanks: [{ options: ['a', 'b', 'c'], answer: 1 }, { options: ['d', 'e', 'f'], answer: 2 }] };

  it('accepts any equal number, exactly', () => {
    for (const ok of ['2.5', '2.50', '02.5', '2.500000']) expect(isCorrect(decimal, ok), ok).toBe(true);
    for (const wrong of ['2.4999999', '25', '-2.5']) expect(isCorrect(decimal, wrong), wrong).toBe(false);
    for (const unfinished of ['', '-', '.', '1e3']) expect(isComplete(decimal, unfinished), unfinished).toBe(false);
    expect(isCorrect({ kind: 'numeric', entry: 'decimal', answer: '0.1' }, '.1')).toBe(true);
    expect(isCorrect({ kind: 'numeric', entry: 'decimal', answer: '-3' }, '-3.0')).toBe(true);
  });
  it('accepts unreduced fractions, and never a zero denominator', () => {
    expect(isCorrect(fraction, ['6', '16'])).toBe(true);
    expect(isCorrect(fraction, ['-3', '-8'])).toBe(true);
    expect(isCorrect(fraction, ['3', '9'])).toBe(false);
    expect(isComplete(fraction, ['3', ''])).toBe(false);
    expect(isPartial(fraction, ['3', ''])).toBe(true);
    expect(isCorrect({ kind: 'numeric', entry: 'fraction', answer: '0/5' }, ['0', '0'])).toBe(false);
  });
  it('gives credit for exactly the correct choices', () => {
    expect(isCorrect(multi, [2, 0])).toBe(true);
    expect(isCorrect(multi, [0])).toBe(false);
    expect(isCorrect(multi, [0, 1, 2])).toBe(false);
    expect(isComplete(pair, [1])).toBe(false);
    expect(isPartial(pair, [1])).toBe(true);
    expect(isCorrect(pair, [1, 4])).toBe(true);
  });
  it('needs every blank right', () => {
    expect(isCorrect(blanks, [1, 2])).toBe(true);
    expect(isCorrect(blanks, [1, 1])).toBe(false);
    expect(isPartial(blanks, [1, null])).toBe(true);
  });
});

// -------------------------------------------------------------------- engine
describe('two-part measures in the test engine', () => {
  writeExam('engine');
  const { bundle } = loadExam('engine', root);
  const payload: TestPayload = buildTestPayload(bundle!, bundle!.mocks[0]);
  const step = (a: Attempt, action: ActionInput, now: number) => reduce(a, { ...action, now } as Action, payload);

  it('orders sections at random, always with a measure’s first part before its second', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const order = shuffledOrder(payload, `attempt-${i}`);
      expect(order.indexOf('verbal-1')).toBeLessThan(order.indexOf('verbal-2'));
      expect(order.indexOf('quant-1')).toBeLessThan(order.indexOf('quant-2'));
      seen.add(order.join());
    }
    expect(seen.size).toBe(6);
    expect(shuffledOrder(payload, 'same')).toEqual(shuffledOrder(payload, 'same'));
  });

  it('routes on the number right in the first part: weaker results to easier versions', () => {
    const tiers = payload.sections[3].tiers!;
    const route = (right: boolean[]) =>
      chooseTier(payload, tiers, ['qc-0001', 'mc-0001'], { 'qc-0001': right[0] ? 1 : 0, 'mc-0001': right[1] ? 2 : 0 });
    expect(route([false, false])).toBe('easier');
    expect(route([true, true])).toBe('harder');
  });

  it('serves the routed version when the second part begins, and reports the measure as one section', () => {
    let a = createAttempt(payload, 'engine/mocks/01', 0, 'fixed-id');
    a = { ...a, order: ['quant-1', 'quant-2', 'verbal-1', 'verbal-2'] };
    let t = 0;
    a = step(a, { type: 'start', settings: { timed: true, explanations: 'end' } }, (t += 1));
    expect(a.phase).toBe('section-intro');
    a = step(a, { type: 'begin-section' }, (t += 1));
    // Both right: qc-0001 is B, mc-0001 is C.
    a = step(a, { type: 'answer', value: 1 }, (t += 1000));
    a = step(a, { type: 'next' }, (t += 1));
    a = step(a, { type: 'answer', value: 2 }, (t += 1000));
    a = step(a, { type: 'next' }, (t += 1));
    expect(a.phase).toBe('review');
    a = step(a, { type: 'finish-section' }, (t += 1));
    a = step(a, { type: 'begin-section' }, (t += 1));
    expect(currentSection(a)!.tier).toBe('harder');
    expect(currentSection(a)!.questionIds).toEqual(['ne-0001', 'ne-0002', 'mc-0140']);
    a = step(a, { type: 'answer', value: '2.5' }, (t += 1000));
    // Run out of time in the second part, then skip through Verbal.
    a = step(a, { type: 'tick' }, (t += 6 * 60_000));
    a = step(a, { type: 'dismiss-alert' }, (t += 1));
    for (const _ of [1, 2]) {
      a = step(a, { type: 'begin-section' }, (t += 1));
      a = step(a, { type: 'finish-section' }, (t += 1));
    }
    expect(a.phase).toBe('results');
    const results = summarize(a, payload);
    expect(results.map((r) => [r.id, r.total, r.correct])).toEqual([
      ['quant', 5, 3],
      ['verbal', 5, 0],
    ]);
    expect(results[0].parts?.map((p) => [p.id, p.tier, p.correct, p.endedBy])).toEqual([
      ['quant-1', undefined, 2, 'submit'],
      ['quant-2', 'harder', 1, 'time'],
    ]);
    expect(results[0].questions.map((q) => q.number)).toEqual([1, 2, 3, 4, 5]);
    const est = scoreEstimates(payload, results)!;
    expect(est.sections[0].score).toBeGreaterThan(est.sections[1].score);
    expect(est.total.score).toBe(est.sections[0].score + est.sections[1].score);
  });

  it('lets any answer in the section be changed during review', () => {
    let a = createAttempt(payload, 'engine/mocks/01', 0, 'other');
    a = { ...a, order: ['quant-1', 'quant-2', 'verbal-1', 'verbal-2'] };
    a = step(a, { type: 'start', settings: { timed: true, explanations: 'end' } }, 1);
    a = step(a, { type: 'begin-section' }, 2);
    a = step(a, { type: 'next' }, 3); // skipping is allowed
    a = step(a, { type: 'next' }, 4);
    expect(a.phase).toBe('review');
    for (const index of [0, 1]) {
      a = step(a, { type: 'goto', index }, 5);
      a = step(a, { type: 'answer', value: 0 }, 6);
    }
    expect(Object.keys(currentSection(a)!.responses)).toEqual(['qc-0001', 'mc-0001']);
  });
});

// ------------------------------------------------------------------ sentences
describe('splitting a passage into sentences', () => {
  it('keeps abbreviations, initials and maths inside a sentence', () => {
    const s = splitSentences('Dr. Ames met J. Smith at 3 p.m. The U.S. team won. Then $x = 1. 5$ held! "Really?" Yes.\n\nNew paragraph here.');
    expect(s.map((x) => [x.paragraph, x.text])).toEqual([
      [1, 'Dr. Ames met J. Smith at 3 p.m. The U.S. team won.'],
      [1, 'Then $x = 1. 5$ held!'],
      [1, '"Really?"'],
      [1, 'Yes.'],
      [2, 'New paragraph here.'],
    ]);
  });
});

// ----------------------------------------------------------------- calculator
describe('the order-of-operations calculator', () => {
  const digits = (n: string): Key[] =>
    [...n].map((c) => (c === '.' ? { type: 'decimal' } : { type: 'digit', digit: c }));
  const run = (...keys: (Key | string)[]) =>
    keys.flatMap((k) => (typeof k === 'string' ? digits(k) : [k])).reduce(press, initialCalc).display;
  const op = (o: '+' | '−' | '×' | '÷'): Key => ({ type: 'op', op: o });
  const eq: Key = { type: 'equals' };
  const sign: Key = { type: 'sign' };
  const sqrt: Key = { type: 'sqrt' };
  const open: Key = { type: 'open' };
  const close: Key = { type: 'close' };

  // The worked examples in the test maker's calculator guidelines.
  it('multiplies and divides before adding', () => {
    expect(run('1', op('+'), '2', op('×'), '4', eq)).toBe('9');
    expect(run('4', op('+'), '6.73', op('÷'), '2', eq)).toBe('7.365');
    expect(run('6', op('×'), '5280', op('÷'), '3600', eq)).toBe('8.8');
  });
  it('groups with parentheses, or with = part-way', () => {
    expect(run(open, '8.4', op('+'), '9.3', close, op('÷'), '70', eq, sign)).toBe('-0.2528571');
    expect(run('8.4', op('+'), '9.3', eq, op('÷'), '70', eq, sign)).toBe('-0.2528571');
  });
  it('applies √ and ± to the number on the display at once', () => {
    expect(run('21', op('×'), '21', op('+'), '54', op('×'), '54', eq, sqrt)).toBe('57.939624');
    expect(run('15', sign, op('×'), '15', sign, op('×'), '15', sign, eq)).toBe('-3375');
  });
  it('keeps a running total in memory', () => {
    const m = (action: 'add' | 'recall' | 'clear'): Key => ({ type: 'memory', action });
    expect(run('43', op('×'), '60', eq, m('add'), '21', op('×'), '80', eq, m('add'), '16', op('×'), '100', eq, m('add'), m('recall'), op('÷'), open, '43', op('+'), '21', op('+'), '16', close, eq)).toBe('73.25');
  });
  it('shows ERROR until cleared, and 0 for tiny results', () => {
    expect(run('6', op('÷'), '0', eq)).toBe('ERROR');
    expect(run('1', sign, sqrt)).toBe('ERROR');
    expect(run('10000000', op('×'), '10', eq)).toBe('ERROR');
    expect(run('6', op('÷'), '0', eq, '5', op('+'))).toBe('ERROR');
    expect(run('6', op('÷'), '0', eq, { type: 'clear' }, '5')).toBe('5');
    expect(run('1', op('÷'), '100000000', eq)).toBe('0.0000001'); // the entry stops at 8 digits: 10,000,000
    expect(run('0.0000001', op('÷'), '10', eq)).toBe('0');
    expect(run('123456789')).toBe('12345678');
  });
});
