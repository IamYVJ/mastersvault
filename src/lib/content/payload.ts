// Compiles loaded content into the JSON the browser receives: Markdown becomes
// HTML, answers become indices, and each question gets a stimulus + response spec.
import { createHash } from 'node:crypto';
import { expandSlots, toNumber, type ExamBundle, type Question, type TestDef } from './load.ts';
import { DS_CHOICES, QC_CHOICES } from './labels.ts';
import { renderInline, renderMarkdown } from './markdown.ts';
import { BLANK, TIERS, type Table } from './schema.ts';
import { normalize, paragraphsOf, splitSentences } from './sentences.ts';
import type {
  RenderedPassage,
  RenderedQuestion,
  RenderedSourceSet,
  RenderedTable,
  ResponseSpec,
  Stimulus,
  TestPayload,
} from './types.ts';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const ROMAN = ['i', 'ii', 'iii'];

/** Renders a stem whose ___ blanks become numbered gaps: "(i) ____" when there are several, a plain gap when there is one. */
function renderWithBlanks(r: Renderer, md: string): string {
  const pieces = md.split(BLANK);
  const marker = (i: number) => `⟦${i}⟧`;
  const html = r.block(pieces.map((p, i) => (i ? marker(i - 1) + p : p)).join(''), 'stem');
  const many = pieces.length > 2;
  return html.replace(/⟦(\d)⟧/g, (_, i) =>
    many
      ? `<span class="q-blank" data-blank="${i}"><span class="q-blank-label">(${ROMAN[Number(i)]})</span></span>`
      : '<span class="q-blank"></span>',
  );
}

/** Collects Markdown problems (bad math, unescaped $) while rendering. */
class Renderer {
  problems: string[] = [];
  block(md: string, where: string) {
    const r = renderMarkdown(md);
    this.problems.push(...r.problems.map((p) => `${where}: ${p}`));
    return r.html;
  }
  inline(md: string, where: string) {
    const r = renderInline(md);
    this.problems.push(...r.problems.map((p) => `${where}: ${p}`));
    return r.html;
  }
}

function renderTable(table: Table): RenderedTable {
  return {
    caption: table.caption,
    columns: table.columns.map((c) => ({ label: c.label, type: c.type })),
    rows: table.rows.map((row) =>
      row.map((cell, i) => {
        const col = table.columns[i];
        const display = `${col?.prefix ?? ''}${cell}${col?.suffix ?? ''}`;
        return { display, value: col?.type === 'number' ? toNumber(cell) : String(cell).toLowerCase() };
      }),
    ),
  };
}

export function renderQuestion(q: Question, bundle: ExamBundle): { question: RenderedQuestion; problems: string[] } {
  const r = new Renderer();
  const d = q.data;
  const blanked = d.type === 'text-completion' || d.type === 'sentence-equivalence';
  let stem = blanked ? renderWithBlanks(r, q.stem) : r.block(q.stem, 'stem');
  let stimulus: Stimulus | undefined;
  let response: ResponseSpec;
  let comparison: [string, string] | undefined;
  const indices = (answer: string[]) => answer.map((a) => LETTERS.indexOf(a)).sort((a, b) => a - b);
  const multiSpec = (choices: string[], answer: string[], pick?: number): ResponseSpec => ({
    kind: 'multi',
    choices: choices.map((c, i) => r.inline(c, `choices.${i}`)),
    answer: indices(answer),
    ...(pick && { pick }),
  });
  if ('source' in d && d.source) stimulus = { kind: 'sources', id: d.source };

  const choiceSpec = (choices: string[], answer: string): ResponseSpec => ({
    kind: 'choice',
    choices: choices.map((c, i) => r.inline(c, `choices.${i}`)),
    answer: LETTERS.indexOf(answer),
  });
  const dichotomousSpec = (labels: [string, string], statements: { text: string; answer: string }[]): ResponseSpec => ({
    kind: 'dichotomous',
    labels,
    statements: statements.map((s, i) => ({
      html: r.inline(s.text, `statements.${i}`),
      answer: labels.indexOf(s.answer) === 0 ? 0 : 1,
    })),
  });

  switch (d.type) {
    case 'problem-solving':
    case 'critical-reasoning':
      response = choiceSpec(d.choices, d.answer);
      break;
    case 'reading-comprehension':
      stimulus = { kind: 'passage', id: d.passage };
      if (d.format === 'mcq') response = choiceSpec(d.choices, d.answer);
      else if (d.format === 'multiple-answer') response = multiSpec(d.choices, d.answer);
      else {
        const sentences = splitSentences(bundle.passages.get(d.passage)!.body);
        const selectable = sentences.flatMap((s, i) => (!d.paragraphs || d.paragraphs.includes(s.paragraph) ? [i] : []));
        response = { kind: 'sentence', selectable, answer: sentences.findIndex((s, i) => selectable.includes(i) && s.text === normalize(d.answer)) };
      }
      break;
    case 'quantitative-comparison':
      comparison = [r.inline(d.quantityA, 'quantityA'), r.inline(d.quantityB, 'quantityB')];
      response = { kind: 'choice', choices: QC_CHOICES, answer: LETTERS.indexOf(d.answer) };
      break;
    case 'multiple-choice':
      response = choiceSpec(d.choices, d.answer);
      break;
    case 'multiple-answer':
      response = multiSpec(d.choices, d.answer);
      break;
    case 'sentence-equivalence':
      response = multiSpec(d.choices, d.answer, 2);
      break;
    case 'numeric-entry':
      response = {
        kind: 'numeric',
        entry: d.entry,
        answer: d.answer,
        ...(d.before && { before: r.inline(d.before, 'before') }),
        ...(d.after && { after: r.inline(d.after, 'after') }),
      };
      break;
    case 'text-completion':
      response = {
        kind: 'blanks',
        blanks: d.blanks.map((b, i) => ({
          options: b.options.map((o, j) => r.inline(o, `blanks.${i}.options.${j}`)),
          answer: b.options.indexOf(b.answer),
        })),
      };
      break;
    case 'data-sufficiency':
      stem +=
        '\n<ol class="ds-statements">' +
        d.statements.map((s, i) => `<li><span class="ds-num">(${i + 1})</span> ${r.inline(s, `statements.${i}`)}</li>`).join('') +
        '</ol>';
      response = { kind: 'choice', choices: DS_CHOICES, answer: LETTERS.indexOf(d.answer) };
      break;
    case 'multi-source-reasoning':
      stimulus = { kind: 'sources', id: d.source };
      response = d.format === 'mcq' ? choiceSpec(d.choices, d.answer) : dichotomousSpec(d.labels, d.statements);
      break;
    case 'table-analysis':
      stimulus = { kind: 'table', table: renderTable(d.table) };
      response = dichotomousSpec(d.labels, d.statements);
      break;
    case 'graphics-interpretation':
      stimulus = { kind: 'chart', chart: d.chart };
      response = {
        kind: 'dropdowns',
        statements: d.statements.map((s, i) => {
          const [before, after] = s.text.split(BLANK);
          return {
            before: r.inline(before, `statements.${i}`),
            after: after.trim() ? r.inline(after, `statements.${i}`) : '',
            options: s.options,
            answer: s.options.indexOf(s.answer),
          };
        }),
      };
      break;
    case 'two-part-analysis':
      response = {
        kind: 'two-part',
        columns: [r.inline(d.columns[0], 'columns.0'), r.inline(d.columns[1], 'columns.1')],
        options: d.options.map((o, i) => r.inline(o, `options.${i}`)),
        answer: [d.options.indexOf(d.answer[0]), d.options.indexOf(d.answer[1])],
      };
      break;
  }

  const figure = d.figure && bundle.figures.get(d.figure.file);
  return {
    question: {
      id: q.id,
      type: d.type,
      section: q.section,
      difficulty: d.difficulty,
      topics: d.topics,
      targetSeconds: d.targetSeconds ?? 120,
      stem,
      explanation: r.block(q.explanation, 'explanation'),
      stimulus,
      ...(comparison && { comparison }),
      ...(figure && { figure: { svg: figure.svg, alt: d.figure!.alt } }),
      response,
    },
    problems: r.problems,
  };
}

/** Passages that some question answers by selecting a sentence, so their sentences must be marked up. */
const selectablePassages = (bundle: ExamBundle) =>
  new Set([...bundle.questions.values()].flatMap((q) => (q.data.type === 'reading-comprehension' && q.data.format === 'select-sentence' ? [q.data.passage] : [])));

export function renderPassage(bundle: ExamBundle, id: string): { passage: RenderedPassage; problems: string[] } {
  const p = bundle.passages.get(id)!;
  const r = new Renderer();
  if (!selectablePassages(bundle).has(id)) return { passage: { title: p.title, html: r.block(p.body, 'passage') }, problems: r.problems };
  // Each sentence is rendered on its own, inside its paragraph, so it can be selected.
  const sentences = splitSentences(p.body);
  const html = paragraphsOf(p.body)
    .map((_, pi) => {
      const spans = sentences.flatMap((s, si) =>
        s.paragraph === pi + 1 ? [`<span class="q-sentence" data-s="${si}" data-p="${pi + 1}">${r.inline(s.text, `passage sentence ${si + 1}`)}</span>`] : [],
      );
      return `<p>${spans.join(' ')}</p>`;
    })
    .join('\n');
  return { passage: { title: p.title, html, sentences: true }, problems: r.problems };
}

export function renderSourceSet(bundle: ExamBundle, id: string): { sources: RenderedSourceSet; problems: string[] } {
  const s = bundle.sources.get(id)!;
  const r = new Renderer();
  const tabs = s.data.tabs.map((t, i) => ({
    title: t.title,
    html: t.body ? r.block(t.body, `tabs.${i}`) : undefined,
    chart: t.chart,
  }));
  return { sources: { title: s.data.title, tabs }, problems: r.problems };
}

export function buildTestPayload(bundle: ExamBundle, test: TestDef): TestPayload {
  const { config } = bundle;
  const payload: TestPayload = {
    version: 1,
    hash: '',
    exam: { id: bundle.id, name: config.name, rules: config.rules, totalScore: config.totalScore },
    test: { id: test.id, kind: test.kind, title: test.title, description: test.description, ...(test.adaptive && { adaptive: true }) },
    sections: [],
    topics: {},
    questions: {},
    passages: {},
    sources: {},
  };
  for (const s of test.sections) {
    const section = config.sections.find((c) => c.id === s.id)!;
    for (const t of section.topics) payload.topics[t.id] = t.name;
    const common = { name: section.name, shortName: section.shortName, tools: section.tools, calculator: section.calculator, score: section.score };
    if (s.stages) {
      // A two-part measure is taken as two timed sections. The second is filled from one of its
      // versions when it begins, depending on the result of the first.
      const measure = { id: section.id, name: section.name, shortName: section.shortName };
      const [first, second] = section.parts!;
      payload.sections.push(
        { id: `${section.id}-1`, ...common, timeMinutes: first.timeMinutes, questionIds: s.stages.first, measure: { ...measure, part: 1 } },
        { id: `${section.id}-2`, ...common, timeMinutes: second.timeMinutes, questionIds: [], measure: { ...measure, part: 2 }, tiers: s.stages.second },
      );
    } else
      payload.sections.push({
        id: section.id,
        ...common,
        timeMinutes: s.timeMinutes,
        // An adaptive section starts empty: the engine serves its questions from the pool as the test goes.
        questionIds: test.adaptive ? [] : s.questions,
        ...(test.adaptive && { adaptive: { length: s.length, slots: expandSlots(section.adaptive!.slots), pool: s.questions } }),
      });
    for (const qid of s.questions) {
      const rendered = renderQuestion(bundle.questions.get(qid)!, bundle).question;
      payload.questions[qid] = rendered;
      if (rendered.stimulus?.kind === 'passage' && !payload.passages[rendered.stimulus.id])
        payload.passages[rendered.stimulus.id] = renderPassage(bundle, rendered.stimulus.id).passage;
      if (rendered.stimulus?.kind === 'sources' && !payload.sources[rendered.stimulus.id])
        payload.sources[rendered.stimulus.id] = renderSourceSet(bundle, rendered.stimulus.id).sources;
    }
  }
  // Only structure and answer keys count: fixing a typo in an explanation shouldn't invalidate saved attempts.
  const shape = payload.sections.map((s) => [
    s.id,
    s.timeMinutes,
    (s.adaptive?.pool ?? (s.tiers ? TIERS.flatMap((t) => s.tiers![t]) : s.questionIds)).map((q) => [q, payload.questions[q].response]),
    ...(s.adaptive ? [s.adaptive.length, s.adaptive.slots] : []),
    ...(s.tiers ? [TIERS.map((t) => s.tiers![t].length)] : []),
  ]);
  payload.hash = createHash('sha1').update(JSON.stringify(shape)).digest('hex').slice(0, 12);
  return payload;
}
