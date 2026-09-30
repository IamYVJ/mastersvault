import { describe, expect, it } from 'vitest';
import type { RenderedQuestion, TestPayload } from '../src/lib/content/types.ts';
import {
  type Action,
  type ActionInput,
  type Attempt,
  activeQuestionId,
  canEdit,
  changesLeft,
  createAttempt,
  currentSection,
  reduce,
  rulesFor,
  sectionRemaining,
} from '../src/lib/engine/attempt.ts';
import { summarize } from '../src/lib/engine/results.ts';

const MIN = 60_000;

function q(id: string, section: string, answer = 0): RenderedQuestion {
  return {
    id,
    type: 'problem-solving',
    section,
    difficulty: 3,
    topics: ['t'],
    targetSeconds: 120,
    stem: '',
    explanation: '',
    response: { kind: 'choice', choices: ['a', 'b', 'c', 'd', 'e'], answer },
  };
}

function payload(kind: 'mock' | 'practice', sections: [string, number, number][]): TestPayload {
  const questions: Record<string, RenderedQuestion> = {};
  const secs = sections.map(([id, count, minutes]) => {
    const ids = Array.from({ length: count }, (_, i) => `${id}-${i + 1}`);
    ids.forEach((qid) => (questions[qid] = q(qid, id)));
    return { id, name: id.toUpperCase(), shortName: id, timeMinutes: minutes, tools: [], score: { min: 60, max: 90 }, questionIds: ids };
  });
  return {
    version: 1,
    hash: 'h',
    exam: {
      id: 'demo',
      name: 'Demo',
      rules: {
        sectionOrder: 'choose',
        requireAnswerToAdvance: true,
        allowBackNavigation: false,
        bookmarks: true,
        reviewAndEdit: { enabled: true, maxAnswerChanges: 3 },
        optionalBreak: { minutes: 10, allowedAfterSection: [1, 2] },
      },
      totalScore: { min: 205, max: 805, step: 10 },
    },
    test: { id: 't', kind, title: 'T' },
    sections: secs,
    topics: { t: 'Topic' },
    questions,
    passages: {},
    sources: {},
  };
}

/** Applies actions in sequence, advancing a fake clock by `dt` ms before each. */
function run(p: TestPayload, a: Attempt, steps: (ActionInput & { dt?: number })[], start = a.lastTick) {
  let now = start;
  for (const { dt = 1000, ...step } of steps) {
    now += dt;
    a = reduce(a, { ...step, now } as Action, p);
  }
  return a;
}

const mock = payload('mock', [
  ['q', 4, 10],
  ['v', 2, 12],
  ['d', 2, 12],
]);

describe('mock flow', () => {
  it('asks for a section order, then runs sections in that order', () => {
    let a = createAttempt(mock, 'demo/mocks/t', 0);
    a = run(mock, a, [{ type: 'start', settings: { timed: true, explanations: 'end' } }]);
    expect(a.phase).toBe('order');
    a = run(mock, a, [{ type: 'choose-order', order: ['v', 'q', 'd'] }, { type: 'begin-section' }]);
    expect(a.phase).toBe('question');
    expect(activeQuestionId(a)).toBe('v-1');
  });

  it('rejects an order that is not a permutation of the sections', () => {
    let a = run(mock, createAttempt(mock, 'k', 0), [{ type: 'start', settings: { timed: true, explanations: 'end' } }]);
    a = run(mock, a, [{ type: 'choose-order', order: ['v', 'v', 'd'] }]);
    expect(a.phase).toBe('order');
  });

  it('requires an answer before moving on and never goes back', () => {
    let a = run(mock, createAttempt(mock, 'k', 0), [
      { type: 'start', settings: { timed: true, explanations: 'end' } },
      { type: 'choose-order', order: ['q', 'v', 'd'] },
      { type: 'begin-section' },
      { type: 'next' },
    ]);
    expect(currentSection(a)!.index).toBe(0);
    a = run(mock, a, [{ type: 'answer', value: 2 }, { type: 'next' }, { type: 'back' }]);
    expect(currentSection(a)!.index).toBe(1);
  });

  it('limits review & edit to three changed answers', () => {
    let a = run(mock, createAttempt(mock, 'k', 0), [
      { type: 'start', settings: { timed: true, explanations: 'end' } },
      { type: 'choose-order', order: ['q', 'v', 'd'] },
      { type: 'begin-section' },
      ...[0, 1, 2, 3].flatMap(() => [{ type: 'answer' as const, value: 1 }, { type: 'next' as const }]),
    ]);
    expect(a.phase).toBe('review');
    const rules = rulesFor(mock, a.settings);
    for (const i of [0, 1, 2]) {
      a = run(mock, a, [{ type: 'review-open', index: i }, { type: 'answer', value: 0 }, { type: 'answer', value: 3 }, { type: 'review-close' }]);
    }
    expect(changesLeft(a, rules)).toBe(0);
    a = run(mock, a, [{ type: 'review-open', index: 3 }]);
    expect(canEdit(a, rules)).toBe(false);
    a = run(mock, a, [{ type: 'answer', value: 0 }]);
    expect(currentSection(a)!.responses['q-4']).toBe(1);
    // An already-changed question can still be changed again.
    a = run(mock, a, [{ type: 'review-open', index: 0 }, { type: 'answer', value: 4 }]);
    expect(currentSection(a)!.responses['q-1']).toBe(4);
  });

  it('offers one optional break, after section 1 or 2', () => {
    let a = run(mock, createAttempt(mock, 'k', 0), [
      { type: 'start', settings: { timed: true, explanations: 'end' } },
      { type: 'choose-order', order: ['v', 'q', 'd'] },
      { type: 'begin-section' },
      { type: 'answer', value: 0 },
      { type: 'next' },
      { type: 'answer', value: 0 },
      { type: 'next' },
      { type: 'finish-section' },
    ]);
    expect(a.phase).toBe('break-offer');
    a = run(mock, a, [{ type: 'skip-break' }]);
    expect(a.phase).toBe('section-intro');
    expect(a.order[a.current]).toBe('q');
    a = run(mock, a, [
      { type: 'begin-section' },
      ...[0, 1, 2, 3].flatMap(() => [{ type: 'answer' as const, value: 0 }, { type: 'next' as const }]),
      { type: 'finish-section' },
    ]);
    expect(a.phase).toBe('break-offer');
    a = run(mock, a, [{ type: 'take-break' }]);
    expect(a.phase).toBe('break');
    // The break ends by itself after 10 minutes.
    a = run(mock, a, [{ type: 'tick', dt: 10 * MIN }]);
    expect(a.phase).toBe('section-intro');
    expect(a.order[a.current]).toBe('d');
  });

  it('ends the section when time runs out, keeping answers given so far', () => {
    let a = run(mock, createAttempt(mock, 'k', 0), [
      { type: 'start', settings: { timed: true, explanations: 'end' } },
      { type: 'choose-order', order: ['q', 'v', 'd'] },
      { type: 'begin-section' },
      { type: 'answer', value: 0 },
      { type: 'next' },
    ]);
    a = run(mock, a, [{ type: 'tick', dt: 5 * MIN }]);
    expect(a.alert).toEqual({ kind: 'five-minutes' });
    a = run(mock, a, [{ type: 'dismiss-alert' }, { type: 'tick', dt: 6 * MIN }]);
    expect(a.alert).toEqual({ kind: 'time-up', section: 'q' });
    expect(a.sections.q.status).toBe('done');
    expect(a.sections.q.endedBy).toBe('time');
    expect(a.sections.q.elapsedMs).toBe(10 * MIN);
    const q = summarize(a, mock)[0];
    expect(q).toMatchObject({ total: 4, answered: 1, correct: 1 });
  });

  it('does not count time while the page was closed', () => {
    let a = run(mock, createAttempt(mock, 'k', 0), [
      { type: 'start', settings: { timed: true, explanations: 'end' } },
      { type: 'choose-order', order: ['q', 'v', 'd'] },
      { type: 'begin-section', dt: 0 },
      { type: 'tick', dt: 2 * MIN },
    ]);
    const before = sectionRemaining(a.sections.q, a.lastTick)!;
    a = reduce(a, { type: 'resume', now: a.lastTick + 60 * MIN }, mock);
    expect(sectionRemaining(a.sections.q, a.lastTick)).toBe(before);
    expect(a.alert).toEqual({ kind: 'resumed' });
    // The clock stays paused until the welcome-back message is dismissed.
    a = run(mock, a, [{ type: 'tick', dt: 30_000 }]);
    expect(sectionRemaining(a.sections.q, a.lastTick)).toBe(before);
    a = run(mock, a, [{ type: 'dismiss-alert', dt: 0 }, { type: 'tick', dt: MIN }]);
    expect(sectionRemaining(a.sections.q, a.lastTick)).toBe(before - MIN);
  });

  it('records time spent on each question', () => {
    const a = run(mock, createAttempt(mock, 'k', 0), [
      { type: 'start', settings: { timed: true, explanations: 'end' } },
      { type: 'choose-order', order: ['q', 'v', 'd'] },
      { type: 'begin-section', dt: 0 },
      { type: 'answer', value: 0, dt: 30_000 },
      { type: 'next', dt: 15_000 },
      { type: 'answer', value: 0, dt: 70_000 },
      { type: 'next', dt: 0 },
    ]);
    expect(a.sections.q.timeMs).toEqual({ 'q-1': 45_000, 'q-2': 70_000 });
  });
});

describe('practice flow', () => {
  const practice = payload('practice', [['q', 3, 6]]);

  it('allows going back and skipping, and never times out when untimed', () => {
    let a = run(practice, createAttempt(practice, 'k', 0), [
      { type: 'start', settings: { timed: false, explanations: 'end' } },
      { type: 'begin-section' },
      { type: 'next' },
      { type: 'next' },
      { type: 'back' },
      { type: 'tick', dt: 600 * MIN },
    ]);
    expect(a.phase).toBe('question');
    expect(currentSection(a)!.index).toBe(1);
    expect(sectionRemaining(a.sections.q, a.lastTick)).toBeNull();
    a = run(practice, a, [{ type: 'open-review' }, { type: 'finish-section' }]);
    expect(a.phase).toBe('results');
    expect(a.finishedAt).not.toBeNull();
  });

  it('locks an answer once it has been checked in explain-each mode', () => {
    let a = run(practice, createAttempt(practice, 'k', 0), [
      { type: 'start', settings: { timed: true, explanations: 'each' } },
      { type: 'begin-section' },
      { type: 'check' },
    ]);
    expect(a.sections.q.checked).toEqual([]);
    a = run(practice, a, [{ type: 'answer', value: 3 }, { type: 'check' }, { type: 'answer', value: 0 }]);
    expect(a.sections.q.checked).toEqual(['q-1']);
    expect(a.sections.q.responses['q-1']).toBe(3);
  });
});
