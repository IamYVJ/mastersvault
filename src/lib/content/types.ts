// Types for the compiled test payload that the browser receives, plus the
// response model the test engine and question views agree on.
import type { Chart, ExamConfig, QuestionType, Tool } from './schema.ts';

/** HTML produced at build time from trusted Markdown (raw HTML is not allowed in sources). */
export type Html = string;

export interface TableCell {
  display: string;
  /** Sort key: numbers for numeric columns, lower-cased text otherwise. */
  value: number | string;
}

export interface RenderedTable {
  caption?: string;
  columns: { label: string; type: 'text' | 'number' }[];
  rows: TableCell[][];
}

/** What sits beside or above the question: a shared passage, tabbed sources, a table, or a chart. */
export type Stimulus =
  | { kind: 'passage'; id: string }
  | { kind: 'sources'; id: string }
  | { kind: 'table'; table: RenderedTable }
  | { kind: 'chart'; chart: Chart };

/** How the test taker answers. Every question type maps onto one of these four shapes. */
export type ResponseSpec =
  | { kind: 'choice'; choices: Html[]; answer: number }
  | { kind: 'dichotomous'; labels: [string, string]; statements: { html: Html; answer: 0 | 1 }[] }
  | { kind: 'dropdowns'; statements: { before: Html; after: Html; options: string[]; answer: number }[] }
  | { kind: 'two-part'; columns: [Html, Html]; options: Html[]; answer: [number, number] };

export interface RenderedQuestion {
  id: string;
  type: QuestionType;
  section: string;
  difficulty: number;
  topics: string[];
  targetSeconds: number;
  stem: Html;
  explanation: Html;
  stimulus?: Stimulus;
  response: ResponseSpec;
}

export interface RenderedPassage {
  title?: string;
  html: Html;
}

export interface RenderedSourceSet {
  title?: string;
  tabs: { title: string; html?: Html; chart?: Chart }[];
}

/**
 * A response value. Shape depends on ResponseSpec.kind:
 * - choice:      number (index into choices)
 * - dichotomous: (0 | 1 | null)[] (one per statement, index into labels)
 * - dropdowns:   (number | null)[] (one per statement, index into its options)
 * - two-part:    [number | null, number | null] (index into options, per column)
 */
export type ResponseValue = number | (number | null)[] | null;

export interface PayloadSection {
  id: string;
  name: string;
  shortName: string;
  timeMinutes: number;
  tools: Tool[];
  score: { min: number; max: number };
  questionIds: string[];
}

export interface TestPayload {
  version: 1;
  exam: {
    id: string;
    name: string;
    rules: ExamConfig['rules'];
    totalScore: ExamConfig['totalScore'];
  };
  test: { id: string; kind: 'mock' | 'practice'; title: string; description?: string };
  sections: PayloadSection[];
  topics: Record<string, string>;
  questions: Record<string, RenderedQuestion>;
  passages: Record<string, RenderedPassage>;
  sources: Record<string, RenderedSourceSet>;
}
