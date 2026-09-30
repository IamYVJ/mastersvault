import { describe, expect, it } from 'vitest';
import { type CalcState, type Key, format, initialCalc, press } from '../src/lib/engine/calculator.ts';
import { breakdowns, estimateAbility, estimateSection, estimateTotal, pacing } from '../src/lib/engine/scoring.ts';
import type { QuestionResult } from '../src/lib/engine/results.ts';

/** Types a sequence like "54000*0.14=" into the calculator. */
function type(keys: string, s: CalcState = initialCalc): CalcState {
  const map: Record<string, Key> = {
    '+': { type: 'op', op: '+' },
    '-': { type: 'op', op: '−' },
    '*': { type: 'op', op: '×' },
    '/': { type: 'op', op: '÷' },
    '=': { type: 'equals' },
    '.': { type: 'decimal' },
    '%': { type: 'percent' },
    r: { type: 'sqrt' },
    n: { type: 'sign' },
    i: { type: 'reciprocal' },
    b: { type: 'backspace' },
    c: { type: 'clear' },
    e: { type: 'clear-entry' },
    S: { type: 'memory', action: 'store' },
    R: { type: 'memory', action: 'recall' },
    P: { type: 'memory', action: 'add' },
  };
  for (const ch of keys) s = press(s, /\d/.test(ch) ? { type: 'digit', digit: ch } : map[ch]);
  return s;
}

describe('calculator', () => {
  it('does basic arithmetic', () => {
    expect(type('54000*0.14=').display).toBe('7560');
    expect(type('7560+1200=').display).toBe('8760');
    expect(type('10/4=').display).toBe('2.5');
  });

  it('executes immediately, like a desk calculator', () => {
    expect(type('2+3*4=').display).toBe('20');
  });

  it('hides floating-point noise', () => {
    expect(type('.1+.2=').display).toBe('0.3');
    expect(format(1 / 3)).toBe('0.333333333333');
  });

  it('repeats the last operation on repeated equals', () => {
    expect(type('5+2===').display).toBe('11');
  });

  it('replaces an operator pressed twice', () => {
    expect(type('8+-3=').display).toBe('5');
  });

  it('handles percent, square root, sign and reciprocal', () => {
    expect(type('50+10%=').display).toBe('55');
    expect(type('50*10%=').display).toBe('5');
    expect(type('144r').display).toBe('12');
    expect(type('5n').display).toBe('-5');
    expect(type('8i').display).toBe('0.125');
  });

  it('shows an error for division by zero and recovers on the next key', () => {
    const s = type('7/0=');
    expect(s.display).toBe('Error');
    expect(type('3+4=', s).display).toBe('7');
  });

  it('supports backspace, clear entry and memory', () => {
    expect(type('123b').display).toBe('12');
    expect(type('9+5e2=').display).toBe('11');
    const m = type('15Sc4*R=');
    expect(m.display).toBe('60');
    expect(type('10SPR').memory).toBe(20);
  });

  it('caps the number of digits', () => {
    expect(type('1234567890123456').display).toBe('123456789012');
  });
});

const q = (difficulty: number, correct: boolean, extra: Partial<QuestionResult> = {}): QuestionResult => ({
  id: `q${Math.random()}`,
  number: 1,
  type: 'problem-solving',
  difficulty,
  topics: ['algebra'],
  response: correct ? 0 : 1,
  answered: true,
  correct,
  timeMs: 120_000,
  targetMs: 120_000,
  bookmarked: false,
  edited: false,
  ...extra,
});

describe('score estimates', () => {
  const range = { min: 60, max: 90 };
  const section = (pattern: [number, boolean][]) => estimateSection(pattern.map(([d, c]) => q(d, c)), range);
  const mixed = [1, 2, 2, 3, 3, 3, 3, 4, 4, 5];

  it('rises with the number of correct answers', () => {
    const scores = [0, 3, 6, 10].map((n) => section(mixed.map((d, i) => [d, i < n])).score);
    expect(scores).toEqual([...scores].sort((a, b) => a - b));
    expect(scores[0]).toBeLessThan(scores[3]);
  });

  it('gives more credit for the same number correct on a harder set', () => {
    const easySet = section([1, 1, 2, 2, 2, 3, 3, 3, 3, 4].map((d, i) => [d, i < 6]));
    const hardSet = section([2, 3, 3, 3, 4, 4, 4, 5, 5, 5].map((d, i) => [d, i < 6]));
    expect(hardSet.score).toBeGreaterThan(easySet.score);
  });

  it('stays inside the scale and gives a range around the estimate', () => {
    for (const all of [true, false]) {
      const e = section(mixed.map((d) => [d, all]));
      expect(e.score).toBeGreaterThanOrEqual(60);
      expect(e.score).toBeLessThanOrEqual(90);
      expect(e.low).toBeLessThanOrEqual(e.score);
      expect(e.high).toBeGreaterThanOrEqual(e.score);
    }
    expect(estimateAbility([]).theta).toBe(0);
  });

  it('maps section estimates onto the total scale in steps', () => {
    const total = { min: 205, max: 805, step: 10 };
    const r = [range, range, range];
    expect(estimateTotal([60, 60, 60].map((s) => ({ score: s, low: s, high: s })), r, total).score).toBe(205);
    expect(estimateTotal([90, 90, 90].map((s) => ({ score: s, low: s, high: s })), r, total).score).toBe(805);
    const mid = estimateTotal([75, 75, 75].map((s) => ({ score: s, low: s, high: s })), r, total).score;
    expect(mid).toBe(505);
    expect((mid - 205) % 10).toBe(0);
  });
});

describe('breakdowns', () => {
  it('groups by type, topic and difficulty band', () => {
    const results = [q(1, true, { topics: ['a', 'b'] }), q(3, false, { topics: ['a'] }), q(5, true, { type: 'critical-reasoning', topics: ['b'] })];
    const b = breakdowns(results, { a: 'Topic A', b: 'Topic B' }, { 'problem-solving': 'PS', 'critical-reasoning': 'CR' } as never);
    expect(b.byType.map((r) => [r.label, r.correct, r.total])).toEqual([
      ['PS', 1, 2],
      ['CR', 1, 1],
    ]);
    expect(b.byTopic.find((r) => r.key === 'a')).toMatchObject({ label: 'Topic A', correct: 1, total: 2 });
    expect(b.byDifficulty.map((r) => r.key)).toEqual(['easier', 'medium', 'harder']);
  });

  it('flags slow and rushed questions', () => {
    expect(pacing(q(3, true, { timeMs: 200_000 }))).toBe('slow');
    expect(pacing(q(3, false, { timeMs: 20_000 }))).toBe('rushed');
    expect(pacing(q(3, true, { timeMs: 20_000 }))).toBeNull();
  });
});
