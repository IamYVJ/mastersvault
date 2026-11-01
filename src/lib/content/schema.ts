// Zod schemas for everything under content/.
// Shared by the Astro build and the Node scripts in scripts/, so this file
// (and everything it imports) must stay plain, erasable TypeScript.
import { z } from 'zod';

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'use lowercase letters, digits and dashes');

// YAML scalars like `700` arrive as numbers; floats are kept as strings by the
// parser (see yaml.ts) so `1.50` is never silently turned into `1.5`.
const text = z.union([z.string(), z.number()]).transform((v) => String(v).trim()).pipe(z.string().min(1));
const num = z.coerce.number().refine(Number.isFinite, 'must be a number');

export const QUESTION_TYPES = [
  'problem-solving',
  'critical-reasoning',
  'reading-comprehension',
  'data-sufficiency',
  'multi-source-reasoning',
  'table-analysis',
  'graphics-interpretation',
  'two-part-analysis',
  'quantitative-comparison',
  'multiple-choice',
  'multiple-answer',
  'numeric-entry',
  'text-completion',
  'sentence-equivalence',
] as const;
export const questionType = z.enum(QUESTION_TYPES);
export type QuestionType = z.infer<typeof questionType>;

export const TOOLS = ['calculator', 'whiteboard'] as const;
export type Tool = (typeof TOOLS)[number];

/** How the on-screen calculator works out 1 + 2 × 4: in the order keyed (12), or by the order of operations (9). */
export const CALCULATOR_ORDERS = ['entry', 'precedence'] as const;
export type CalculatorOrder = (typeof CALCULATOR_ORDERS)[number];

/** Ways to answer a Reading Comprehension question: one choice, every correct choice, or a sentence of the passage. */
export const READING_FORMATS = ['mcq', 'multiple-answer', 'select-sentence'] as const;
export type ReadingFormat = (typeof READING_FORMATS)[number];

export { TIERS, type Tier } from './tiers.ts';

// ---------------------------------------------------------------- exam config

/**
 * One step of an adaptive section's plan: `count` single questions of a type, or a block of
 * questions that share a Reading Comprehension passage or a Multi-Source Reasoning source set.
 */
export const adaptiveSlotSchema = z.union([
  z.object({ type: questionType, count: z.number().int().positive().default(1) }).strict(),
  z.object({ passage: z.number().int().min(2) }).strict(),
  z.object({ sources: z.number().int().min(2) }).strict(),
]);
export type AdaptiveSlotData = z.infer<typeof adaptiveSlotSchema>;

export const examSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  /** false keeps the exam out of production builds while it is being written; `npm run dev` still shows it. */
  published: z.boolean().default(true),
  /** Who owns and runs the exam, for the site's disclaimer: "the Graduate Management Admission Council (GMAC)". */
  testMaker: z.string().min(1),
  /** The trademark notice for the exam's name. */
  trademark: z.string().min(1),
  sections: z
    .array(
      z.object({
        id: slug,
        name: z.string().min(1),
        shortName: z.string().min(1),
        description: z.string().min(1),
        questionCount: z.number().int().positive(),
        timeMinutes: z.number().int().positive(),
        questionTypes: z.array(questionType).min(1),
        tools: z.array(z.enum(TOOLS)).default([]),
        calculator: z.enum(CALCULATOR_ORDERS).default('entry'),
        score: z.object({ min: z.number().int(), max: z.number().int() }),
        /** The Reading Comprehension formats this section uses. */
        readingFormats: z.array(z.enum(READING_FORMATS)).min(1).default(['mcq']),
        /**
         * A measure taken as two separately timed sections, where the second section's difficulty depends
         * on the first (section-level adaptive). The two parts add up to questionCount and timeMinutes.
         */
        parts: z
          .tuple([
            z.object({ questionCount: z.number().int().positive(), timeMinutes: z.number().int().positive() }),
            z.object({ questionCount: z.number().int().positive(), timeMinutes: z.number().int().positive() }),
          ])
          .optional(),
        topics: z.array(z.object({ id: slug, name: z.string().min(1) })).min(1),
        /** The order of question types in an adaptive mock; needed only if the exam has adaptive mocks. */
        adaptive: z.object({ slots: z.array(adaptiveSlotSchema).min(1) }).optional(),
      }),
    )
    .min(1),
  rules: z.object({
    /** fixed: as listed; choose: the test taker picks; random: shuffled for each attempt, with a measure's first part before its second. */
    sectionOrder: z.enum(['fixed', 'choose', 'random']),
    requireAnswerToAdvance: z.boolean(),
    allowBackNavigation: z.boolean(),
    bookmarks: z.boolean(),
    reviewAndEdit: z.object({
      enabled: z.boolean(),
      /** null: any number of answers can be changed. */
      maxAnswerChanges: z.number().int().nonnegative().nullable(),
    }),
    optionalBreak: z
      .object({
        minutes: z.number().int().positive(),
        allowedAfterSection: z.array(z.number().int().positive()).min(1),
      })
      .nullable(),
  }),
  totalScore: z.object({ min: z.number().int(), max: z.number().int(), step: z.number().int().positive() }),
});
export type ExamConfig = z.infer<typeof examSchema>;
export type SectionConfig = ExamConfig['sections'][number];

// ------------------------------------------------------------------ questions

const base = z.object({
  difficulty: z.number().int().min(1).max(5),
  topics: z.array(slug).min(1),
  targetSeconds: z.number().int().positive().optional(),
  status: z.enum(['draft', 'reviewed']).default('draft'),
  // Authors assert every question is original work. Anything else is rejected.
  origin: z.literal('original', { error: 'every question must be original work (origin: original)' }),
  notes: z.string().optional(), // reviewer notes, never shown on the site
  /** A diagram shown with the stem: figures/<file>.svg. The alt text must state everything the figure shows. */
  figure: z.object({ file: slug, alt: text }).strict().optional(),
});

const letter = z.enum(['A', 'B', 'C', 'D', 'E']);
const mcq = { choices: z.array(text).length(5), answer: letter };
export const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] as const;
/** One or more correct letters among the first `count`, e.g. [A, C]. */
const letters = (count: number) =>
  z
    .array(z.enum(LETTERS.slice(0, count) as [string, ...string[]]))
    .min(1)
    .refine((a) => new Set(a).size === a.length, 'list each letter once');

const dichotomous = {
  labels: z.tuple([text, text]),
  statements: z.array(z.object({ text, answer: text })).min(1).max(5),
};

const chartScale = { label: z.string().optional(), min: num.optional(), max: num.optional(), step: num.optional() };
const categorical = {
  title: z.string().optional(),
  categories: z.array(text).min(1),
  x: z.object({ label: z.string().optional() }).default({}),
  y: z.object({ ...chartScale, prefix: z.string().optional(), suffix: z.string().optional() }).default({}),
  series: z.array(z.object({ name: text, values: z.array(num) })).min(1).max(4),
};
export const chartSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('bar'), ...categorical }),
  z.object({ kind: z.literal('line'), ...categorical }),
  z.object({
    kind: z.literal('scatter'),
    title: z.string().optional(),
    x: z.object({ ...chartScale, prefix: z.string().optional(), suffix: z.string().optional() }).default({}),
    y: z.object({ ...chartScale, prefix: z.string().optional(), suffix: z.string().optional() }).default({}),
    series: z
      .array(z.object({ name: text, points: z.array(z.tuple([num, num])).min(1) }))
      .min(1)
      .max(4),
  }),
]);
export type Chart = z.infer<typeof chartSchema>;

export const tableSchema = z.object({
  caption: z.string().optional(),
  columns: z
    .array(
      z.object({
        label: text,
        type: z.enum(['text', 'number']).default('text'),
        prefix: z.string().optional(),
        suffix: z.string().optional(),
      }),
    )
    .min(2),
  rows: z.array(z.array(z.union([z.string(), z.number()]))).min(2),
});
export type Table = z.infer<typeof tableSchema>;

export const BLANK = '___';

export const questionSchemas = {
  'problem-solving': base.extend({ type: z.literal('problem-solving'), ...mcq }),
  'critical-reasoning': base.extend({ type: z.literal('critical-reasoning'), ...mcq }),
  // Questions written before there were other formats have no `format`, so it defaults to mcq.
  'reading-comprehension': z.preprocess(
    (v) => (v && typeof v === 'object' && !('format' in v) ? { ...v, format: 'mcq' } : v),
    z.discriminatedUnion('format', [
      base.extend({ type: z.literal('reading-comprehension'), passage: slug, format: z.literal('mcq'), ...mcq }),
      base.extend({
        type: z.literal('reading-comprehension'),
        passage: slug,
        format: z.literal('multiple-answer'),
        choices: z.array(text).length(3),
        answer: letters(3),
      }),
      base.extend({
        type: z.literal('reading-comprehension'),
        passage: slug,
        format: z.literal('select-sentence'),
        /** The sentence, exactly as written in the passage file. */
        answer: text,
        /** The paragraphs, counted from 1, whose sentences can be selected; every paragraph if omitted. */
        paragraphs: z.array(z.number().int().positive()).min(1).optional(),
      }),
    ]),
  ),
  'data-sufficiency': base.extend({
    type: z.literal('data-sufficiency'),
    statements: z.tuple([text, text]),
    answer: letter,
  }),
  'multi-source-reasoning': z.discriminatedUnion('format', [
    base.extend({ type: z.literal('multi-source-reasoning'), source: slug, format: z.literal('mcq'), ...mcq }),
    base.extend({
      type: z.literal('multi-source-reasoning'),
      source: slug,
      format: z.literal('dichotomous'),
      ...dichotomous,
    }),
  ]),
  'table-analysis': base.extend({ type: z.literal('table-analysis'), table: tableSchema, ...dichotomous }),
  'graphics-interpretation': base.extend({
    type: z.literal('graphics-interpretation'),
    chart: chartSchema,
    statements: z
      .array(z.object({ text: z.string().min(1), options: z.array(text).min(2).max(6), answer: text }))
      .min(1)
      .max(3),
  }),
  'two-part-analysis': base.extend({
    type: z.literal('two-part-analysis'),
    columns: z.tuple([text, text]),
    options: z.array(text).min(3).max(8),
    answer: z.tuple([text, text]),
  }),
  'quantitative-comparison': base.extend({
    type: z.literal('quantitative-comparison'),
    quantityA: text,
    quantityB: text,
    answer: z.enum(['A', 'B', 'C', 'D']),
  }),
  // A `source` puts the question in a Data Interpretation set: questions that share the same tables or graphs.
  'multiple-choice': base.extend({ type: z.literal('multiple-choice'), source: slug.optional(), ...mcq }),
  'multiple-answer': base.extend({
    type: z.literal('multiple-answer'),
    source: slug.optional(),
    choices: z.array(text).min(3).max(8),
    answer: letters(8),
  }),
  'numeric-entry': base.extend({
    type: z.literal('numeric-entry'),
    source: slug.optional(),
    /** decimal: one box for an integer or a decimal; fraction: a numerator box over a denominator box. */
    entry: z.enum(['decimal', 'fraction']).default('decimal'),
    /** For example "12.5" or "3/8". Any equal entry is accepted, such as 12.50 or 6/16. */
    answer: text,
    /** Labels shown before and after the box, such as a currency sign or "%". */
    before: z.string().optional(),
    after: z.string().optional(),
  }),
  'text-completion': base.extend({
    type: z.literal('text-completion'),
    /** One entry per ___ in the stem, in order. */
    blanks: z
      .array(z.object({ options: z.array(text), answer: text }).strict())
      .min(1)
      .max(3),
  }),
  'sentence-equivalence': base.extend({
    type: z.literal('sentence-equivalence'),
    choices: z.array(text).length(6),
    answer: letters(6).refine((a) => a.length === 2, 'give exactly two letters'),
  }),
} satisfies Record<QuestionType, z.ZodType>;

export type QuestionData = {
  [K in QuestionType]: z.infer<(typeof questionSchemas)[K]>;
}[QuestionType];

// ------------------------------------------------ shared stimuli (RC, MSR)

export const passageSchema = z.object({
  title: z.string().optional(),
  status: z.enum(['draft', 'reviewed']).default('draft'),
});

export const sourceSetSchema = z.object({
  title: z.string().optional(),
  status: z.enum(['draft', 'reviewed']).default('draft'),
  tabs: z
    .array(z.object({ title: text, body: z.string().optional(), chart: chartSchema.optional() }))
    .min(1)
    .max(3),
});
export type SourceSetData = z.infer<typeof sourceSetSchema>;

// ------------------------------------------------------------- revision notes

export const NOTE_KINDS = ['topic', 'formulas', 'strategy'] as const;

export const noteSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  kind: z.enum(NOTE_KINDS).default('topic'),
  /** Topic ids from the note's section that the note teaches. */
  topics: z.array(slug).default([]),
  /** Question types the note is about (for strategy notes). */
  questionTypes: z.array(questionType).default([]),
  order: z.number().int().default(100),
  status: z.enum(['draft', 'reviewed']).default('draft'),
});
export type NoteData = z.infer<typeof noteSchema>;

// ---------------------------------------------------------------------- tests

/** A two-part measure in a mock: its first section, and the three versions of its second. */
export const stagedSectionSchema = z
  .object({
    first: z.array(slug).min(1),
    second: z.object({ easier: z.array(slug).min(1), medium: z.array(slug).min(1), harder: z.array(slug).min(1) }).strict(),
  })
  .strict();
export type StagedSectionData = z.infer<typeof stagedSectionSchema>;

export const mockSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  sections: z.record(slug, z.union([z.array(slug).min(1), stagedSectionSchema])),
});

/** An adaptive mock: for each section, the pool of questions from which the engine chooses as the test goes. */
export const adaptiveSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  sections: z.record(slug, z.array(slug).min(1)),
});

export const practiceSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  section: slug,
  timeMinutes: z.number().int().positive().optional(),
  order: z.number().int().default(100), // position within the section's list, lowest first
  questions: z.array(slug).min(1),
});
