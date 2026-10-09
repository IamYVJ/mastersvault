// Answer inputs for the four response shapes. With `onChange` omitted they are
// read-only; with `reveal` they mark the correct answer and any wrong picks.
import { useId } from 'react';
import type { ResponseSpec, ResponseValue } from '../../lib/content/types.ts';

type Spec<K extends ResponseSpec['kind']> = Extract<ResponseSpec, { kind: K }>;

interface Props<K extends ResponseSpec['kind']> {
  spec: Spec<K>;
  value: ResponseValue;
  onChange?: (value: ResponseValue) => void;
  reveal: boolean;
  name: string;
}

const LETTERS = 'ABCDE';
const parts = (v: ResponseValue, n: number): (number | null)[] =>
  Array.isArray(v) ? v : Array.from({ length: n }, () => null);
const setPart = (v: ResponseValue, n: number, i: number, x: number) => {
  const next = [...parts(v, n)];
  next[i] = x;
  return next;
};
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
            {reveal && <span className="q-letter">{LETTERS[i]}</span>}
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
