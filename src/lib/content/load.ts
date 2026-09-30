// Reads content/<exam>/ from disk, validates it and checks cross-references.
//
//   content/<exam>/exam.yaml
//   content/<exam>/questions/<section>/<id>.md
//   content/<exam>/passages/<id>.md          (Reading Comprehension)
//   content/<exam>/sources/<id>.yaml         (Multi-Source Reasoning tabs)
//   content/<exam>/tests/mocks/<id>.yaml
//   content/<exam>/tests/practice/<id>.yaml
//   content/<exam>/revision/<section|general>/<slug>.md
import fs from 'node:fs';
import path from 'node:path';
import type { z } from 'zod';
import {
  BLANK,
  examSchema,
  mockSchema,
  noteSchema,
  passageSchema,
  practiceSchema,
  questionSchemas,
  questionType,
  sourceSetSchema,
  type Chart,
  type ExamConfig,
  type NoteData,
  type QuestionData,
  type QuestionType,
  type SourceSetData,
} from './schema.ts';
import { parseFrontmatter, parseYaml } from './yaml.ts';

export const CONTENT_ROOT = path.resolve(process.cwd(), 'content');

export interface Issue {
  level: 'error' | 'warning';
  file: string;
  message: string;
}

export interface Question {
  id: string;
  section: string;
  file: string;
  data: QuestionData;
  stem: string;
  explanation: string;
}

export interface Passage {
  id: string;
  file: string;
  title?: string;
  status: 'draft' | 'reviewed';
  body: string;
}

export interface SourceSet {
  id: string;
  file: string;
  data: SourceSetData;
}

export interface Note {
  /** <folder>/<slug>, e.g. quant/percents */
  id: string;
  /** A section id, or "general" for notes that span the whole exam. */
  folder: string;
  slug: string;
  file: string;
  data: NoteData;
  body: string;
}

export const GENERAL_NOTES = 'general';

export interface TestDef {
  id: string;
  kind: 'mock' | 'practice';
  file: string;
  title: string;
  description?: string;
  sections: { id: string; questions: string[]; timeMinutes: number }[];
}

export interface ExamBundle {
  id: string;
  config: ExamConfig;
  questions: Map<string, Question>;
  passages: Map<string, Passage>;
  sources: Map<string, SourceSet>;
  mocks: TestDef[];
  practice: TestDef[];
  notes: Map<string, Note>;
}

/** Filename prefix expected for each question type, e.g. ps-0001.md. */
export const ID_PREFIX: Record<QuestionType, string> = {
  'problem-solving': 'ps',
  'critical-reasoning': 'cr',
  'reading-comprehension': 'rc',
  'data-sufficiency': 'ds',
  'multi-source-reasoning': 'msr',
  'table-analysis': 'ta',
  'graphics-interpretation': 'gi',
  'two-part-analysis': 'tpa',
};

const EXPLANATION_HEADING = /^##[ \t]+Explanation[ \t]*$/m;

export function listExamIds(root = CONTENT_ROOT): string[] {
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(root, d.name, 'exam.yaml')))
    .map((d) => d.name)
    .sort();
}

export function loadExam(examId: string, root = CONTENT_ROOT): { bundle: ExamBundle | null; issues: Issue[] } {
  const dir = path.join(root, examId);
  const issues: Issue[] = [];
  const rel = (file: string) => path.relative(process.cwd(), file).split(path.sep).join('/');
  const error = (file: string, message: string) => issues.push({ level: 'error', file: rel(file), message });
  const warn = (file: string, message: string) => issues.push({ level: 'warning', file: rel(file), message });

  const read = (file: string) => fs.readFileSync(file, 'utf8').replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const list = (sub: string, ext: RegExp) => {
    const d = path.join(dir, sub);
    if (!fs.existsSync(d)) return [];
    return fs
      .readdirSync(d)
      .filter((f) => ext.test(f))
      .sort()
      .map((f) => ({ id: f.replace(ext, ''), file: path.join(d, f) }));
  };
  const parse = <S extends z.ZodType>(schema: S, data: unknown, file: string): z.infer<S> | null => {
    const result = schema.safeParse(data);
    if (result.success) return result.data;
    for (const i of result.error.issues) error(file, `${i.path.length ? i.path.join('.') + ': ' : ''}${i.message}`);
    return null;
  };
  const tryRead = <T>(file: string, fn: (src: string) => T): T | null => {
    try {
      return fn(read(file));
    } catch (e) {
      error(file, e instanceof Error ? e.message : String(e));
      return null;
    }
  };

  // -------------------------------------------------------------- exam config
  const examFile = path.join(dir, 'exam.yaml');
  const raw = fs.existsSync(examFile) ? tryRead(examFile, parseYaml) : null;
  if (raw === null) {
    if (!fs.existsSync(examFile)) error(examFile, 'exam.yaml not found');
    return { bundle: null, issues };
  }
  const config = parse(examSchema, raw, examFile);
  if (!config) return { bundle: null, issues };

  const sections = new Map(config.sections.map((s) => [s.id, s]));
  if (sections.size !== config.sections.length) error(examFile, 'section ids must be unique');

  // ---------------------------------------------------------------- passages
  const passages = new Map<string, Passage>();
  for (const { id, file } of list('passages', /\.md$/)) {
    const fm = tryRead(file, parseFrontmatter);
    if (!fm) continue;
    const data = parse(passageSchema, fm.data, file);
    if (!data) continue;
    if (!fm.body.trim()) error(file, 'passage body is empty');
    passages.set(id, { id, file, title: data.title, status: data.status, body: fm.body.trim() });
  }

  // ----------------------------------------------------------------- sources
  const sources = new Map<string, SourceSet>();
  for (const { id, file } of list('sources', /\.ya?ml$/)) {
    const raw = tryRead(file, parseYaml);
    if (raw === null) continue;
    const data = parse(sourceSetSchema, raw, file);
    if (!data) continue;
    data.tabs.forEach((t, i) => {
      if (!t.body?.trim() && !t.chart) error(file, `tabs.${i}: a tab needs a body, a chart, or both`);
      if (t.chart) checkChart(t.chart, (m) => error(file, `tabs.${i}.chart: ${m}`));
    });
    sources.set(id, { id, file, data });
  }

  // --------------------------------------------------------------- questions
  const questions = new Map<string, Question>();
  const questionsDir = path.join(dir, 'questions');
  const sectionDirs = fs.existsSync(questionsDir)
    ? fs.readdirSync(questionsDir, { withFileTypes: true }).filter((d) => d.isDirectory())
    : [];
  for (const d of sectionDirs) {
    const section = sections.get(d.name);
    for (const { id, file } of list(path.join('questions', d.name), /\.md$/)) {
      if (!section) {
        error(file, `folder "${d.name}" is not a section in exam.yaml`);
        continue;
      }
      if (questions.has(id)) {
        error(file, `duplicate question id "${id}" (also ${rel(questions.get(id)!.file)})`);
        continue;
      }
      const fm = tryRead(file, parseFrontmatter);
      if (!fm) continue;
      const typeResult = questionType.safeParse((fm.data as { type?: unknown } | null)?.type);
      if (!typeResult.success) {
        error(file, `type: must be one of ${questionType.options.join(', ')}`);
        continue;
      }
      const type = typeResult.data;
      const data = parse(questionSchemas[type], fm.data, file) as QuestionData | null;
      if (!data) continue;

      if (!section.questionTypes.includes(type)) error(file, `type "${type}" is not allowed in section "${section.id}"`);
      if (!id.startsWith(ID_PREFIX[type] + '-')) warn(file, `file name should start with "${ID_PREFIX[type]}-" for ${type}`);
      const topicIds = new Set(section.topics.map((t) => t.id));
      for (const t of data.topics) if (!topicIds.has(t)) error(file, `unknown topic "${t}" for section "${section.id}"`);

      const parts = fm.body.split(EXPLANATION_HEADING);
      if (parts.length !== 2) {
        error(file, 'body needs exactly one "## Explanation" heading separating the stem from the explanation');
        continue;
      }
      const [stem, explanation] = parts.map((p) => p.trim());
      if (!stem && type !== 'table-analysis' && type !== 'graphics-interpretation') error(file, 'question stem is empty');
      if (!explanation) error(file, 'explanation is empty');

      checkQuestion(data, (m) => error(file, m));
      if (data.type === 'reading-comprehension' && !passages.has(data.passage))
        error(file, `passage "${data.passage}" not found in passages/`);
      if (data.type === 'multi-source-reasoning' && !sources.has(data.source))
        error(file, `source set "${data.source}" not found in sources/`);

      questions.set(id, { id, section: section.id, file, data, stem, explanation });
    }
  }

  // ---------------------------------------------------------- revision notes
  const notes = new Map<string, Note>();
  const revisionDir = path.join(dir, 'revision');
  const noteFolders = fs.existsSync(revisionDir)
    ? fs.readdirSync(revisionDir, { withFileTypes: true }).filter((d) => d.isDirectory())
    : [];
  for (const d of noteFolders) {
    const section = sections.get(d.name);
    for (const { id: slug, file } of list(path.join('revision', d.name), /\.md$/)) {
      if (!section && d.name !== GENERAL_NOTES) {
        error(file, `folder "${d.name}" must be a section id from exam.yaml or "${GENERAL_NOTES}"`);
        continue;
      }
      const fm = tryRead(file, parseFrontmatter);
      if (!fm) continue;
      const data = parse(noteSchema, fm.data, file);
      if (!data) continue;
      if (!fm.body.trim()) error(file, 'note body is empty');
      if (data.kind === 'topic' && !data.topics.length) error(file, 'topics: a topic note must list the topics it covers');
      if (!section && data.topics.length) error(file, 'topics: general notes cannot list section topics');
      if (section) {
        const topicIds = new Set(section.topics.map((t) => t.id));
        for (const t of data.topics) if (!topicIds.has(t)) error(file, `unknown topic "${t}" for section "${section.id}"`);
        for (const t of data.questionTypes)
          if (!section.questionTypes.includes(t)) error(file, `question type "${t}" is not in section "${section.id}"`);
      }
      const id = `${d.name}/${slug}`;
      notes.set(id, { id, folder: d.name, slug, file, data, body: fm.body.trim() });
    }
  }

  // ------------------------------------------------------------------- tests
  const checkSequence = (file: string, label: string, ids: string[], sectionId: string) => {
    const seen = new Set<string>();
    const drafts: string[] = [];
    ids.forEach((qid, i) => {
      const q = questions.get(qid);
      if (!q) return error(file, `${label}: question "${qid}" not found`);
      if (seen.has(qid)) error(file, `${label}: question "${qid}" is listed twice`);
      seen.add(qid);
      if (q.section !== sectionId) error(file, `${label}: "${qid}" belongs to section "${q.section}", not "${sectionId}"`);
      if (q.data.status === 'draft') drafts.push(qid);
      // Questions that share a passage or source set must be delivered back to back.
      const group = groupKey(q.data);
      if (group && i > 0) {
        const prev = questions.get(ids[i - 1]);
        const firstIndex = ids.findIndex((x) => questions.get(x) && groupKey(questions.get(x)!.data) === group);
        if (firstIndex !== i && (!prev || groupKey(prev.data) !== group))
          error(file, `${label}: questions using ${group} must be consecutive`);
      }
    });
    if (drafts.length) warn(file, `${label}: ${drafts.length} question(s) not yet reviewed: ${drafts.join(', ')}`);
  };

  const mocks: TestDef[] = [];
  for (const { id, file } of list(path.join('tests', 'mocks'), /\.ya?ml$/)) {
    const raw = tryRead(file, parseYaml);
    if (raw === null) continue;
    const data = parse(mockSchema, raw, file);
    if (!data) continue;
    for (const key of Object.keys(data.sections))
      if (!sections.has(key)) error(file, `sections.${key}: not a section in exam.yaml`);
    for (const s of config.sections) {
      const ids = data.sections[s.id];
      if (!ids) {
        error(file, `sections.${s.id}: missing (a mock must include every section)`);
        continue;
      }
      if (ids.length !== s.questionCount)
        error(file, `sections.${s.id}: has ${ids.length} questions, the exam format needs ${s.questionCount}`);
      checkSequence(file, `sections.${s.id}`, ids, s.id);
    }
    mocks.push({
      id,
      kind: 'mock',
      file,
      title: data.title,
      description: data.description,
      sections: config.sections.map((s) => ({ id: s.id, questions: data.sections[s.id] ?? [], timeMinutes: s.timeMinutes })),
    });
  }

  const practice: TestDef[] = [];
  for (const { id, file } of list(path.join('tests', 'practice'), /\.ya?ml$/)) {
    const raw = tryRead(file, parseYaml);
    if (raw === null) continue;
    const data = parse(practiceSchema, raw, file);
    if (!data) continue;
    const section = sections.get(data.section);
    if (!section) {
      error(file, `section: "${data.section}" is not a section in exam.yaml`);
      continue;
    }
    checkSequence(file, 'questions', data.questions, section.id);
    const paced = Math.ceil((data.questions.length * section.timeMinutes) / section.questionCount);
    practice.push({
      id,
      kind: 'practice',
      file,
      title: data.title,
      description: data.description,
      sections: [{ id: section.id, questions: data.questions, timeMinutes: data.timeMinutes ?? paced }],
    });
  }

  // A question should appear in at most one mock, and mocks should stay unseen.
  const usedIn = new Map<string, TestDef[]>();
  for (const t of [...mocks, ...practice])
    for (const s of t.sections) for (const q of s.questions) usedIn.set(q, [...(usedIn.get(q) ?? []), t]);
  for (const [qid, tests] of usedIn) {
    const inMocks = tests.filter((t) => t.kind === 'mock');
    const q = questions.get(qid);
    if (!q) continue;
    if (inMocks.length > 1) error(q.file, `used in more than one mock: ${inMocks.map((t) => t.id).join(', ')}`);
    if (inMocks.length && tests.length > inMocks.length)
      warn(q.file, `used in mock "${inMocks[0].id}" and also in a practice set`);
  }

  const referencedPassages = new Set([...questions.values()].map((q) => (q.data.type === 'reading-comprehension' ? q.data.passage : '')));
  for (const p of passages.values()) if (!referencedPassages.has(p.id)) warn(p.file, 'passage is not used by any question');
  const referencedSources = new Set([...questions.values()].map((q) => (q.data.type === 'multi-source-reasoning' ? q.data.source : '')));
  for (const s of sources.values()) if (!referencedSources.has(s.id)) warn(s.file, 'source set is not used by any question');

  return { bundle: { id: examId, config, questions, passages, sources, mocks, practice, notes }, issues };
}

function groupKey(q: QuestionData): string | null {
  if (q.type === 'reading-comprehension') return `passage "${q.passage}"`;
  if (q.type === 'multi-source-reasoning') return `source set "${q.source}"`;
  return null;
}

function checkUnique(values: string[], label: string, report: (m: string) => void) {
  if (new Set(values).size !== values.length) report(`${label}: options must be unique`);
}

function checkChart(chart: Chart, report: (m: string) => void) {
  if (chart.kind === 'scatter') return;
  chart.series.forEach((s, i) => {
    if (s.values.length !== chart.categories.length)
      report(`series.${i}: has ${s.values.length} values but there are ${chart.categories.length} categories`);
  });
}

function checkQuestion(q: QuestionData, report: (m: string) => void) {
  if ('choices' in q) checkUnique(q.choices, 'choices', report);
  if ('labels' in q && 'statements' in q) {
    q.statements.forEach((s, i) => {
      if (!q.labels.includes(s.answer)) report(`statements.${i}.answer: "${s.answer}" must be one of ${q.labels.join(' / ')}`);
    });
  }
  switch (q.type) {
    case 'table-analysis': {
      const { columns, rows } = q.table;
      rows.forEach((row, r) => {
        if (row.length !== columns.length) report(`table.rows.${r}: has ${row.length} cells, expected ${columns.length}`);
        row.forEach((cell, c) => {
          if (columns[c]?.type === 'number' && !Number.isFinite(toNumber(cell)))
            report(`table.rows.${r}.${c}: "${cell}" is not a number (column "${columns[c].label}")`);
        });
      });
      break;
    }
    case 'graphics-interpretation':
      checkChart(q.chart, (m) => report(`chart.${m}`));
      q.statements.forEach((s, i) => {
        if (s.text.split(BLANK).length !== 2) report(`statements.${i}.text: must contain exactly one ${BLANK} blank`);
        if (!s.options.includes(s.answer)) report(`statements.${i}.answer: "${s.answer}" is not one of the options`);
        checkUnique(s.options, `statements.${i}.options`, report);
      });
      break;
    case 'two-part-analysis':
      checkUnique(q.options, 'options', report);
      q.answer.forEach((a, i) => {
        if (!q.options.includes(a)) report(`answer.${i}: "${a}" is not one of the options`);
      });
      break;
  }
}

/** Parses a table cell as a number, allowing thousands separators ("1,890"). */
export function toNumber(cell: string | number): number {
  return typeof cell === 'number' ? cell : Number(cell.replace(/,/g, '').trim());
}
