// Renders one question in any of the eight formats. The test engine, the
// results review and the authoring preview all use this component.
//
// Layout follows the exam: questions with a shared passage or tabbed sources
// get a split screen (stimulus left, question right); everything else is a
// single column.
import 'katex/dist/katex.min.css';
import './questions.css';
import { useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent, type ReactNode, type SyntheticEvent } from 'react';
import type { RenderedPassage, RenderedQuestion, RenderedSourceSet, ResponseSpec, ResponseValue } from '../../lib/content/types.ts';
import { SITE } from '../../lib/site.ts';
import Chart from './Chart.tsx';
import DataTable from './DataTable.tsx';
import { BlankColumns, ChoiceList, DichotomousGrid, DropdownStatements, MultiChoice, NumericEntry, TwoPartGrid } from './Responses.tsx';
import SourceTabs from './SourceTabs.tsx';

export interface QuestionViewProps {
  question: RenderedQuestion;
  passage?: RenderedPassage;
  sources?: RenderedSourceSet;
  response: ResponseValue;
  /** Omit to render read-only. */
  onChange?: (value: ResponseValue) => void;
  /** Mark correct/incorrect answers and show the explanation. */
  reveal?: boolean;
  /** Extra content under the explanation, e.g. a "report an issue" link. */
  explanationFooter?: ReactNode;
  /** Allow selecting and copying the text. Off by default, as in the exam. */
  copyable?: boolean;
}

// A deterrent only: it stops casual copying, not a determined reader.
const block = (e: SyntheticEvent) => e.preventDefault();
const blockMenu = (e: SyntheticEvent) => {
  if (!(e.target as Element).closest('a')) e.preventDefault();
};
const guard = { onCopy: block, onCut: block, onDragStart: block, onContextMenu: blockMenu };

/** Switches off the print and save-page shortcuts while a question is on screen. */
function useBlockPrintAndSave(on: boolean) {
  useEffect(() => {
    if (!on) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && ['p', 's'].includes(e.key.toLowerCase())) e.preventDefault();
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [on]);
}

export default function QuestionView({
  question: q,
  passage,
  sources,
  response,
  onChange,
  reveal = false,
  explanationFooter,
  copyable = false,
}: QuestionViewProps) {
  const name = `q-${q.id}`;
  const spec = q.response;
  const props = { value: response, onChange, reveal, name };
  const root = copyable ? { className: 'q-view' } : { className: 'q-view is-guarded', ...guard };
  useBlockPrintAndSave(!copyable);
  const rights = `© 2026 ${SITE.name} · ${SITE.contentRights}`;
  // Printing shows this in place of the question (see questions.css).
  const printNote = copyable ? null : <p className="q-print-note">Questions can't be printed. {rights}.</p>;

  const answer =
    spec.kind === 'choice' ? (
      <ChoiceList spec={spec} {...props} />
    ) : spec.kind === 'dichotomous' ? (
      <DichotomousGrid spec={spec} {...props} />
    ) : spec.kind === 'dropdowns' ? (
      <DropdownStatements spec={spec} {...props} />
    ) : spec.kind === 'multi' ? (
      <MultiChoice spec={spec} {...props} />
    ) : spec.kind === 'numeric' ? (
      <NumericEntry spec={spec} {...props} />
    ) : spec.kind === 'blanks' ? (
      <BlankColumns spec={spec} {...props} />
    ) : spec.kind === 'sentence' ? (
      <SentenceStatus spec={spec} passage={passage} value={response} reveal={reveal} />
    ) : (
      <TwoPartGrid spec={spec} {...props} />
    );

  const stimulus = q.stimulus;
  const inline =
    stimulus?.kind === 'table' ? (
      <DataTable table={stimulus.table} id={name} />
    ) : stimulus?.kind === 'chart' ? (
      <Chart chart={stimulus.chart} />
    ) : null;

  const main = (
    <div className="q-main">
      {q.stem && <div className="q-stem q-prose" dangerouslySetInnerHTML={{ __html: q.stem }} />}
      {q.figure && <div className="q-figure" role="img" aria-label={q.figure.alt} dangerouslySetInnerHTML={{ __html: q.figure.svg }} />}
      {q.comparison && (
        <table className="q-compare">
          <thead>
            <tr>
              <th scope="col">Quantity A</th>
              <th scope="col">Quantity B</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="q-prose" dangerouslySetInnerHTML={{ __html: q.comparison[0] }} />
              <td className="q-prose" dangerouslySetInnerHTML={{ __html: q.comparison[1] }} />
            </tr>
          </tbody>
        </table>
      )}
      {inline}
      {answer}
      {reveal && (
        <section className="q-explanation">
          <h2>Explanation</h2>
          <div className="q-prose" dangerouslySetInnerHTML={{ __html: q.explanation }} />
          {explanationFooter}
        </section>
      )}
      {!copyable && <p className="q-rights">{rights}</p>}
    </div>
  );

  if (stimulus?.kind === 'passage' || stimulus?.kind === 'sources') {
    return (
      <div {...root} className={`${root.className} q-split`}>
        {/* Scrolls on its own, so it must be reachable by keyboard. */}
        <div className="q-stimulus" tabIndex={0} role="region" aria-label={stimulus.kind === 'passage' ? 'Passage' : 'Sources'}>
          {stimulus.kind === 'passage' && passage && (
            <article className="q-passage q-prose">
              {spec.kind === 'sentence' ? (
                <SelectablePassage html={passage.html} spec={spec} value={response} onChange={onChange} reveal={reveal} />
              ) : (
                <div dangerouslySetInnerHTML={{ __html: passage.html }} />
              )}
            </article>
          )}
          {stimulus.kind === 'sources' && sources && <SourceTabs sources={sources} />}
        </div>
        {main}
        {printNote}
      </div>
    );
  }
  return (
    <div {...root} className={`${root.className} q-single`}>
      {main}
      {printNote}
    </div>
  );
}

type SentenceSpec = Extract<ResponseSpec, { kind: 'sentence' }>;

/**
 * The passage of a select-sentence question. Its sentences are spans built at compile time; the ones
 * the question allows can be clicked, or reached with Tab and chosen with Enter or Space.
 */
function SelectablePassage({
  html,
  spec,
  value,
  onChange,
  reveal,
}: {
  html: string;
  spec: SentenceSpec;
  value: ResponseValue;
  onChange?: (value: ResponseValue) => void;
  reveal: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  // The HTML is set once; marking the chosen and allowed sentences is done on the spans themselves.
  useEffect(() => {
    for (const el of box.current?.querySelectorAll<HTMLElement>('.q-sentence') ?? []) {
      const i = Number(el.dataset.s);
      const allowed = spec.selectable.includes(i);
      const chosen = value === i;
      el.classList.toggle('is-selectable', allowed && !!onChange);
      el.classList.toggle('is-chosen', chosen);
      el.classList.toggle('is-correct', reveal && i === spec.answer);
      el.classList.toggle('is-wrong', reveal && chosen && i !== spec.answer);
      if (allowed && onChange) {
        el.tabIndex = 0;
        el.setAttribute('role', 'button');
        el.setAttribute('aria-pressed', String(chosen));
      } else {
        el.removeAttribute('tabindex');
        el.removeAttribute('role');
        el.removeAttribute('aria-pressed');
      }
    }
  }, [spec, value, onChange, reveal]);

  const pick = (target: EventTarget) => {
    const el = (target as Element).closest<HTMLElement>('.q-sentence');
    const i = el ? Number(el.dataset.s) : NaN;
    if (onChange && spec.selectable.includes(i)) onChange(i);
  };
  const onKey = (e: ReactKeyboardEvent) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    pick(e.target);
  };
  return (
    <div
      ref={box}
      className="q-selectable"
      onClick={(e) => pick(e.target)}
      onKeyDown={onKey}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/** Under a select-sentence question: what to do, and the sentence chosen so far. */
function SentenceStatus({ spec, passage, value, reveal }: { spec: SentenceSpec; passage?: RenderedPassage; value: ResponseValue; reveal: boolean }) {
  const text = (i: number) => {
    if (!passage || typeof document === 'undefined') return '';
    const doc = new DOMParser().parseFromString(passage.html, 'text/html');
    return doc.querySelector(`.q-sentence[data-s="${i}"]`)?.textContent ?? '';
  };
  const chosen = typeof value === 'number' ? text(value) : '';
  return (
    <div className="q-sentence-status" aria-live="polite">
      <p className="q-pick">Select the sentence in the passage. Click it, or move to it with Tab and press Enter.</p>
      <p>
        <span className="muted">Your selection: </span>
        {chosen ? <q>{chosen}</q> : <span className="muted">none yet</span>}
      </p>
      {reveal && value !== spec.answer && (
        <p>
          <span className="q-tag q-tag-correct">Answer</span> <q>{text(spec.answer)}</q>
        </p>
      )}
    </div>
  );
}
