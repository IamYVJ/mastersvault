// Response helpers shared by the question views and the test engine.
// Multi-part questions earn credit only when every part is correct.
import type { ResponseSpec, ResponseValue } from '../content/types.ts';

export function emptyResponse(spec: ResponseSpec): ResponseValue {
  switch (spec.kind) {
    case 'choice':
      return null;
    case 'dichotomous':
    case 'dropdowns':
      return spec.statements.map(() => null);
    case 'two-part':
      return [null, null];
  }
}

const parts = (v: ResponseValue): (number | null)[] => (Array.isArray(v) ? v : []);

export function isComplete(spec: ResponseSpec, value: ResponseValue): boolean {
  switch (spec.kind) {
    case 'choice':
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
  }
}

export function isCorrect(spec: ResponseSpec, value: ResponseValue): boolean {
  if (!isComplete(spec, value)) return false;
  switch (spec.kind) {
    case 'choice':
      return value === spec.answer;
    case 'dichotomous':
    case 'dropdowns':
      return spec.statements.every((s, i) => parts(value)[i] === s.answer);
    case 'two-part':
      return parts(value)[0] === spec.answer[0] && parts(value)[1] === spec.answer[1];
  }
}

/** Correct answer expressed as a ResponseValue, e.g. for review screens. */
export function correctResponse(spec: ResponseSpec): ResponseValue {
  switch (spec.kind) {
    case 'choice':
      return spec.answer;
    case 'dichotomous':
    case 'dropdowns':
      return spec.statements.map((s) => s.answer);
    case 'two-part':
      return [...spec.answer];
  }
}
