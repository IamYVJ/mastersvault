import type { QuestionType } from './schema.ts';

export const TYPE_LABELS: Record<QuestionType, string> = {
  'problem-solving': 'Problem Solving',
  'critical-reasoning': 'Critical Reasoning',
  'reading-comprehension': 'Reading Comprehension',
  'data-sufficiency': 'Data Sufficiency',
  'multi-source-reasoning': 'Multi-Source Reasoning',
  'table-analysis': 'Table Analysis',
  'graphics-interpretation': 'Graphics Interpretation',
  'two-part-analysis': 'Two-Part Analysis',
};

/** The five fixed Data Sufficiency answer choices, in order A to E. */
export const DS_CHOICES = [
  'Statement (1) by itself is sufficient, but statement (2) by itself is not sufficient.',
  'Statement (2) by itself is sufficient, but statement (1) by itself is not sufficient.',
  'Both statements together are sufficient, but neither statement by itself is sufficient.',
  'Each statement by itself is sufficient.',
  'The two statements together are not sufficient.',
];
