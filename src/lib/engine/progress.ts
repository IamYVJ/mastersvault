// Progress across all finished attempts, for the dashboard.
import type { Attempt } from './attempt.ts';
import { currentSection } from './attempt.ts';
import type { HistoryEntry, QuestionRecord } from './storage.ts';

export interface Totals {
  tests: number;
  mocks: number;
  questions: number;
  answered: number;
  correct: number;
  timeMs: number;
  latestMock: HistoryEntry | null;
}

export function totals(history: HistoryEntry[]): Totals {
  const sections = history.flatMap((h) => h.sections);
  const mocks = history.filter((h) => h.kind === 'mock' && h.estimate).sort((a, b) => b.finishedAt - a.finishedAt);
  return {
    tests: history.length,
    mocks: mocks.length,
    questions: sections.reduce((n, s) => n + s.total, 0),
    answered: sections.reduce((n, s) => n + s.answered, 0),
    correct: sections.reduce((n, s) => n + s.correct, 0),
    timeMs: sections.reduce((n, s) => n + s.timeMs, 0),
    latestMock: mocks[0] ?? null,
  };
}

export interface TrendPoint {
  /** Position in the chronological list of all finished attempts. */
  index: number;
  finishedAt: number;
  title: string;
  accuracy: number;
  correct: number;
  total: number;
}

export interface Trend {
  sectionId: string;
  name: string;
  points: TrendPoint[];
}

/** Accuracy per section over time, oldest first. Each attempt is one point per section it covered. */
export function sectionTrends(history: HistoryEntry[], sectionOrder: string[]): { trends: Trend[]; attempts: HistoryEntry[] } {
  const attempts = [...history].sort((a, b) => a.finishedAt - b.finishedAt);
  const bySection = new Map<string, Trend>();
  attempts.forEach((h, index) => {
    for (const s of h.sections) {
      if (!s.total) continue;
      const t = bySection.get(s.id) ?? { sectionId: s.id, name: s.name, points: [] };
      t.points.push({ index, finishedAt: h.finishedAt, title: h.title, accuracy: s.correct / s.total, correct: s.correct, total: s.total });
      bySection.set(s.id, t);
    }
  });
  const rank = (id: string) => (sectionOrder.includes(id) ? sectionOrder.indexOf(id) : sectionOrder.length);
  return { trends: [...bySection.values()].sort((a, b) => rank(a.sectionId) - rank(b.sectionId)), attempts };
}

export interface TopicStat {
  topic: string;
  section: string;
  total: number;
  correct: number;
  accuracy: number;
  avgTimeMs: number;
  avgTargetMs: number;
}

/** Accuracy per topic over every recorded question. Topics seen fewer than `min` times are left out. */
export function topicStats(history: HistoryEntry[], min = 2): TopicStat[] {
  const stats = new Map<string, { section: string; items: QuestionRecord[] }>();
  for (const h of history)
    for (const s of h.sections)
      for (const q of s.questions ?? [])
        for (const topic of q.topics) {
          const key = `${s.id}/${topic}`;
          const entry = stats.get(key) ?? { section: s.id, items: [] };
          entry.items.push(q);
          stats.set(key, entry);
        }
  return [...stats.entries()]
    .map(([key, { section, items }]) => {
      const correct = items.filter((q) => q.correct).length;
      return {
        topic: key.slice(section.length + 1),
        section,
        total: items.length,
        correct,
        accuracy: correct / items.length,
        avgTimeMs: items.reduce((n, q) => n + q.timeMs, 0) / items.length,
        avgTargetMs: items.reduce((n, q) => n + q.targetMs, 0) / items.length,
      };
    })
    .filter((t) => t.total >= min)
    .sort((a, b) => a.accuracy - b.accuracy || b.total - a.total);
}

export interface InProgress {
  testKey: string;
  title: string;
  kind: 'mock' | 'practice';
  startedAt: number;
  /** e.g. "Section 2 of 3 · Question 5 of 23" */
  where: string;
}

export function inProgress(attempts: Attempt[]): InProgress[] {
  return attempts
    .filter((a) => a.phase !== 'setup' && a.phase !== 'results')
    .map((a) => {
      const sec = currentSection(a);
      const parts: string[] = [];
      if (a.order.length > 1) parts.push(`Section ${a.current + 1} of ${a.order.length}`);
      if (sec && (a.phase === 'question' || a.phase === 'review')) parts.push(`Question ${sec.index + 1} of ${sec.questionIds.length}`);
      if (a.phase === 'break' || a.phase === 'break-offer') parts.push('On a break');
      if (a.phase === 'order' || (a.phase === 'section-intro' && a.current === 0)) parts.push('Not started');
      return { testKey: a.testKey, title: a.title, kind: a.kind, startedAt: a.createdAt, where: parts.join(' · ') };
    })
    .sort((a, b) => b.startedAt - a.startedAt);
}
