// Response helpers shared by the question views and the test engine.
// Multi-part questions earn credit only when every part is correct.
import type { ResponseSpec, ResponseValue } from '../content/types.ts';
import { parseDecimal, parseFraction, parseNumber, sameNumber } from './numeric.ts';

export function emptyResponse(spec: ResponseSpec): ResponseValue {
  switch (spec.kind) {
    case 'choice':
    case 'sentence':
      return null;
    case 'dichotomous':
    case 'dropdowns':
      return spec.statements.map(() => null);
    case 'two-part':
      return [null, null];
    case 'multi':
      return [];
    case 'numeric':
      return spec.entry === 'fraction' ? ['', ''] : '';
    case 'blanks':
      return spec.blanks.map(() => null);
  }
}

const parts = (v: ResponseValue): (number | null)[] => (Array.isArray(v) ? (v as (number | null)[]) : []);
const ticked = (v: ResponseValue): number[] => (Array.isArray(v) ? (v as unknown[]).filter((x): x is number => typeof x === 'number') : []);

/** The typed entry as a number, or null while it isn't one yet (empty, "-", "."). */
function entered(spec: Extract<ResponseSpec, { kind: 'numeric' }>, value: ResponseValue) {
  if (spec.entry === 'decimal') return typeof value === 'string' ? parseDecimal(value) : null;
  return Array.isArray(value) && typeof value[0] === 'string' && typeof value[1] === 'string' ? parseFraction(value[0], value[1]) : null;
}

export function isComplete(spec: ResponseSpec, value: ResponseValue): boolean {
  switch (spec.kind) {
    case 'choice':
    case 'sentence':
      return typeof value === 'number';
    case 'dichotomous':
    case 'dropdowns': {
      const p = parts(value);
      return p.length === spec.statements.length && p.every((x) => x !== null);
    }
    case 'two-part': {
      const p = parts(value);
      return p.length === 2 && p.every((x) => x !== null);
    }
    case 'multi': {
      const n = ticked(value).length;
      return spec.pick ? n === spec.pick : n > 0;
    }
    case 'numeric':
      return entered(spec, value) !== null;
    case 'blanks': {
      const p = parts(value);
      return p.length === spec.blanks.length && p.every((x) => x !== null);
    }
  }
}

/** Some of the answer is given but not all of it (one of two blanks, one of two Sentence Equivalence choices). */
export function isPartial(spec: ResponseSpec, value: ResponseValue): boolean {
  if (isComplete(spec, value)) return false;
  switch (spec.kind) {
    case 'dichotomous':
    case 'dropdowns':
    case 'two-part':
    case 'blanks':
      return parts(value).some((x) => x !== null);
    case 'multi':
      return ticked(value).length > 0;
    case 'numeric':
      return Array.isArray(value) ? value.some((x) => String(x ?? '').trim() !== '') : typeof value === 'string' && value.trim() !== '';
    default:
      return false;
  }
}

export function isCorrect(spec: ResponseSpec, value: ResponseValue): boolean {
  if (!isComplete(spec, value)) return false;
  switch (spec.kind) {
    case 'choice':
    case 'sentence':
      return value === spec.answer;
    case 'dichotomous':
    case 'dropdowns':
      return spec.statements.every((s, i) => parts(value)[i] === s.answer);
    case 'two-part':
      return parts(value)[0] === spec.answer[0] && parts(value)[1] === spec.answer[1];
    case 'multi': {
      const t = [...new Set(ticked(value))].sort((a, b) => a - b);
      return t.length === spec.answer.length && t.every((x, i) => x === spec.answer[i]);
    }
    case 'numeric': {
      const key = parseNumber(spec.answer, spec.entry);
      const given = entered(spec, value);
      return !!key && !!given && sameNumber(key, given);
    }
    case 'blanks':
      return spec.blanks.every((b, i) => parts(value)[i] === b.answer);
  }
}

/** Correct answer expressed as a ResponseValue, e.g. for review screens. */
export function correctResponse(spec: ResponseSpec): ResponseValue {
  switch (spec.kind) {
    case 'choice':
    case 'sentence':
      return spec.answer;
    case 'dichotomous':
    case 'dropdowns':
      return spec.statements.map((s) => s.answer);
    case 'two-part':
      return [...spec.answer];
    case 'multi':
      return [...spec.answer];
    case 'numeric': {
      if (spec.entry === 'decimal') return spec.answer;
      const [n, d] = spec.answer.split('/');
      return [n.trim(), d.trim()];
    }
    case 'blanks':
      return spec.blanks.map((b) => b.answer);
  }
}
