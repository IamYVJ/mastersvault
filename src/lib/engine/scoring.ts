// Unofficial score estimates and performance breakdowns.
//
// The real exam is computer-adaptive and its scoring model is not public, so
// this is deliberately simple and always shown as a rough estimate with a range:
//  - Each question's difficulty (1–5) becomes a Rasch item difficulty b = d − 3.
//  - Ability θ is the maximum a posteriori estimate under a standard-normal prior
//    (unanswered questions count as incorrect).
//  - θ maps linearly onto the section scale, θ = ±3 → the ends of the range,
//    and the range shown is ±1 standard error.
//  - The total is a linear rescaling of the sum of section estimates.
// Under this model the estimate depends on how many questions were answered
// correctly and on how hard the whole set was, not on which ones were right.
import type { QuestionType } from '../content/schema.ts';
import type { TestPayload } from '../content/types.ts';
import type { QuestionResult, SectionResult } from './results.ts';

export interface Estimate {
  score: number;
  low: number;
  high: number;
}

const THETA_SPAN = 3;

export function estimateAbility(items: { difficulty: number; correct: boolean }[]): { theta: number; se: number } {
  let theta = 0;
  let info = 1;
  for (let i = 0; i < 50; i++) {
    let gradient = -theta; // from the N(0, 1) prior
    info = 1;
    for (const item of items) {
      const p = 1 / (1 + Math.exp(-(theta - (item.difficulty - 3))));
      gradient += (item.correct ? 1 : 0) - p;
      info += p * (1 - p);
    }
    const step = gradient / info;
    theta = Math.max(-5, Math.min(5, theta + step));
    if (Math.abs(step) < 1e-6) break;
  }
  return { theta, se: 1 / Math.sqrt(info) };
}

export function estimateSection(questions: QuestionResult[], range: { min: number; max: number }): Estimate {
  const { theta, se } = estimateAbility(questions);
  const mid = (range.min + range.max) / 2;
  const perTheta = (range.max - range.min) / (2 * THETA_SPAN);
  const clamp = (x: number) => Math.round(Math.max(range.min, Math.min(range.max, x)));
  return {
    score: clamp(mid + theta * perTheta),
    low: clamp(mid + (theta - se) * perTheta),
    high: clamp(mid + (theta + se) * perTheta),
  };
}

export function estimateTotal(
  sections: Estimate[],
  ranges: { min: number; max: number }[],
  total: { min: number; max: number; step: number },
): Estimate {
  const sumMin = ranges.reduce((n, r) => n + r.min, 0);
  const sumMax = ranges.reduce((n, r) => n + r.max, 0);
  const scale = (sum: number) => {
    const raw = total.min + ((sum - sumMin) / (sumMax - sumMin || 1)) * (total.max - total.min);
    const stepped = total.min + Math.round((raw - total.min) / total.step) * total.step;
    return Math.max(total.min, Math.min(total.max, stepped));
  };
  const sum = (key: keyof Estimate) => sections.reduce((n, s) => n + s[key], 0);
  return { score: scale(sum('score')), low: scale(sum('low')), high: scale(sum('high')) };
}

/** Estimates are only meaningful for full-length sections. */
export function scoreEstimates(payload: TestPayload, results: SectionResult[]) {
  if (payload.test.kind !== 'mock') return null;
  const ranges = results.map((r) => payload.sections.find((s) => s.id === r.id)!.score);
  const sections = results.map((r, i) => estimateSection(r.questions, ranges[i]));
  return { sections, total: estimateTotal(sections, ranges, payload.exam.totalScore) };
}

// ----------------------------------------------------------------- breakdowns

export interface BreakdownRow {
  key: string;
  label: string;
  total: number;
  correct: number;
  answered: number;
  timeMs: number;
  targetMs: number;
}

function group(questions: QuestionResult[], keysOf: (q: QuestionResult) => string[], label: (k: string) => string, order?: string[]) {
  const rows = new Map<string, BreakdownRow>();
  for (const q of questions) {
    for (const key of keysOf(q)) {
      const row = rows.get(key) ?? { key, label: label(key), total: 0, correct: 0, answered: 0, timeMs: 0, targetMs: 0 };
      row.total += 1;
      row.correct += q.correct ? 1 : 0;
      row.answered += q.answered ? 1 : 0;
      row.timeMs += q.timeMs;
      row.targetMs += q.targetMs;
      rows.set(key, row);
    }
  }
  const list = [...rows.values()];
  return order ? list.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key)) : list.sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
}

export const DIFFICULTY_BANDS = [
  { key: 'easier', label: 'Easier (1–2)', test: (d: number) => d <= 2 },
  { key: 'medium', label: 'Medium (3)', test: (d: number) => d === 3 },
  { key: 'harder', label: 'Harder (4–5)', test: (d: number) => d >= 4 },
];

export function breakdowns(questions: QuestionResult[], topicNames: Record<string, string>, typeLabels: Record<QuestionType, string>) {
  return {
    byType: group(questions, (q) => [q.type], (k) => typeLabels[k as QuestionType] ?? k),
    byTopic: group(questions, (q) => q.topics, (k) => topicNames[k] ?? k),
    byDifficulty: group(
      questions,
      (q) => [DIFFICULTY_BANDS.find((b) => b.test(q.difficulty))!.key],
      (k) => DIFFICULTY_BANDS.find((b) => b.key === k)!.label,
      DIFFICULTY_BANDS.map((b) => b.key),
    ),
  };
}

/** Pacing flags: well over the target time, or rushed and wrong. */
export function pacing(q: QuestionResult): 'slow' | 'rushed' | null {
  if (q.timeMs > q.targetMs * 1.5) return 'slow';
  if (q.answered && !q.correct && q.timeMs < q.targetMs * 0.35) return 'rushed';
  return null;
}
