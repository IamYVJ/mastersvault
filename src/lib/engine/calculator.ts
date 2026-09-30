// A basic on-screen calculator, as offered in the Data Insights section.
// Immediate execution like a desk calculator: 2 + 3 × 4 = 20, not 14.
// Percent follows the usual convention: 50 + 10 % → 55, 50 × 10 % → 5.

export type Op = '+' | '−' | '×' | '÷';

export type Key =
  | { type: 'digit'; digit: string }
  | { type: 'decimal' }
  | { type: 'op'; op: Op }
  | { type: 'equals' }
  | { type: 'clear' }
  | { type: 'clear-entry' }
  | { type: 'backspace' }
  | { type: 'sign' }
  | { type: 'sqrt' }
  | { type: 'percent' }
  | { type: 'reciprocal' }
  | { type: 'memory'; action: 'clear' | 'recall' | 'store' | 'add' | 'subtract' };

export interface CalcState {
  display: string;
  /** Left operand waiting for the pending operation. */
  acc: number | null;
  pending: Op | null;
  /** The next digit starts a new number instead of extending the display. */
  fresh: boolean;
  /** Repeat-equals: last operation and right operand. */
  last: { op: Op; operand: number } | null;
  memory: number;
  error: boolean;
}

export const MAX_DIGITS = 12;

export const initialCalc: CalcState = {
  display: '0',
  acc: null,
  pending: null,
  fresh: true,
  last: null,
  memory: 0,
  error: false,
};

/** Rounds away floating-point noise (0.1 + 0.2 → 0.3) and formats for the display. */
export function format(n: number): string {
  if (!Number.isFinite(n)) return 'Error';
  if (n === 0) return '0';
  const rounded = Number(n.toPrecision(MAX_DIGITS));
  const abs = Math.abs(rounded);
  if (abs >= 1e12 || abs < 1e-9) return rounded.toExponential(6).replace(/\.?0+e/, 'e');
  return String(rounded);
}

function apply(a: number, op: Op, b: number): number {
  switch (op) {
    case '+':
      return a + b;
    case '−':
      return a - b;
    case '×':
      return a * b;
    case '÷':
      return b === 0 ? NaN : a / b;
  }
}

const value = (s: CalcState) => Number(s.display);

function show(s: CalcState, n: number, patch: Partial<CalcState> = {}): CalcState {
  if (!Number.isFinite(n)) return { ...initialCalc, memory: s.memory, display: 'Error', error: true };
  return { ...s, ...patch, display: format(n), fresh: true };
}

export function press(s: CalcState, key: Key): CalcState {
  if (s.error && key.type !== 'clear' && key.type !== 'clear-entry') {
    s = { ...initialCalc, memory: s.memory };
    if (key.type !== 'digit' && key.type !== 'decimal') return s;
  }

  switch (key.type) {
    case 'digit': {
      if (s.fresh) return { ...s, display: key.digit, fresh: false };
      const digits = s.display.replace(/[-.]/g, '').length;
      if (digits >= MAX_DIGITS) return s;
      return { ...s, display: s.display === '0' ? key.digit : s.display + key.digit };
    }
    case 'decimal':
      if (s.fresh) return { ...s, display: '0.', fresh: false };
      return s.display.includes('.') ? s : { ...s, display: s.display + '.' };
    case 'op': {
      // Pressing an operator twice in a row just replaces it.
      if (s.pending && s.fresh && s.acc !== null) return { ...s, pending: key.op };
      if (s.pending && s.acc !== null) {
        const result = apply(s.acc, s.pending, value(s));
        return show(s, result, { acc: result, pending: key.op, last: null });
      }
      return { ...s, acc: value(s), pending: key.op, fresh: true, last: null };
    }
    case 'equals': {
      if (s.pending && s.acc !== null) {
        const operand = value(s);
        return show(s, apply(s.acc, s.pending, operand), { acc: null, pending: null, last: { op: s.pending, operand } });
      }
      if (s.last) return show(s, apply(value(s), s.last.op, s.last.operand));
      return { ...s, fresh: true };
    }
    case 'clear':
      return { ...initialCalc, memory: s.memory };
    case 'clear-entry':
      return s.error ? { ...initialCalc, memory: s.memory } : { ...s, display: '0', fresh: true };
    case 'backspace': {
      if (s.fresh) return s;
      const next = s.display.slice(0, -1);
      return { ...s, display: next === '' || next === '-' ? '0' : next };
    }
    case 'sign':
      if (s.display === '0') return s;
      return { ...s, display: s.display.startsWith('-') ? s.display.slice(1) : '-' + s.display };
    case 'sqrt':
      return show(s, value(s) < 0 ? NaN : Math.sqrt(value(s)));
    case 'reciprocal':
      return show(s, value(s) === 0 ? NaN : 1 / value(s));
    case 'percent': {
      const v = value(s);
      if (s.pending && s.acc !== null && (s.pending === '+' || s.pending === '−')) return show(s, (s.acc * v) / 100);
      return show(s, v / 100);
    }
    case 'memory':
      switch (key.action) {
        case 'clear':
          return { ...s, memory: 0 };
        case 'recall':
          return { ...s, display: format(s.memory), fresh: true };
        case 'store':
          return { ...s, memory: value(s), fresh: true };
        case 'add':
          return { ...s, memory: Number((s.memory + value(s)).toPrecision(MAX_DIGITS)), fresh: true };
        case 'subtract':
          return { ...s, memory: Number((s.memory - value(s)).toPrecision(MAX_DIGITS)), fresh: true };
      }
  }
}

/** Maps a keyboard event key to a calculator key, if it is one. */
export function keyFromKeyboard(k: string): Key | null {
  if (/^[0-9]$/.test(k)) return { type: 'digit', digit: k };
  switch (k) {
    case '.':
    case ',':
      return { type: 'decimal' };
    case '+':
      return { type: 'op', op: '+' };
    case '-':
      return { type: 'op', op: '−' };
    case '*':
    case 'x':
      return { type: 'op', op: '×' };
    case '/':
      return { type: 'op', op: '÷' };
    case 'Enter':
    case '=':
      return { type: 'equals' };
    case 'Escape':
      return { type: 'clear' };
    case 'Delete':
      return { type: 'clear-entry' };
    case 'Backspace':
      return { type: 'backspace' };
    case '%':
      return { type: 'percent' };
    default:
      return null;
  }
}
