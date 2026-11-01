// Raw results for a finished (or partly finished) attempt.
import type { QuestionType, Tier } from '../content/schema.ts';
import type { ResponseValue, TestPayload } from '../content/types.ts';
import type { Attempt } from './attempt.ts';
import { isComplete, isCorrect } from './grading.ts';

export interface QuestionResult {
  id: string;
  number: number;
  type: QuestionType;
  difficulty: number;
  topics: string[];
  response: ResponseValue;
  answered: boolean;
  correct: boolean;
  timeMs: number;
  targetMs: number;
  bookmarked: boolean;
  edited: boolean;
}

export interface SectionResult {
  id: string;
  name: string;
  total: number;
  answered: number;
  correct: number;
  timeMs: number;
  limitMs: number | null;
  endedBy?: 'time' | 'submit';
  questions: QuestionResult[];
  /** A two-part measure: each timed part, and which version of the second part was served. */
  parts?: { id: string; part: 1 | 2; tier?: Tier; total: number; correct: number; timeMs: number; limitMs: number | null; endedBy?: 'time' | 'submit' }[];
}

/**
 * Results by section, in the order taken. The two parts of a measure are reported together, as one
 * section with the measure's id, because the measure is what gets a score.
 */
export function summarize(attempt: Attempt, payload: TestPayload): SectionResult[] {
  const out: SectionResult[] = [];
  for (const part of attempt.order.map((id) => summarizePart(attempt, payload, id))) {
    const measure = payload.sections.find((s) => s.id === part.id)!.measure;
    if (!measure) {
      out.push(part);
      continue;
    }
    const tier = attempt.sections[part.id].tier;
    const entry = { id: part.id, part: measure.part, ...(tier && { tier }), total: part.total, correct: part.correct, timeMs: part.timeMs, limitMs: part.limitMs, endedBy: part.endedBy };
    const merged = out.find((r) => r.id === measure.id);
    if (!merged) {
      out.push({ ...part, id: measure.id, name: measure.name, parts: [entry] });
      continue;
    }
    const offset = merged.questions.length;
    merged.questions.push(...part.questions.map((q) => ({ ...q, number: q.number + offset })));
    merged.total += part.total;
    merged.answered += part.answered;
    merged.correct += part.correct;
    merged.timeMs += part.timeMs;
    merged.limitMs = merged.limitMs === null || part.limitMs === null ? null : merged.limitMs + part.limitMs;
    if (part.endedBy === 'time') merged.endedBy = 'time';
    merged.parts!.push(entry);
  }
  return out;
}

function summarizePart(attempt: Attempt, payload: TestPayload, id: string): SectionResult {
  const sec = attempt.sections[id];
  const meta = payload.sections.find((s) => s.id === id)!;
  const questions = sec.questionIds.map((qid, i): QuestionResult => {
    const q = payload.questions[qid];
    const response = sec.responses[qid] ?? null;
    return {
      id: qid,
      number: i + 1,
      type: q.type,
      difficulty: q.difficulty,
      topics: q.topics,
      response,
      answered: isComplete(q.response, response),
      correct: isCorrect(q.response, response),
      timeMs: sec.timeMs[qid] ?? 0,
      targetMs: q.targetSeconds * 1000,
      bookmarked: sec.bookmarks.includes(qid),
      edited: sec.edited.includes(qid),
    };
  });
  return {
    id,
    name: meta.name,
    total: questions.length,
    answered: questions.filter((q) => q.answered).length,
    correct: questions.filter((q) => q.correct).length,
    timeMs: sec.elapsedMs,
    limitMs: sec.limitMs,
    endedBy: sec.endedBy,
    questions,
  };
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
