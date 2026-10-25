import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { expandSlots, loadExam } from '../src/lib/content/load.ts';
import type { AdaptivePlan, AdaptiveSlot, RenderedQuestion, TestPayload } from '../src/lib/content/types.ts';
import { nextQuestions, nextSlot, sectionLength, seedFor, servePoolInOrder, targetDifficulty } from '../src/lib/engine/adaptive.ts';
import { type Attempt, createAttempt, currentSection, reduce, rulesFor } from '../src/lib/engine/attempt.ts';
import { summarize } from '../src/lib/engine/results.ts';

const MIN = 60_000;
const RIGHT = 0;
const WRONG = 1;

function q(id: string, type: RenderedQuestion['type'], difficulty: number, topic: string, stimulus?: RenderedQuestion['stimulus']): RenderedQuestion {
  return {
    id,
    type,
    section: 's',
    difficulty,
    topics: [topic],
    targetSeconds: 120,
    stem: '',
    explanation: '',
    stimulus,
    response: { kind: 'choice', choices: ['a', 'b', 'c', 'd', 'e'], answer: RIGHT },
  };
}

/**
 * A one-section adaptive payload: 6 single slots of "critical-reasoning" and one 3-question passage block
 * after the third, drawing on 5 questions at each difficulty and 5 passages from easy to hard.
 */
function adaptivePayload(): TestPayload {
  const questions: Record<string, RenderedQuestion> = {};
  const pool: string[] = [];
  for (let d = 1; d <= 5; d++)
    for (let i = 0; i < 5; i++) {
      const id = `cr-d${d}-${i}`;
      questions[id] = q(id, 'critical-reasoning', d, `topic-${i}`);
      pool.push(id);
    }
  for (let p = 1; p <= 5; p++)
    for (let i = 0; i < 3; i++) {
      const id = `rc-p${p}-${i}`;
      questions[id] = q(id, 'reading-comprehension', p, 'rc', { kind: 'passage', id: `p${p}` });
      pool.push(id);
    }
  const single: AdaptiveSlot = { kind: 'single', type: 'critical-reasoning' };
  const slots: AdaptiveSlot[] = [single, single, single, { kind: 'group', stimulus: 'passage', size: 3 }, single, single, single];
  return {
    version: 1,
    hash: 'h',
    exam: {
      id: 'demo',
      name: 'Demo',
      rules: {
        sectionOrder: 'fixed',
        requireAnswerToAdvance: false,
        allowBackNavigation: true,
        bookmarks: true,
        reviewAndEdit: { enabled: true, maxAnswerChanges: 3 },
        optionalBreak: null,
      },
      totalScore: { min: 205, max: 805, step: 10 },
    },
    test: { id: 'adaptive-01', kind: 'mock', title: 'Adaptive', adaptive: true },
    sections: [
      { id: 's', name: 'S', shortName: 's', timeMinutes: 30, tools: [], score: { min: 60, max: 90 }, questionIds: [], adaptive: { length: 9, slots, pool } },
    ],
    topics: {},
    questions,
    passages: {},
    sources: {},
  };
}

const planOf = (p: TestPayload) => p.sections[0].adaptive as AdaptivePlan;

/** Serves a whole section, answering with `answer(question)` each time. */
function run(p: TestPayload, answer: (q: RenderedQuestion) => number, seed = 1) {
  const served: string[] = [];
  const responses: Record<string, number> = {};
  for (;;) {
    const next = nextQuestions(p, planOf(p), served, responses, seed);
    if (!next.length) break;
    for (const id of next) {
      served.push(id);
      responses[id] = answer(p.questions[id]);
    }
  }
  return served;
}

describe('adaptive selection', () => {
  it('follows the slot plan: one question at a time, and a passage as a block in pool order', () => {
    const p = adaptivePayload();
    const served = run(p, () => RIGHT);
    expect(served).toHaveLength(9);
    const types = served.map((id) => p.questions[id].type);
    expect(types).toEqual(['critical-reasoning', 'critical-reasoning', 'critical-reasoning', ...Array(3).fill('reading-comprehension'), 'critical-reasoning', 'critical-reasoning', 'critical-reasoning']);
    const block = served.slice(3, 6);
    expect(new Set(block.map((id) => (p.questions[id].stimulus as { id: string }).id)).size).toBe(1);
    expect(block).toEqual([...block].sort());
    expect(new Set(served).size).toBe(9);
  });

  it('starts at the middle difficulty and moves up after right answers and down after wrong ones', () => {
    const p = adaptivePayload();
    const up = run(p, () => RIGHT).map((id) => p.questions[id].difficulty);
    const down = run(p, () => WRONG).map((id) => p.questions[id].difficulty);
    expect(up[0]).toBe(3);
    expect(down[0]).toBe(3);
    expect(up[up.length - 1]).toBeGreaterThan(up[0]);
    expect(down[down.length - 1]).toBeLessThan(down[0]);
    expect(up.reduce((a, b) => a + b)).toBeGreaterThan(down.reduce((a, b) => a + b));
  });

  it('is repeatable for one attempt, and varies between attempts', () => {
    const p = adaptivePayload();
    expect(run(p, () => RIGHT, 7)).toEqual(run(p, () => RIGHT, 7));
    const routes = new Set(Array.from({ length: 12 }, (_, s) => run(p, () => RIGHT, seedFor(`attempt-${s}`, 's')).join()));
    expect(routes.size).toBeGreaterThan(1);
  });

  it('prefers a topic the section has not shown yet', () => {
    const p = adaptivePayload();
    const served = run(p, (x) => (x.difficulty >= 3 ? WRONG : RIGHT));
    const first = served.filter((id) => p.questions[id].type === 'critical-reasoning').slice(0, 3);
    expect(new Set(first.map((id) => p.questions[id].topics[0])).size).toBe(3);
  });

  it('reports the slot, target and length', () => {
    const p = adaptivePayload();
    expect(nextSlot(planOf(p), 0)).toBe(0);
    expect(nextSlot(planOf(p), 3)).toBe(3);
    expect(nextSlot(planOf(p), 6)).toBe(4);
    expect(nextSlot(planOf(p), 9)).toBeNull();
    expect(targetDifficulty(0)).toBe(3);
    expect(targetDifficulty(9)).toBe(5);
    expect(sectionLength(p, 's')).toBe(9);
  });

  it('can serve the whole pool in order, for checking every question on screen', () => {
    const p = servePoolInOrder(adaptivePayload());
    expect(p.sections[0].adaptive).toBeUndefined();
    expect(p.sections[0].questionIds).toHaveLength(40);
    expect(p.hash).not.toBe('h');
  });
});

describe('adaptive attempts', () => {
  const act = (a: Attempt, p: TestPayload, action: object, now: number) => reduce(a, { now, ...action } as never, p);

  function begin() {
    const p = adaptivePayload();
    let a = createAttempt(p, 'demo/mocks/adaptive-01', 0, 'attempt-1');
    a = act(a, p, { type: 'start', settings: { timed: true, explanations: 'end' } }, 0);
    a = act(a, p, { type: 'begin-section' }, 0);
    return { p, a };
  }

  it('requires an answer, never goes back, and serves the next question on Next', () => {
    const { p, a: started } = begin();
    const rules = rulesFor(p, started.settings);
    expect(rules.requireAnswer).toBe(true);
    expect(rules.allowBack).toBe(false);
    let a = started;
    expect(currentSection(a)!.questionIds).toHaveLength(1);
    a = act(a, p, { type: 'next' }, 1000);
    expect(currentSection(a)!.index).toBe(0);
    for (let i = 0; i < 9; i++) {
      a = act(a, p, { type: 'answer', value: RIGHT }, 1000 + i);
      a = act(a, p, { type: 'next' }, 1000 + i);
    }
    const sec = currentSection(a)!;
    expect(sec.questionIds).toHaveLength(9);
    expect(a.phase).toBe('review');
    expect(act(a, p, { type: 'back' }, 5000).phase).toBe('review');
  });

  it('serves the questions it never reached when time runs out, and counts them unanswered', () => {
    const { p, a: started } = begin();
    let a = act(started, p, { type: 'answer', value: RIGHT }, 1000);
    a = act(a, p, { type: 'next' }, 1000);
    a = act(a, p, { type: 'tick' }, 31 * MIN);
    expect(a.phase).toBe('results');
    const [section] = summarize(a, p);
    expect(section.total).toBe(9);
    expect(section.answered).toBe(1);
  });

  it("doesn't change which questions were served when an answer is changed in review", () => {
    const { p, a: started } = begin();
    let a = started;
    for (let i = 0; i < 9; i++) {
      a = act(a, p, { type: 'answer', value: RIGHT }, 1000 + i);
      a = act(a, p, { type: 'next' }, 1000 + i);
    }
    const before = [...currentSection(a)!.questionIds];
    a = act(a, p, { type: 'review-open', index: 0 }, 2000);
    a = act(a, p, { type: 'answer', value: WRONG }, 2001);
    a = act(a, p, { type: 'review-close' }, 2002);
    expect(currentSection(a)!.questionIds).toEqual(before);
  });
});

// ------------------------------------------------------------------ content checks

describe('adaptive mocks in content', () => {
  /** A tiny exam with one section and an adaptive plan of 2 Critical Reasoning questions and a 2-question passage. */
  function exam(pool: string[], extra: Record<string, string> = {}) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mv-adaptive-'));
    const dir = path.join(root, 'demo');
    const write = (file: string, text: string) => {
      fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
      fs.writeFileSync(path.join(dir, file), text);
    };
    write(
      'exam.yaml',
      `name: Demo
description: Demo
sections:
  - id: verbal
    name: Verbal
    shortName: V
    description: Verbal
    questionCount: 4
    timeMinutes: 10
    questionTypes: [critical-reasoning, reading-comprehension]
    score: { min: 60, max: 90 }
    topics: [{ id: t, name: T }]
    adaptive:
      slots:
        - { type: critical-reasoning, count: 2 }
        - { passage: 2 }
rules:
  sectionOrder: fixed
  requireAnswerToAdvance: true
  allowBackNavigation: false
  bookmarks: true
  reviewAndEdit: { enabled: true, maxAnswerChanges: 3 }
  optionalBreak: null
totalScore: { min: 205, max: 805, step: 10 }
`,
    );
    const mcq = (type: string, more = '') =>
      `---\ntype: ${type}\n${more}difficulty: 3\ntopics: [t]\norigin: original\nchoices: [a, b, c, d, e]\nanswer: A\n---\n\nStem?\n\n## Explanation\n\nBecause.\n`;
    for (let i = 1; i <= 5; i++) write(`questions/verbal/cr-000${i}.md`, mcq('critical-reasoning'));
    write('passages/rc-p001.md', '---\ntitle: P\n---\n\nText.\n');
    write('passages/rc-p002.md', '---\ntitle: Q\n---\n\nText.\n');
    for (const [id, p] of [['rc-0001', 'rc-p001'], ['rc-0002', 'rc-p001'], ['rc-0003', 'rc-p002'], ['rc-0004', 'rc-p002'], ['rc-0005', 'rc-p002']])
      write(`questions/verbal/${id}.md`, mcq('reading-comprehension', `passage: ${p}\n`));
    write('tests/adaptive/01.yaml', `title: Adaptive 1\nsections:\n  verbal: [${pool.join(', ')}]\n`);
    for (const [file, text] of Object.entries(extra)) write(file, text);
    const result = loadExam('demo', root);
    fs.rmSync(root, { recursive: true, force: true });
    return result;
  }
  const errors = (r: ReturnType<typeof exam>) => r.issues.filter((i) => i.level === 'error').map((i) => i.message);

  it('loads a valid pool as a mock that serves the section length', () => {
    const r = exam(['cr-0001', 'cr-0002', 'cr-0003', 'cr-0004', 'rc-0001', 'rc-0002']);
    expect(errors(r)).toEqual([]);
    const test = r.bundle!.mocks.find((m) => m.id === 'adaptive-01')!;
    expect(test.adaptive).toBe(true);
    expect(test.sections[0]).toMatchObject({ length: 4, questions: ['cr-0001', 'cr-0002', 'cr-0003', 'cr-0004', 'rc-0001', 'rc-0002'] });
  });

  it('rejects a pool that cannot fill the plan, or holds blocks the plan never serves', () => {
    expect(errors(exam(['cr-0001', 'rc-0001', 'rc-0002']))).toContain(
      'sections.verbal: the plan needs 2 × critical-reasoning question, but the pool has only 1',
    );
    expect(errors(exam(['cr-0001', 'cr-0002', 'rc-0003', 'rc-0004', 'rc-0005'])).join('\n')).toMatch(/passage "rc-p002" has 3 question\(s\)/);
  });

  it('rejects a question that is also in another mock', () => {
    const r = exam(['cr-0001', 'cr-0002', 'rc-0001', 'rc-0002'], { 'tests/mocks/01.yaml': 'title: M\nsections:\n  verbal: [cr-0001, cr-0003, rc-0003, rc-0004]\n' });
    expect(errors(r).join('\n')).toMatch(/used in more than one mock/);
  });

  it('expands { type, count } into single slots', () => {
    expect(expandSlots([{ type: 'critical-reasoning', count: 2 }, { passage: 3 }])).toHaveLength(3);
  });
});
