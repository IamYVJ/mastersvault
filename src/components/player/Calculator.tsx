// On-screen calculator UI. The arithmetic lives in lib/engine/calculator.ts.
import { useReducer, type KeyboardEvent } from 'react';
import { type Key, initialCalc, keyFromKeyboard, press } from '../../lib/engine/calculator.ts';

interface Button {
  label: string;
  key: Key;
  aria?: string;
  kind?: 'op' | 'fn' | 'mem' | 'eq';
  span?: 'wide' | 'tall';
}

const d = (digit: string): Button => ({ label: digit, key: { type: 'digit', digit } });

const BUTTONS: Button[] = [
  { label: 'MC', key: { type: 'memory', action: 'clear' }, aria: 'Memory clear', kind: 'mem' },
  { label: 'MR', key: { type: 'memory', action: 'recall' }, aria: 'Memory recall', kind: 'mem' },
  { label: 'MS', key: { type: 'memory', action: 'store' }, aria: 'Memory store', kind: 'mem' },
  { label: 'M+', key: { type: 'memory', action: 'add' }, aria: 'Memory add', kind: 'mem' },
  { label: 'M−', key: { type: 'memory', action: 'subtract' }, aria: 'Memory subtract', kind: 'mem' },
  { label: '⌫', key: { type: 'backspace' }, aria: 'Backspace', kind: 'fn' },
  { label: 'CE', key: { type: 'clear-entry' }, aria: 'Clear entry', kind: 'fn' },
  { label: 'C', key: { type: 'clear' }, aria: 'Clear all', kind: 'fn' },
  { label: '±', key: { type: 'sign' }, aria: 'Change sign', kind: 'fn' },
  { label: '√', key: { type: 'sqrt' }, aria: 'Square root', kind: 'fn' },
  d('7'),
  d('8'),
  d('9'),
  { label: '÷', key: { type: 'op', op: '÷' }, aria: 'Divide', kind: 'op' },
  { label: '%', key: { type: 'percent' }, aria: 'Percent', kind: 'fn' },
  d('4'),
  d('5'),
  d('6'),
  { label: '×', key: { type: 'op', op: '×' }, aria: 'Multiply', kind: 'op' },
  { label: '1/x', key: { type: 'reciprocal' }, aria: 'Reciprocal', kind: 'fn' },
  d('1'),
  d('2'),
  d('3'),
  { label: '−', key: { type: 'op', op: '−' }, aria: 'Subtract', kind: 'op' },
  { label: '=', key: { type: 'equals' }, aria: 'Equals', kind: 'eq', span: 'tall' },
  { ...d('0'), span: 'wide' },
  { label: '.', key: { type: 'decimal' }, aria: 'Decimal point' },
  { label: '+', key: { type: 'op', op: '+' }, aria: 'Add', kind: 'op' },
];

export default function Calculator() {
  const [state, dispatch] = useReducer(press, initialCalc);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const key = keyFromKeyboard(e.key);
    if (!key) return;
    // Enter and Space on a focused button press that button, as usual.
    if ((e.key === 'Enter' || e.key === ' ') && (e.target as HTMLElement).tagName === 'BUTTON') return;
    e.preventDefault();
    dispatch(key);
  };

  return (
    <div className="calc" onKeyDown={onKeyDown}>
      <div className="calc-display" tabIndex={0} data-autofocus aria-label="Calculator display. Type numbers and operators here." role="textbox" aria-readonly="true">
        <span className="calc-indicators">
          {state.memory !== 0 && <span title="A value is stored in memory">M</span>}
          {state.pending && state.acc !== null && (
            <span>
              {Number(state.acc.toPrecision(12))} {state.pending}
            </span>
          )}
        </span>
        <output className={`calc-value ${state.display.length > 12 ? 'is-long' : ''}`} aria-live="polite">
          {state.display}
        </output>
      </div>
      <div className="calc-keys">
        {BUTTONS.map((b) => (
          <button
            key={b.label}
            type="button"
            className={`calc-key ${b.kind ? `is-${b.kind}` : ''} ${b.span ? `is-${b.span}` : ''}`}
            aria-label={b.aria ?? b.label}
            onClick={() => dispatch(b.key)}
          >
            {b.label}
          </button>
        ))}
      </div>
    </div>
  );
}
