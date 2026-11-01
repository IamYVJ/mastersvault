// Types for the compiled test payload that the browser receives, plus the
// response model the test engine and question views agree on.
import type { CalculatorOrder, Chart, ExamConfig, QuestionType, Tier, Tool } from './schema.ts';

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

/** How the test taker answers. Every question type maps onto one of these shapes. */
export type ResponseSpec =
  | { kind: 'choice'; choices: Html[]; answer: number }
  | { kind: 'dichotomous'; labels: [string, string]; statements: { html: Html; answer: 0 | 1 }[] }
  | { kind: 'dropdowns'; statements: { before: Html; after: Html; options: string[]; answer: number }[] }
  | { kind: 'two-part'; columns: [Html, Html]; options: Html[]; answer: [number, number] }
  /** Tick every correct choice. `pick` is set when the question says how many to choose (Sentence Equivalence: 2). */
  | { kind: 'multi'; choices: Html[]; answer: number[]; pick?: number }
  /** Type a number: one box, or a numerator and a denominator. `answer` is the key as written, e.g. "12.5" or "3/8". */
  | { kind: 'numeric'; entry: 'decimal' | 'fraction'; before?: Html; after?: Html; answer: string }
  /** Text Completion: one column of options per blank in the stem. */
  | { kind: 'blanks'; blanks: { options: Html[]; answer: number }[] }
  /** Select a sentence of the passage: sentences are numbered from 0 across the whole passage. */
  | { kind: 'sentence'; selectable: number[]; answer: number };

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
  /** Quantitative Comparison: Quantity A and Quantity B, shown side by side under the stem. */
  comparison?: [Html, Html];
  /** A diagram under the stem: inline SVG, and a description of everything it shows. */
  figure?: { svg: Html; alt: string };
  response: ResponseSpec;
}

export interface RenderedPassage {
  title?: string;
  /** With `sentences`, every sentence is wrapped in <span class="q-sentence" data-s="<n>" data-p="<paragraph>">. */
  html: Html;
  sentences?: boolean;
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
 * - multi:       number[] (the ticked choices, in ascending order)
 * - numeric:     string (decimal entry) or [string, string] (numerator, denominator), as typed
 * - blanks:      (number | null)[] (one per blank, index into its options)
 * - sentence:    number (the selected sentence)
 */
export type ResponseValue = number | string | (number | null)[] | [string, string] | null;

/** One position in an adaptive section: a single question of a type, or a block sharing a passage or source set. */
export type AdaptiveSlot =
  | { kind: 'single'; type: QuestionType }
  | { kind: 'group'; stimulus: 'passage' | 'sources'; size: number };

/** How an adaptive section is served: `length` questions, slot by slot, chosen from `pool` as the test goes. */
export interface AdaptivePlan {
  length: number;
  slots: AdaptiveSlot[];
  pool: string[];
}

export interface PayloadSection {
  id: string;
  name: string;
  shortName: string;
  timeMinutes: number;
  tools: Tool[];
  /** How the calculator, if the section has one, orders operations. Defaults to entry order. */
  calculator?: CalculatorOrder;
  score: { min: number; max: number };
  /** Fixed tests: the questions in order. Adaptive sections: empty, the attempt records what was served. */
  questionIds: string[];
  adaptive?: AdaptivePlan;
  /**
   * One timed part of a two-part measure (a mock's "quant-1" and "quant-2"). Results and scores are
   * reported for the measure as a whole. Part 2 starts empty and is filled from `tiers` when it begins.
   */
  measure?: { id: string; name: string; shortName: string; part: 1 | 2 };
  tiers?: Record<Tier, string[]>;
}

export interface TestPayload {
  version: 1;
  /** Changes when the test's structure or answer keys change; older saved attempts are then discarded. */
  hash: string;
  exam: {
    id: string;
    name: string;
    rules: ExamConfig['rules'];
    totalScore: ExamConfig['totalScore'];
  };
  test: { id: string; kind: 'mock' | 'practice'; title: string; description?: string; adaptive?: boolean };
  sections: PayloadSection[];
  topics: Record<string, string>;
  questions: Record<string, RenderedQuestion>;
  passages: Record<string, RenderedPassage>;
  sources: Record<string, RenderedSourceSet>;
}
