// Answer inputs for the response shapes. With `onChange` omitted they are
// read-only; with `reveal` they mark the correct answer and any wrong picks.
// (Selecting a sentence happens in the passage itself; see QuestionView.)
import { useId } from 'react';
import type { ResponseSpec, ResponseValue } from '../../lib/content/types.ts';
import { correctResponse, isCorrect } from '../../lib/engine/grading.ts';

type Spec<K extends ResponseSpec['kind']> = Extract<ResponseSpec, { kind: K }>;

interface Props<K extends ResponseSpec['kind']> {
  spec: Spec<K>;
  value: ResponseValue;
  onChange?: (value: ResponseValue) => void;
  reveal: boolean;
  name: string;
}

const LETTERS = 'ABCDEFGH';
const ROMAN = ['i', 'ii', 'iii'];
const parts = (v: ResponseValue, n: number): (number | null)[] =>
  Array.isArray(v) ? (v as (number | null)[]) : Array.from({ length: n }, () => null);
const setPart = (v: ResponseValue, n: number, i: number, x: number) => {
  const next = [...parts(v, n)];
  next[i] = x;
  return next;
};
// Each choice's label starts with its letter for screen readers (sighted test takers see the letters
// only once answers are revealed). It also gives a label of pure maths, such as "(−4, 6)", some words.
const choiceName = (i: number) => `Choice ${LETTERS[i]}: `;
const mark = (reveal: boolean, isAnswer: boolean, isChosen: boolean) =>
  !reveal ? '' : isAnswer ? 'is-correct' : isChosen ? 'is-wrong' : '';

export function ChoiceList({ spec, value, onChange, reveal, name }: Props<'choice'>) {
  return (
    <fieldset className="q-choices">
      <legend className="visually-hidden">Answer choices</legend>
      {spec.choices.map((html, i) => {
        const chosen = value === i;
        return (
          <label key={i} className={`q-choice ${chosen ? 'is-chosen' : ''} ${mark(reveal, i === spec.answer, chosen)}`}>
            <input
              type="radio"
              name={name}
              checked={chosen}
              disabled={!onChange}
              onChange={() => onChange?.(i)}
            />
            {reveal ? <span className="q-letter">{LETTERS[i]}</span> : <span className="visually-hidden">{choiceName(i)}</span>}
            <span className="q-choice-text" dangerouslySetInnerHTML={{ __html: html }} />
            {reveal && i === spec.answer && <span className="q-tag q-tag-correct">Correct answer</span>}
            {reveal && chosen && i !== spec.answer && <span className="q-tag q-tag-wrong">Your answer</span>}
          </label>
        );
      })}
    </fieldset>
  );
}

export function DichotomousGrid({ spec, value, onChange, reveal, name }: Props<'dichotomous'>) {
  const n = spec.statements.length;
  const v = parts(value, n);
  const id = useId();
  return (
    <table className="q-grid">
      <thead>
        <tr>
          <th scope="col" id={`${id}-c0`}>
            {spec.labels[0]}
          </th>
          <th scope="col" id={`${id}-c1`}>
            {spec.labels[1]}
          </th>
          <th scope="col">
            <span className="visually-hidden">Statement</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {spec.statements.map((s, i) => (
          <tr key={i} className={reveal && v[i] !== null ? (v[i] === s.answer ? 'row-correct' : 'row-wrong') : ''}>
            {[0, 1].map((col) => (
              <td key={col} className={`q-grid-cell ${mark(reveal, s.answer === col, v[i] === col)}`}>
                <input
                  type="radio"
                  name={`${name}-${i}`}
                  aria-labelledby={`${id}-c${col} ${id}-r${i}`}
                  checked={v[i] === col}
                  disabled={!onChange}
                  onChange={() => onChange?.(setPart(value, n, i, col))}
                />
              </td>
            ))}
            <td className="q-grid-text" id={`${id}-r${i}`} dangerouslySetInnerHTML={{ __html: s.html }} />
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function DropdownStatements({ spec, value, onChange, reveal, name }: Props<'dropdowns'>) {
  const n = spec.statements.length;
  const v = parts(value, n);
  return (
    <div className="q-dropdowns">
      {spec.statements.map((s, i) => {
        const correct = v[i] === s.answer;
        return (
          <p key={i} className="q-dropdown-line">
            <span dangerouslySetInnerHTML={{ __html: s.before }} />{' '}
            <select
              aria-label={`Statement ${i + 1}: choose the missing value`}
              name={`${name}-${i}`}
              className={reveal && v[i] !== null ? (correct ? 'is-correct' : 'is-wrong') : ''}
              value={v[i] ?? ''}
              disabled={!onChange}
              onChange={(e) => onChange?.(setPart(value, n, i, Number(e.target.value)))}
            >
              <option value="" disabled>
                Select…
              </option>
              {s.options.map((o, j) => (
                <option key={j} value={j}>
                  {o}
                </option>
              ))}
            </select>{' '}
            <span dangerouslySetInnerHTML={{ __html: s.after }} />
            {reveal && !correct && <span className="q-tag q-tag-correct">Answer: {s.options[s.answer]}</span>}
          </p>
        );
      })}
    </div>
  );
}

export function TwoPartGrid({ spec, value, onChange, reveal, name }: Props<'two-part'>) {
  const v = parts(value, 2);
  const id = useId();
  return (
    <table className="q-grid">
      <thead>
        <tr>
          <th scope="col" id={`${id}-c0`} dangerouslySetInnerHTML={{ __html: spec.columns[0] }} />
          <th scope="col" id={`${id}-c1`} dangerouslySetInnerHTML={{ __html: spec.columns[1] }} />
          <th scope="col">
            <span className="visually-hidden">Option</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {spec.options.map((html, row) => (
          <tr key={row}>
            {[0, 1].map((col) => (
              <td key={col} className={`q-grid-cell ${mark(reveal, spec.answer[col] === row, v[col] === row)}`}>
                <input
                  type="radio"
                  name={`${name}-col${col}`}
                  aria-labelledby={`${id}-c${col} ${id}-r${row}`}
                  checked={v[col] === row}
                  disabled={!onChange}
                  onChange={() => onChange?.(setPart(value, 2, col, row))}
                />
              </td>
            ))}
            <td className="q-grid-text" id={`${id}-r${row}`} dangerouslySetInnerHTML={{ __html: html }} />
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Tick every correct choice (square boxes, as on the exam). With `pick`, no more than that many can be ticked. */
export function MultiChoice({ spec, value, onChange, reveal, name }: Props<'multi'>) {
  const chosen = Array.isArray(value) ? (value as number[]) : [];
  const full = spec.pick !== undefined && chosen.length >= spec.pick;
  const toggle = (i: number) =>
    onChange?.(chosen.includes(i) ? chosen.filter((x) => x !== i) : full ? chosen : [...chosen, i].sort((a, b) => a - b));
  return (
    <fieldset className="q-choices is-multi">
      <legend className="q-pick">
        {spec.pick ? `Select exactly ${spec.pick === 2 ? 'two' : spec.pick} answer choices.` : 'Select all answer choices that apply.'}
      </legend>
      {spec.choices.map((html, i) => {
        const on = chosen.includes(i);
        const right = spec.answer.includes(i);
        return (
          <label key={i} className={`q-choice ${on ? 'is-chosen' : ''} ${mark(reveal, right, on)}`}>
            <input
              type="checkbox"
              name={`${name}-${i}`}
              checked={on}
              disabled={!onChange || (full && !on)}
              onChange={() => toggle(i)}
            />
            {reveal ? <span className="q-letter">{LETTERS[i]}</span> : <span className="visually-hidden">{choiceName(i)}</span>}
            <span className="q-choice-text" dangerouslySetInnerHTML={{ __html: html }} />
            {reveal && right && <span className="q-tag q-tag-correct">Correct</span>}
            {reveal && on && !right && <span className="q-tag q-tag-wrong">Your answer</span>}
          </label>
        );
      })}
    </fieldset>
  );
}

// Typing is limited to what the boxes accept on the exam: digits, one decimal point and a leading minus
// sign in the single box, and integers in the fraction boxes.
const DECIMAL_TYPING = /^-?\d*\.?\d*$/;
const INTEGER_TYPING = /^-?\d*$/;
const MAX_LENGTH = 10;

/** One answer box, or a numerator box over a denominator box, with any label before or after. */
export function NumericEntry({ spec, value, onChange, reveal, name }: Props<'numeric'>) {
  const id = useId();
  const fraction = spec.entry === 'fraction';
  const boxes: string[] = fraction ? (Array.isArray(value) ? (value as string[]) : ['', '']) : [typeof value === 'string' ? value : ''];
  const set = (i: number, text: string) => {
    if (text.length > MAX_LENGTH || !(fraction ? INTEGER_TYPING : DECIMAL_TYPING).test(text)) return;
    const next = [...boxes];
    next[i] = text;
    onChange?.(fraction ? (next as [string, string]) : next[0]);
  };
  const state = reveal && boxes.some((b) => b.trim()) ? (isCorrect(spec, value) ? 'is-correct' : 'is-wrong') : '';
  const key = correctResponse(spec);
  const input = (i: number, label: string) => (
    <input
      id={`${id}-${i}`}
      className={`q-entry-box ${state}`}
      type="text"
      inputMode={fraction ? 'numeric' : 'decimal'}
      autoComplete="off"
      spellCheck={false}
      aria-label={label}
      name={`${name}-${i}`}
      value={boxes[i] ?? ''}
      disabled={!onChange}
      onChange={(e) => set(i, e.target.value.replace(/\s/g, ''))}
    />
  );
  return (
    <div className="q-entry" role="group" aria-label="Your answer">
      {spec.before && <span className="q-entry-label" dangerouslySetInnerHTML={{ __html: spec.before }} />}
      {fraction ? (
        <span className="q-fraction">
          {input(0, 'Numerator')}
          <span className="q-fraction-bar" aria-hidden="true" />
          {input(1, 'Denominator')}
        </span>
      ) : (
        input(0, 'Answer')
      )}
      {spec.after && <span className="q-entry-label" dangerouslySetInnerHTML={{ __html: spec.after }} />}
      {reveal && state !== 'is-correct' && (
        <span className="q-tag q-tag-correct">Answer: {Array.isArray(key) ? `${key[0]}/${key[1]}` : String(key)}</span>
      )}
    </div>
  );
}

/** Text Completion: a column of options for each blank. Choosing in one column doesn't affect the others. */
export function BlankColumns({ spec, value, onChange, reveal, name }: Props<'blanks'>) {
  const n = spec.blanks.length;
  const v = parts(value, n);
  return (
    <div className={`q-blanks is-${n}`}>
      {spec.blanks.map((b, i) => (
        <fieldset key={i} className="q-blank-col">
          <legend>{n > 1 ? `Blank (${ROMAN[i]})` : <span className="visually-hidden">Answer choices</span>}</legend>
          {b.options.map((html, j) => {
            const on = v[i] === j;
            return (
              <label key={j} className={`q-blank-option ${on ? 'is-chosen' : ''} ${mark(reveal, b.answer === j, on)}`}>
                <input type="radio" name={`${name}-${i}`} checked={on} disabled={!onChange} onChange={() => onChange?.(setPart(value, n, i, j))} />
                <span dangerouslySetInnerHTML={{ __html: html }} />
              </label>
            );
          })}
        </fieldset>
      ))}
    </div>
  );
}
