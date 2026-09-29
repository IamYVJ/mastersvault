// Compiles loaded content into the JSON the browser receives: Markdown becomes
// HTML, answers become indices, and each question gets a stimulus + response spec.
import { toNumber, type ExamBundle, type Question, type TestDef } from './load.ts';
import { renderInline, renderMarkdown } from './markdown.ts';
import { BLANK, type Table } from './schema.ts';
import type {
  RenderedPassage,
  RenderedQuestion,
  RenderedSourceSet,
  RenderedTable,
  ResponseSpec,
  Stimulus,
  TestPayload,
} from './types.ts';

export const DS_CHOICES = [
  'Statement (1) by itself is sufficient, but statement (2) by itself is not sufficient.',
  'Statement (2) by itself is sufficient, but statement (1) by itself is not sufficient.',
  'Both statements together are sufficient, but neither statement by itself is sufficient.',
  'Each statement by itself is sufficient.',
  'The two statements together are not sufficient.',
];

const LETTERS = ['A', 'B', 'C', 'D', 'E'];

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

export function renderQuestion(q: Question): { question: RenderedQuestion; problems: string[] } {
  const r = new Renderer();
  const d = q.data;
  let stem = r.block(q.stem, 'stem');
  let stimulus: Stimulus | undefined;
  let response: ResponseSpec;

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
      response = choiceSpec(d.choices, d.answer);
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
      response,
    },
    problems: r.problems,
  };
}

export function renderPassage(bundle: ExamBundle, id: string): { passage: RenderedPassage; problems: string[] } {
  const p = bundle.passages.get(id)!;
  const r = new Renderer();
  return { passage: { title: p.title, html: r.block(p.body, 'passage') }, problems: r.problems };
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
    exam: { id: bundle.id, name: config.name, rules: config.rules, totalScore: config.totalScore },
    test: { id: test.id, kind: test.kind, title: test.title, description: test.description },
    sections: [],
    topics: {},
    questions: {},
    passages: {},
    sources: {},
  };
  for (const s of test.sections) {
    const section = config.sections.find((c) => c.id === s.id)!;
    for (const t of section.topics) payload.topics[t.id] = t.name;
    payload.sections.push({
      id: section.id,
      name: section.name,
      shortName: section.shortName,
      timeMinutes: s.timeMinutes,
      tools: section.tools,
      score: section.score,
      questionIds: s.questions,
    });
    for (const qid of s.questions) {
      const rendered = renderQuestion(bundle.questions.get(qid)!).question;
      payload.questions[qid] = rendered;
      if (rendered.stimulus?.kind === 'passage' && !payload.passages[rendered.stimulus.id])
        payload.passages[rendered.stimulus.id] = renderPassage(bundle, rendered.stimulus.id).passage;
      if (rendered.stimulus?.kind === 'sources' && !payload.sources[rendered.stimulus.id])
        payload.sources[rendered.stimulus.id] = renderSourceSet(bundle, rendered.stimulus.id).sources;
    }
  }
  return payload;
}
