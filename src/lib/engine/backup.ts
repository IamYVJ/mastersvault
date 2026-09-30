// Export and import of everything saved in this browser, as a JSON file.
// Imports are checked field by field; anything malformed is skipped, never trusted.
import type { Attempt } from './attempt.ts';
import { HISTORY_LIMIT, type HistoryEntry } from './storage.ts';

export const BACKUP_FORMAT = 'mastersvault-backup';

export interface Backup {
  format: typeof BACKUP_FORMAT;
  version: 1;
  exportedAt: number;
  history: HistoryEntry[];
  attempts: Attempt[];
}

const PHASES = new Set(['setup', 'order', 'section-intro', 'question', 'review', 'break-offer', 'break', 'results']);
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length < 500;
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export function isAttempt(v: unknown): v is Attempt {
  if (!isObj(v) || v.version !== 1 || !isStr(v.id) || !isStr(v.testKey) || !isStr(v.title)) return false;
  if (v.kind !== 'mock' && v.kind !== 'practice') return false;
  if (!isStr(v.phase) || !PHASES.has(v.phase) || !isNum(v.createdAt) || !isNum(v.lastTick) || !isNum(v.current)) return false;
  if (!Array.isArray(v.order) || !v.order.every(isStr) || !isObj(v.sections)) return false;
  const sections = v.sections as Record<string, unknown>;
  if (!v.order.every((id) => isObj(sections[id as string]))) return false;
  return Object.values(sections).every(
    (s) =>
      isObj(s) &&
      Array.isArray(s.questionIds) &&
      s.questionIds.every(isStr) &&
      isObj(s.responses) &&
      isObj(s.timeMs) &&
      Array.isArray(s.bookmarks) &&
      Array.isArray(s.edited) &&
      Array.isArray(s.checked) &&
      isNum(s.elapsedMs) &&
      isNum(s.index),
  );
}

export function isHistoryEntry(v: unknown): v is HistoryEntry {
  if (!isObj(v) || !isStr(v.id) || !isStr(v.testKey) || !isStr(v.title)) return false;
  if ((v.kind !== 'mock' && v.kind !== 'practice') || !isNum(v.startedAt) || !isNum(v.finishedAt)) return false;
  if (!Array.isArray(v.sections)) return false;
  const sectionsOk = v.sections.every(
    (s) =>
      isObj(s) &&
      isStr(s.id) &&
      isStr(s.name) &&
      [s.total, s.answered, s.correct, s.timeMs].every(isNum) &&
      (s.questions === undefined ||
        (Array.isArray(s.questions) &&
          s.questions.every((q) => isObj(q) && isStr(q.id) && Array.isArray(q.topics) && q.topics.every(isStr) && isNum(q.timeMs) && typeof q.correct === 'boolean'))),
  );
  return sectionsOk && isAttempt(v.attempt) && (v.attempt as Attempt).id === v.id;
}

export function makeBackup(history: HistoryEntry[], attempts: Attempt[], now: number): Backup {
  return { format: BACKUP_FORMAT, version: 1, exportedAt: now, history, attempts };
}

/** Parses a backup file. Throws with a readable message if it isn't one. */
export function parseBackup(text: string): { backup: Backup; skipped: number } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("This file isn't valid JSON.");
  }
  if (!isObj(data) || data.format !== BACKUP_FORMAT) throw new Error("This doesn't look like a MastersVault backup file.");
  if (data.version !== 1) throw new Error('This backup was made by a newer version of MastersVault.');
  const rawHistory = Array.isArray(data.history) ? data.history : [];
  const rawAttempts = Array.isArray(data.attempts) ? data.attempts : [];
  const history = rawHistory.filter(isHistoryEntry);
  const attempts = rawAttempts.filter(isAttempt);
  return {
    backup: makeBackup(history, attempts, isNum(data.exportedAt) ? data.exportedAt : 0),
    skipped: rawHistory.length - history.length + (rawAttempts.length - attempts.length),
  };
}

export interface MergeResult {
  history: HistoryEntry[];
  attempts: Attempt[];
  addedHistory: number;
  restoredAttempts: number;
  keptLocalAttempts: number;
}

/**
 * Merges a backup into local data. History is combined by attempt id. An
 * in-progress attempt is restored only if this browser has no unfinished
 * attempt of its own for the same test.
 */
export function mergeBackup(local: { history: HistoryEntry[]; attempts: Attempt[] }, backup: Backup): MergeResult {
  const known = new Set(local.history.map((h) => h.id));
  const incoming = backup.history.filter((h) => !known.has(h.id));
  const history = [...local.history, ...incoming].sort((a, b) => b.finishedAt - a.finishedAt).slice(0, HISTORY_LIMIT);

  const localByTest = new Map(local.attempts.map((a) => [a.testKey, a]));
  const attempts: Attempt[] = [];
  let kept = 0;
  for (const a of backup.attempts) {
    if (a.phase === 'setup') continue;
    const mine = localByTest.get(a.testKey);
    if (mine && mine.id === a.id) {
      // The same attempt: keep whichever copy was saved last.
      if (a.lastTick <= mine.lastTick) continue;
    } else if (mine && mine.phase !== 'setup') {
      if (mine.phase !== 'results') {
        kept += 1; // never overwrite an unfinished attempt in this browser
        continue;
      }
      // Both finished: keep the more recent results on the test's page.
      if (a.phase === 'results' && (a.finishedAt ?? 0) <= (mine.finishedAt ?? 0)) continue;
    }
    attempts.push(a);
  }
  return { history, attempts, addedHistory: incoming.length, restoredAttempts: attempts.length, keptLocalAttempts: kept };
}
