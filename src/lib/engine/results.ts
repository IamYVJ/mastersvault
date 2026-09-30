// Raw results for a finished (or partly finished) attempt.
import type { QuestionType } from '../content/schema.ts';
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
}

export function summarize(attempt: Attempt, payload: TestPayload): SectionResult[] {
  return attempt.order.map((id) => {
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
  });
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
