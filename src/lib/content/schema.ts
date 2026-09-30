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
] as const;
export const questionType = z.enum(QUESTION_TYPES);
export type QuestionType = z.infer<typeof questionType>;

export const TOOLS = ['calculator', 'whiteboard'] as const;
export type Tool = (typeof TOOLS)[number];

// ---------------------------------------------------------------- exam config

export const examSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
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
        score: z.object({ min: z.number().int(), max: z.number().int() }),
        topics: z.array(z.object({ id: slug, name: z.string().min(1) })).min(1),
      }),
    )
    .min(1),
  rules: z.object({
    sectionOrder: z.enum(['fixed', 'choose']),
    requireAnswerToAdvance: z.boolean(),
    allowBackNavigation: z.boolean(),
    bookmarks: z.boolean(),
    reviewAndEdit: z.object({
      enabled: z.boolean(),
      maxAnswerChanges: z.number().int().nonnegative(),
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
});

const letter = z.enum(['A', 'B', 'C', 'D', 'E']);
const mcq = { choices: z.array(text).length(5), answer: letter };

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
  'reading-comprehension': base.extend({ type: z.literal('reading-comprehension'), passage: slug, ...mcq }),
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

export const mockSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  sections: z.record(slug, z.array(slug).min(1)),
});

export const practiceSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  section: slug,
  timeMinutes: z.number().int().positive().optional(),
  questions: z.array(slug).min(1),
});
