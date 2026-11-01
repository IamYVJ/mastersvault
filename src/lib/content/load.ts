// Reads content/<exam>/ from disk, validates it and checks cross-references.
//
//   content/<exam>/exam.yaml
//   content/<exam>/questions/<section>/<id>.md
//   content/<exam>/passages/<id>.md          (Reading Comprehension)
//   content/<exam>/sources/<id>.yaml         (Multi-Source Reasoning tabs, Data Interpretation sets)
//   content/<exam>/figures/<id>.svg          (diagrams shown with a question's stem)
//   content/<exam>/tests/mocks/<id>.yaml
//   content/<exam>/tests/practice/<id>.yaml
//   content/<exam>/revision/<section|general>/<slug>.md
import fs from 'node:fs';
import path from 'node:path';
import type { z } from 'zod';
import {
  adaptiveSchema,
  BLANK,
  examSchema,
  mockSchema,
  noteSchema,
  passageSchema,
  practiceSchema,
  questionSchemas,
  questionType,
  sourceSetSchema,
  TIERS,
  type Chart,
  type AdaptiveSlotData,
  type ExamConfig,
  type NoteData,
  type QuestionData,
  type QuestionType,
  type SectionConfig,
  type SourceSetData,
  type Tier,
} from './schema.ts';
import { normalize, splitSentences, unsplittable } from './sentences.ts';
import type { AdaptiveSlot } from './types.ts';
import { parseFrontmatter, parseYaml } from './yaml.ts';
import { parseNumber } from '../engine/numeric.ts';

// The content is kept in its own repository. It's read from content/ when that folder exists
// (the build workflow checks it out there), and otherwise from a checkout next to this one.
const inProject = path.resolve(process.cwd(), 'content');
export const CONTENT_ROOT = fs.existsSync(inProject) ? inProject : path.resolve(process.cwd(), '../mastersvault-content');

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

export interface Figure {
  id: string;
  file: string;
  /** The SVG markup, checked to contain no scripts, event handlers or outside links. */
  svg: string;
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
  /** An adaptive mock: each section's `questions` is a pool, from which `length` are served. */
  adaptive?: boolean;
  file: string;
  title: string;
  description?: string;
  /**
   * `length` is the number of questions a test taker answers: all of `questions`, except in an adaptive
   * mock or a two-part measure. A two-part measure also has `stages`: its first section and the three
   * versions of its second, all of whose questions are in `questions`.
   */
  sections: { id: string; questions: string[]; length: number; timeMinutes: number; stages?: Stages }[];
}

export interface Stages {
  first: string[];
  second: Record<Tier, string[]>;
}

export interface ExamBundle {
  id: string;
  config: ExamConfig;
  questions: Map<string, Question>;
  passages: Map<string, Passage>;
  sources: Map<string, SourceSet>;
  figures: Map<string, Figure>;
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
  'quantitative-comparison': 'qc',
  'multiple-choice': 'mc',
  'multiple-answer': 'ma',
  'numeric-entry': 'ne',
  'text-completion': 'tc',
  'sentence-equivalence': 'se',
};

/** The shared passage or source set a question belongs to, e.g. `passage "rc-p001"`, or null. */
export function groupKey(q: QuestionData): string | null {
  if (q.type === 'reading-comprehension') return `passage "${q.passage}"`;
  if ('source' in q && q.source) return `source set "${q.source}"`;
  return null;
}

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
  config.sections.forEach((s, i) => {
    if (s.parts) {
      const where = `sections.${i}.parts`;
      const [a, b] = s.parts;
      if (a.questionCount + b.questionCount !== s.questionCount)
        error(examFile, `${where}: the parts have ${a.questionCount + b.questionCount} questions, but the section has ${s.questionCount}`);
      if (a.timeMinutes + b.timeMinutes !== s.timeMinutes)
        error(examFile, `${where}: the parts take ${a.timeMinutes + b.timeMinutes} minutes, but the section has ${s.timeMinutes}`);
      if (s.adaptive) error(examFile, `sections.${i}: a section with parts can't also have a question-by-question adaptive plan`);
    }
    if (!s.adaptive) return;
    const where = `sections.${i}.adaptive`;
    const slots = expandSlots(s.adaptive.slots);
    if (slotLength(slots) !== s.questionCount)
      error(examFile, `${where}: the slots add up to ${slotLength(slots)} questions, but the section has ${s.questionCount}`);
    for (const slot of slots) {
      const type = slot.kind === 'single' ? slot.type : slot.stimulus === 'passage' ? 'reading-comprehension' : 'multi-source-reasoning';
      if (!s.questionTypes.includes(type)) error(examFile, `${where}: "${type}" is not a question type of this section`);
      if (slot.kind === 'single' && (type === 'reading-comprehension' || type === 'multi-source-reasoning'))
        error(examFile, `${where}: ${type} questions come in blocks; use { ${type === 'reading-comprehension' ? 'passage' : 'sources'}: <questions> }`);
    }
  });

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

  // ----------------------------------------------------------------- figures
  // Figures are inlined into the page, so anything that could run code or load from elsewhere is refused.
  const figures = new Map<string, Figure>();
  for (const { id, file } of list('figures', /\.svg$/)) {
    const svg = tryRead(file, (src) => src.replace(/^<\?xml[^>]*>\s*/, '').trim());
    if (svg === null) continue;
    const bad = [
      [!/^<svg[\s>]/.test(svg), 'must start with <svg'],
      [!/\sviewBox="/.test(svg.slice(0, svg.indexOf('>'))), 'the <svg> element needs a viewBox'],
      [/\s(width|height)="/.test(svg.slice(0, svg.indexOf('>'))), 'leave width and height off the <svg> element, so it scales'],
      [/<script|<foreignObject|<iframe|<image|<use/i.test(svg), 'scripts, foreignObject, iframe, image and use elements are not allowed'],
      [/\son[a-z]+\s*=/i.test(svg), 'event handler attributes are not allowed'],
      [/(href|src)\s*=/i.test(svg), 'links are not allowed'],
      [/url\(|@import/i.test(svg), 'url() and @import are not allowed'],
    ] as const;
    for (const [failed, message] of bad) if (failed) error(file, message);
    figures.set(id, { id, file, svg });
  }
  const usedFigures = new Set<string>();

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
      const stemOptional = ['table-analysis', 'graphics-interpretation', 'quantitative-comparison'].includes(type);
      if (!stem && !stemOptional) error(file, 'question stem is empty');
      if (!explanation) error(file, 'explanation is empty');

      checkQuestion(data, stem, (m) => error(file, m));
      if (data.type === 'reading-comprehension') {
        const passage = passages.get(data.passage);
        if (!passage) error(file, `passage "${data.passage}" not found in passages/`);
        if (!section.readingFormats.includes(data.format))
          error(file, `format "${data.format}" is not one of this section's readingFormats (${section.readingFormats.join(', ')})`);
        if (passage && data.format === 'select-sentence') checkSelectSentence(data, passage.body, (m) => error(file, m));
      }
      if ('source' in data && data.source && !sources.has(data.source)) error(file, `source set "${data.source}" not found in sources/`);
      if (data.figure) {
        usedFigures.add(data.figure.file);
        if (!figures.has(data.figure.file)) error(file, `figure "${data.figure.file}" not found in figures/`);
        if (data.figure.alt.length < 20) error(file, 'figure.alt: describe everything the figure shows, in words');
      }

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

  // A two-part measure: the first section is of middling difficulty, and the three versions of the
  // second must get harder in order, since the engine sends stronger results to the harder ones.
  const checkStages = (file: string, label: string, stages: Stages, section: SectionConfig) => {
    const [first, second] = section.parts!;
    const meanOf = (ids: string[]) => {
      const ds = ids.map((id) => questions.get(id)?.data.difficulty).filter((d) => d !== undefined);
      return ds.reduce((a, b) => a + b, 0) / (ds.length || 1);
    };
    if (stages.first.length !== first.questionCount)
      error(file, `${label}.first: has ${stages.first.length} questions, the first part needs ${first.questionCount}`);
    checkSequence(file, `${label}.first`, stages.first, section.id);
    for (const tier of TIERS) {
      const ids = stages.second[tier];
      if (ids.length !== second.questionCount)
        error(file, `${label}.second.${tier}: has ${ids.length} questions, the second part needs ${second.questionCount}`);
      checkSequence(file, `${label}.second.${tier}`, ids, section.id);
    }
    const all = stageQuestions(stages);
    const twice = [...new Set(all.filter((id, i) => all.indexOf(id) !== i))];
    if (twice.length) error(file, `${label}: listed in more than one part or version: ${twice.join(', ')}`);
    const means = TIERS.map((t) => meanOf(stages.second[t]));
    if (!(means[0] < means[1] && means[1] < means[2]))
      error(file, `${label}.second: average difficulty must rise from easier to medium to harder (now ${means.map((m) => m.toFixed(2)).join(', ')})`);
    const m = meanOf(stages.first);
    if (m < 2.6 || m > 3.4) warn(file, `${label}.first: average difficulty is ${m.toFixed(2)}; the first part should be of middling difficulty (about 3)`);
  };

  const mocks: TestDef[] = [];
  for (const { id, file } of list(path.join('tests', 'mocks'), /\.ya?ml$/)) {
    const raw = tryRead(file, parseYaml);
    if (raw === null) continue;
    const data = parse(mockSchema, raw, file);
    if (!data) continue;
    for (const key of Object.keys(data.sections))
      if (!sections.has(key)) error(file, `sections.${key}: not a section in exam.yaml`);
    const stagesOf = new Map<string, Stages>();
    for (const s of config.sections) {
      const entry = data.sections[s.id];
      if (!entry) {
        error(file, `sections.${s.id}: missing (a mock must include every section)`);
        continue;
      }
      if (s.parts) {
        if (Array.isArray(entry)) {
          error(file, `sections.${s.id}: this section has two parts; list them as first: [...] and second: { easier, medium, harder }`);
          continue;
        }
        stagesOf.set(s.id, entry);
        checkStages(file, `sections.${s.id}`, entry, s);
        continue;
      }
      if (!Array.isArray(entry)) {
        error(file, `sections.${s.id}: only a section with parts in exam.yaml takes first/second; list the questions instead`);
        continue;
      }
      if (entry.length !== s.questionCount)
        error(file, `sections.${s.id}: has ${entry.length} questions, the exam format needs ${s.questionCount}`);
      checkSequence(file, `sections.${s.id}`, entry, s.id);
    }
    mocks.push({
      id,
      kind: 'mock',
      file,
      title: data.title,
      description: data.description,
      sections: config.sections.map((s) => {
        const stages = stagesOf.get(s.id);
        if (stages) return { id: s.id, questions: stageQuestions(stages), length: s.questionCount, timeMinutes: s.timeMinutes, stages };
        const entry = data.sections[s.id];
        const questions = Array.isArray(entry) ? entry : [];
        return { id: s.id, questions, length: questions.length, timeMinutes: s.timeMinutes };
      }),
    });
  }

  // ---------------------------------------------------------- adaptive mocks
  // Each section lists a pool; the engine serves questions from it slot by slot, following the
  // section's plan in exam.yaml. Ids get an "adaptive-" prefix so they can't collide with numbered mocks.
  const checkPool = (file: string, label: string, pool: string[], section: SectionConfig) => {
    const seen = new Set<string>();
    const drafts: string[] = [];
    for (const qid of pool) {
      const q = questions.get(qid);
      if (!q) {
        error(file, `${label}: question "${qid}" not found`);
        continue;
      }
      if (seen.has(qid)) error(file, `${label}: question "${qid}" is listed twice`);
      seen.add(qid);
      if (q.section !== section.id) error(file, `${label}: "${qid}" belongs to section "${q.section}", not "${section.id}"`);
      if (q.data.status === 'draft') drafts.push(qid);
    }
    if (drafts.length) warn(file, `${label}: ${drafts.length} question(s) not yet reviewed`);
    const need = poolNeeds(expandSlots(section.adaptive!.slots));
    const have = poolSupply(pool.map((id) => questions.get(id)).filter((q) => q !== undefined).map((q) => q.data));
    for (const [key, size] of have.groupSizes)
      if (!need.groupSizes.has(key.split(':')[0] + ':' + size))
        error(file, `${label}: ${describeGroup(key)} has ${size} question(s) in the pool, which matches no block in the section's plan`);
    for (const [slot, count] of need.counts) {
      const available = have.counts.get(slot) ?? 0;
      if (available < count) error(file, `${label}: the plan needs ${count} × ${slotName(slot)}, but the pool has only ${available}`);
      else if (available < 2 * count)
        warn(file, `${label}: the pool has ${available} × ${slotName(slot)} for ${count} slot(s); with fewer than ${2 * count} the engine has little to choose from`);
    }
    for (const slot of have.counts.keys())
      if (!need.counts.has(slot)) error(file, `${label}: the pool has ${slotName(slot)}, which the section's plan never serves`);
  };
  for (const { id: fileId, file } of list(path.join('tests', 'adaptive'), /\.ya?ml$/)) {
    const raw = tryRead(file, parseYaml);
    if (raw === null) continue;
    const data = parse(adaptiveSchema, raw, file);
    if (!data) continue;
    for (const key of Object.keys(data.sections))
      if (!sections.has(key)) error(file, `sections.${key}: not a section in exam.yaml`);
    for (const s of config.sections) {
      const pool = data.sections[s.id];
      if (!pool) error(file, `sections.${s.id}: missing (an adaptive mock must include every section)`);
      else if (s.parts) error(file, `sections.${s.id}: this section has two parts, so its mocks go in tests/mocks/ with first and second`);
      else if (!s.adaptive) error(file, `sections.${s.id}: exam.yaml has no adaptive plan for this section`);
      else checkPool(file, `sections.${s.id}`, pool, s);
    }
    mocks.push({
      id: `adaptive-${fileId}`,
      kind: 'mock',
      adaptive: true,
      file,
      title: data.title,
      description: data.description,
      sections: config.sections.map((s) => ({
        id: s.id,
        questions: data.sections[s.id] ?? [],
        length: s.questionCount,
        timeMinutes: s.timeMinutes,
      })),
    });
  }

  const practice: (TestDef & { order: number })[] = [];
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
      sections: [{ id: section.id, questions: data.questions, length: data.questions.length, timeMinutes: data.timeMinutes ?? paced }],
      order: data.order,
    });
  }
  practice.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));

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
  const referencedSources = new Set([...questions.values()].map((q) => ('source' in q.data && q.data.source ? q.data.source : '')));
  for (const s of sources.values()) if (!referencedSources.has(s.id)) warn(s.file, 'source set is not used by any question');
  for (const f of figures.values()) if (!usedFigures.has(f.id)) warn(f.file, 'figure is not used by any question');

  return { bundle: { id: examId, config, questions, passages, sources, figures, mocks, practice, notes }, issues };
}

/** Every question of a two-part measure: the first section, then the easier, medium and harder second sections. */
export const stageQuestions = (s: Stages) => [...s.first, ...TIERS.flatMap((t) => s.second[t])];

// ------------------------------------------------------------ adaptive plans

/** The plan in exam.yaml, one entry per slot: `{ type, count }` becomes `count` single slots. */
export function expandSlots(slots: AdaptiveSlotData[]): AdaptiveSlot[] {
  return slots.flatMap((s): AdaptiveSlot[] => {
    if ('type' in s) return Array.from({ length: s.count }, () => ({ kind: 'single', type: s.type }));
    if ('passage' in s) return [{ kind: 'group', stimulus: 'passage', size: s.passage }];
    return [{ kind: 'group', stimulus: 'sources', size: s.sources }];
  });
}

export const slotLength = (slots: AdaptiveSlot[]) => slots.reduce((n, s) => n + (s.kind === 'single' ? 1 : s.size), 0);

/** A slot's key: "single:<type>", or "passage:<size>" / "sources:<size>" for a block. */
export const slotKey = (s: AdaptiveSlot) => (s.kind === 'single' ? `single:${s.type}` : `${s.stimulus}:${s.size}`);

const slotName = (key: string) => {
  const [kind, rest] = key.split(':');
  if (kind === 'single') return `${rest} question`;
  return `${kind === 'passage' ? 'passage' : 'source set'} with ${rest} questions`;
};
const describeGroup = (key: string) => {
  const [kind, id] = key.split(':');
  return kind === 'passage' ? `passage "${id}"` : `source set "${id}"`;
};

/** How many of each kind of slot a plan has, and which block sizes it uses. */
export function poolNeeds(slots: AdaptiveSlot[]) {
  const counts = new Map<string, number>();
  for (const s of slots) counts.set(slotKey(s), (counts.get(slotKey(s)) ?? 0) + 1);
  return { counts, groupSizes: new Set(slots.filter((s) => s.kind === 'group').map(slotKey)) };
}

/** What a pool can fill: single questions by type, and blocks by size (the pool questions sharing a passage or source set). */
export function poolSupply(pool: QuestionData[]) {
  const groupSizes = new Map<string, number>();
  const counts = new Map<string, number>();
  for (const q of pool) {
    const group = q.type === 'reading-comprehension' ? `passage:${q.passage}` : q.type === 'multi-source-reasoning' ? `sources:${q.source}` : null;
    if (group) groupSizes.set(group, (groupSizes.get(group) ?? 0) + 1);
    else counts.set(`single:${q.type}`, (counts.get(`single:${q.type}`) ?? 0) + 1);
  }
  for (const [group, size] of groupSizes) {
    const key = `${group.split(':')[0]}:${size}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return { counts, groupSizes };
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

function checkQuestion(q: QuestionData, stem: string, report: (m: string) => void) {
  if ('choices' in q) checkUnique(q.choices, 'choices', report);
  if ((q.type === 'multiple-answer' || (q.type === 'reading-comprehension' && q.format === 'multiple-answer')) && Array.isArray(q.answer))
    q.answer.forEach((a, i) => {
      if ('ABCDEFGH'.indexOf(a) >= q.choices.length) report(`answer.${i}: "${a}" is past the last choice`);
    });
  const blanks = stem.split(BLANK).length - 1;
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
    case 'text-completion': {
      if (blanks !== q.blanks.length) report(`the stem has ${blanks} ${BLANK} blank(s), but blanks lists ${q.blanks.length}`);
      const size = q.blanks.length === 1 ? 5 : 3;
      q.blanks.forEach((b, i) => {
        if (b.options.length !== size)
          report(`blanks.${i}.options: ${q.blanks.length === 1 ? 'a single blank has 5 options' : 'with two or three blanks, each has 3 options'}, not ${b.options.length}`);
        if (!b.options.includes(b.answer)) report(`blanks.${i}.answer: "${b.answer}" is not one of the options`);
        checkUnique(b.options, `blanks.${i}.options`, report);
      });
      break;
    }
    case 'sentence-equivalence':
      if (blanks !== 1) report(`the stem must have exactly one ${BLANK} blank, not ${blanks}`);
      break;
    case 'numeric-entry': {
      const value = parseNumber(q.answer, q.entry);
      if (!value) report(`answer: "${q.answer}" is not ${q.entry === 'fraction' ? 'a fraction such as 3/8' : 'an integer or decimal such as -12.5'}`);
      else if (q.entry === 'fraction' && value.d === 0n) report('answer: the denominator is 0');
      break;
    }
  }
}

/** A select-sentence answer must be exactly one sentence of the passage, in a paragraph the question allows. */
function checkSelectSentence(q: Extract<QuestionData, { format: 'select-sentence' }>, body: string, report: (m: string) => void) {
  const problem = unsplittable(body);
  if (problem) return report(`the passage can't be used for select-sentence questions: ${problem}`);
  const sentences = splitSentences(body);
  const paragraphs = Math.max(0, ...sentences.map((s) => s.paragraph));
  for (const p of q.paragraphs ?? []) if (p > paragraphs) report(`paragraphs: the passage has only ${paragraphs} paragraph(s)`);
  const allowed = sentences.filter((s) => !q.paragraphs || q.paragraphs.includes(s.paragraph));
  if (allowed.length < 3) report(`only ${allowed.length} sentence(s) can be selected; give the test taker at least 3 to choose from`);
  const hits = allowed.filter((s) => s.text === normalize(q.answer));
  if (hits.length !== 1)
    report(
      hits.length
        ? `answer: the sentence appears ${hits.length} times`
        : `answer: not a sentence of the passage${q.paragraphs ? ` in paragraph(s) ${q.paragraphs.join(', ')}` : ''}. The passage splits into: ${allowed.map((s) => JSON.stringify(s.text.slice(0, 40))).join(', ')}`,
    );
}

/** Parses a table cell as a number, allowing thousands separators ("1,890"). */
export function toNumber(cell: string | number): number {
  return typeof cell === 'number' ? cell : Number(cell.replace(/,/g, '').replace(/−/g, '-').trim());
}
