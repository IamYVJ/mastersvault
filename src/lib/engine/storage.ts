// Attempts live in this browser only. Every access is guarded: storage can be
// missing or throw (private windows, blocked site data), and the player must
// still work, just without saving.
import type { QuestionType } from '../content/schema.ts';
import type { TestPayload } from '../content/types.ts';
import type { Attempt } from './attempt.ts';
import { summarize } from './results.ts';
import { scoreEstimates, type Estimate } from './scoring.ts';

export const STORAGE_PREFIX = 'mv:';
const ATTEMPT_PREFIX = 'mv:attempt:';
const HISTORY_KEY = 'mv:history';
export const HISTORY_LIMIT = 200;

/** Per-question outcome kept with each finished attempt, for trends and topic stats. */
export interface QuestionRecord {
  id: string;
  type: QuestionType;
  difficulty: number;
  topics: string[];
  answered: boolean;
  correct: boolean;
  timeMs: number;
  targetMs: number;
}

export interface SectionRecord {
  id: string;
  name: string;
  total: number;
  answered: number;
  correct: number;
  timeMs: number;
  limitMs: number | null;
  questions?: QuestionRecord[];
}

export interface HistoryEntry {
  id: string;
  testKey: string;
  title: string;
  kind: 'mock' | 'practice';
  settings: Attempt['settings'];
  startedAt: number;
  finishedAt: number;
  sections: SectionRecord[];
  /** Mocks only: unofficial estimates at the time the attempt was finished. */
  estimate?: { total: Estimate; sections: Estimate[] };
  attempt: Attempt;
}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function loadAttempt(testKey: string): Attempt | null {
  const a = read<Attempt>(ATTEMPT_PREFIX + testKey);
  return a && a.version === 1 && a.testKey === testKey ? a : null;
}

export function saveAttempt(attempt: Attempt): boolean {
  return write(ATTEMPT_PREFIX + attempt.testKey, attempt);
}

export function clearAttempt(testKey: string) {
  try {
    localStorage.removeItem(ATTEMPT_PREFIX + testKey);
  } catch {
    /* storage unavailable */
  }
}

/** Every attempt saved in this browser (one per test), finished or not. */
export function listAttempts(): Attempt[] {
  const out: Attempt[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(ATTEMPT_PREFIX)) continue;
      const a = read<Attempt>(key);
      if (a && a.version === 1 && key === ATTEMPT_PREFIX + a.testKey) out.push(a);
    }
  } catch {
    /* storage unavailable */
  }
  return out;
}

export function loadHistory(): HistoryEntry[] {
  const h = read<HistoryEntry[]>(HISTORY_KEY);
  return Array.isArray(h) ? h : [];
}

export function saveHistory(history: HistoryEntry[]): boolean {
  const sorted = [...history].sort((a, b) => b.finishedAt - a.finishedAt).slice(0, HISTORY_LIMIT);
  return write(HISTORY_KEY, sorted);
}

export function buildHistoryEntry(attempt: Attempt, payload: TestPayload): HistoryEntry | null {
  if (attempt.finishedAt === null) return null;
  const results = summarize(attempt, payload);
  const estimates = scoreEstimates(payload, results);
  return {
    id: attempt.id,
    testKey: attempt.testKey,
    title: attempt.title,
    kind: attempt.kind,
    settings: attempt.settings,
    startedAt: attempt.createdAt,
    finishedAt: attempt.finishedAt,
    sections: results.map((s) => ({
      id: s.id,
      name: s.name,
      total: s.total,
      answered: s.answered,
      correct: s.correct,
      timeMs: s.timeMs,
      limitMs: s.limitMs,
      questions: s.questions.map((q) => ({
        id: q.id,
        type: q.type,
        difficulty: q.difficulty,
        topics: q.topics,
        answered: q.answered,
        correct: q.correct,
        timeMs: q.timeMs,
        targetMs: q.targetMs,
      })),
    })),
    estimate: estimates ?? undefined,
    attempt,
  };
}

/** Adds a finished attempt to the history (once per attempt id). */
export function recordAttempt(attempt: Attempt, payload: TestPayload): boolean {
  const entry = buildHistoryEntry(attempt, payload);
  if (!entry) return false;
  return saveHistory([entry, ...loadHistory().filter((h) => h.id !== attempt.id)]);
}

/** Removes everything MastersVault has stored in this browser. */
export function clearAllData() {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) keys.push(key);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* storage unavailable */
  }
}
