import { describe, expect, it } from 'vitest';
import type { ResponseSpec } from '../src/lib/content/types.ts';
import { correctResponse, emptyResponse, isComplete, isCorrect } from '../src/lib/engine/grading.ts';

const choice: ResponseSpec = { kind: 'choice', choices: ['a', 'b', 'c', 'd', 'e'], answer: 2 };
const dich: ResponseSpec = {
  kind: 'dichotomous',
  labels: ['Yes', 'No'],
  statements: [
    { html: 's1', answer: 1 },
    { html: 's2', answer: 0 },
    { html: 's3', answer: 1 },
  ],
};
const drops: ResponseSpec = {
  kind: 'dropdowns',
  statements: [
    { before: 'x', after: '', options: ['1', '2'], answer: 1 },
    { before: 'y', after: '', options: ['3', '4', '5'], answer: 0 },
  ],
};
const twoPart: ResponseSpec = { kind: 'two-part', columns: ['A', 'B'], options: ['1', '2', '3'], answer: [2, 2] };

describe('grading', () => {
  it('starts every response empty and incomplete', () => {
    for (const spec of [choice, dich, drops, twoPart]) {
      expect(isComplete(spec, emptyResponse(spec))).toBe(false);
      expect(isCorrect(spec, emptyResponse(spec))).toBe(false);
    }
  });

  it('grades single choice', () => {
    expect(isCorrect(choice, 2)).toBe(true);
    expect(isCorrect(choice, 0)).toBe(false);
  });

  it('requires every part of a multi-part answer to be correct', () => {
    expect(isCorrect(dich, [1, 0, 1])).toBe(true);
    expect(isCorrect(dich, [1, 0, 0])).toBe(false);
    expect(isComplete(dich, [1, null, 1])).toBe(false);
    expect(isCorrect(drops, [1, 0])).toBe(true);
    expect(isCorrect(drops, [1, 1])).toBe(false);
  });

  it('allows both two-part columns to pick the same option', () => {
    expect(isCorrect(twoPart, [2, 2])).toBe(true);
    expect(isCorrect(twoPart, [2, 1])).toBe(false);
  });

  it('round-trips the correct response', () => {
    for (const spec of [choice, dich, drops, twoPart]) expect(isCorrect(spec, correctResponse(spec))).toBe(true);
  });
});
