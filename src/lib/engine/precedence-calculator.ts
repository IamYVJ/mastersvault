// A calculator that follows the order of operations, like the one in the GRE's Quantitative Reasoning
// measure: 1 + 2 × 4 = 9 (multiplication first), and parentheses group. Its other rules, from the
// test maker's published guidelines:
//
//  - √ and ± act at once on the number on the display, so 21 × 21 + 54 × 54 √ = works out
//    21² + 54√54, and 15 ± is −15.
//  - The display holds 8 digits. A result above 99,999,999 in size, a division by zero or the square
//    root of a negative number shows ERROR, and only C clears it. A result smaller than 0.0000001 in
//    size shows 0.
//  - One memory: M+ adds the display to it, MR recalls it, MC clears it. C doesn't clear the memory.
//
// Internally it is an operator-precedence parser: numbers and operators are pushed onto two stacks,
// and an operator first works out everything before it that binds at least as tightly.

export type Op = '+' | '−' | '×' | '÷';

export type Key =
  | { type: 'digit'; digit: string }
  | { type: 'decimal' }
  | { type: 'op'; op: Op }
  | { type: 'open' }
  | { type: 'close' }
  | { type: 'equals' }
  | { type: 'clear' }
  | { type: 'clear-entry' }
  | { type: 'backspace' }
  | { type: 'sign' }
  | { type: 'sqrt' }
  | { type: 'memory'; action: 'clear' | 'recall' | 'add' };

export interface CalcState {
  display: string;
  /** Numbers waiting for their operators. */
  values: number[];
  /** Operators waiting for their right-hand numbers, and open parentheses. */
  ops: (Op | '(')[];
  /** The display holds a number that hasn't been pushed yet (the one being typed, or a result). */
  pending: boolean;
  /** The next digit starts a new number instead of extending the display. */
  fresh: boolean;
  /** The last key was ")": a "(" now would make no sense. */
  closed: boolean;
  memory: number;
  error: boolean;
}

export const MAX_DIGITS = 8;
const LIMIT = 99_999_999;
const TINY = 1e-7;
export const ERROR = 'ERROR';

export const initialCalc: CalcState = {
  display: '0',
  values: [],
  ops: [],
  pending: true,
  fresh: true,
  closed: false,
  memory: 0,
  error: false,
};

/** Formats a result to at most 8 digits, or null if it is too large to show. */
export function format(n: number): string | null {
  if (!Number.isFinite(n)) return null;
  if (Math.abs(n) < TINY) return '0';
  const intDigits = Math.max(1, String(Math.trunc(Math.abs(n))).length);
  if (intDigits > MAX_DIGITS) return null;
  const fixed = Number(n.toFixed(MAX_DIGITS - intDigits));
  if (Math.abs(fixed) > LIMIT) return null;
  if (Math.abs(fixed) < TINY) return '0';
  const text = fixed.toFixed(MAX_DIGITS - Math.max(1, String(Math.trunc(Math.abs(fixed))).length));
  return text.includes('.') ? text.replace(/0+$/, '').replace(/\.$/, '') : text;
}

const PRECEDENCE: Record<Op, number> = { '+': 1, '−': 1, '×': 2, '÷': 2 };
const failed = (s: CalcState): CalcState => ({ ...initialCalc, memory: s.memory, display: ERROR, error: true });
const value = (s: CalcState) => Number(s.display);

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

/** Works out the top operator. False if that overflows or divides by zero. */
function reduceTop(values: number[], ops: (Op | '(')[]): boolean {
  const op = ops.pop() as Op;
  const b = values.pop()!;
  const a = values.pop()!;
  const result = apply(a, op, b);
  if (format(result) === null) return false;
  values.push(result);
  return true;
}

/** Pushes the number on the display, unless an operator was the last thing keyed. */
function pushPending(s: CalcState, values: number[]) {
  if (s.pending) values.push(value(s));
}

/** Drops an operator left dangling at the end, as in "2 + =" or "(3 × )". */
function dropDangling(s: CalcState, ops: (Op | '(')[]) {
  if (!s.pending && ops.length && ops[ops.length - 1] !== '(') ops.pop();
}

function show(s: CalcState, n: number, patch: Partial<CalcState>): CalcState {
  const display = format(n);
  return display === null ? failed(s) : { ...s, ...patch, display, closed: false };
}

export function press(s: CalcState, key: Key): CalcState {
  // After ERROR, only C does anything.
  if (s.error) return key.type === 'clear' ? { ...initialCalc, memory: s.memory } : s;

  switch (key.type) {
    case 'digit': {
      if (!s.pending || s.fresh) return { ...s, display: key.digit, pending: true, fresh: false, closed: false };
      if (s.display.replace(/[-.]/g, '').length >= MAX_DIGITS) return s;
      return { ...s, display: s.display === '0' ? key.digit : s.display === '-0' ? `-${key.digit}` : s.display + key.digit };
    }
    case 'decimal':
      if (!s.pending || s.fresh) return { ...s, display: '0.', pending: true, fresh: false, closed: false };
      return s.display.includes('.') ? s : { ...s, display: s.display + '.' };
    case 'op': {
      const values = [...s.values];
      const ops = [...s.ops];
      // Two operators in a row: the second replaces the first.
      if (!s.pending && ops.length && ops[ops.length - 1] !== '(') ops.pop();
      pushPending(s, values);
      if (!values.length) values.push(0);
      while (ops.length && ops[ops.length - 1] !== '(' && PRECEDENCE[ops[ops.length - 1] as Op] >= PRECEDENCE[key.op])
        if (!reduceTop(values, ops)) return failed(s);
      ops.push(key.op);
      return show(s, values[values.length - 1], { values, ops, pending: false, fresh: true });
    }
    case 'open': {
      // A parenthesis can start a number's place: at the start, after an operator, or after another "(".
      const startOver = s.pending && s.fresh && !s.values.length && !s.ops.length && !s.closed;
      if (s.pending && !startOver) return s;
      return { ...s, ops: [...s.ops, '('], pending: false, fresh: true, closed: false };
    }
    case 'close': {
      if (!s.ops.includes('(')) return s;
      const values = [...s.values];
      const ops = [...s.ops];
      dropDangling(s, ops);
      pushPending(s, values);
      while (ops[ops.length - 1] !== '(') if (!reduceTop(values, ops)) return failed(s);
      ops.pop();
      const result = values.pop()!;
      const next = show(s, result, { values, ops, pending: true, fresh: true });
      return next.error ? next : { ...next, closed: true };
    }
    case 'equals': {
      const values = [...s.values];
      const ops = [...s.ops];
      dropDangling(s, ops);
      pushPending(s, values);
      while (ops.length) {
        if (ops[ops.length - 1] === '(') ops.pop();
        else if (!reduceTop(values, ops)) return failed(s);
      }
      // The result becomes the number on the display, ready to be used in a new calculation.
      return show(s, values[values.length - 1] ?? 0, { values: [], ops: [], pending: true, fresh: true });
    }
    case 'clear':
      return { ...initialCalc, memory: s.memory };
    case 'clear-entry':
      return { ...s, display: '0', pending: true, fresh: true, closed: false };
    case 'backspace': {
      if (!s.pending || s.fresh) return s;
      const next = s.display.slice(0, -1);
      return { ...s, display: next === '' || next === '-' ? '0' : next };
    }
    case 'sign':
      if (value(s) === 0) return s;
      return { ...s, display: s.display.startsWith('-') ? s.display.slice(1) : `-${s.display}`, pending: true };
    case 'sqrt':
      if (value(s) < 0) return failed(s);
      return show(s, Math.sqrt(value(s)), { pending: true, fresh: true });
    case 'memory':
      switch (key.action) {
        case 'clear':
          return { ...s, memory: 0 };
        case 'recall':
          return { ...s, display: format(s.memory) ?? '0', pending: true, fresh: true, closed: false };
        case 'add': {
          const sum = s.memory + value(s);
          return format(sum) === null ? failed(s) : { ...s, memory: sum, fresh: true };
        }
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
    case '(':
      return { type: 'open' };
    case ')':
      return { type: 'close' };
    case 'Enter':
    case '=':
      return { type: 'equals' };
    case 'Escape':
      return { type: 'clear' };
    case 'Delete':
      return { type: 'clear-entry' };
    case 'Backspace':
      return { type: 'backspace' };
    default:
      return null;
  }
}
