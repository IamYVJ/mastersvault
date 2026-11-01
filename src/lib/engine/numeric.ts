// Exact numbers for Numeric Entry questions. An entry is compared with the key as a fraction of two
// integers, so 2.5, 2.50 and 5/2 are all the same answer and no rounding error can creep in.
// Shared by the content loader (to check keys) and the test engine (to grade entries).

export interface Rational {
  /** Numerator. Carries the sign. */
  n: bigint;
  /** Denominator. Positive, except a fraction typed with a 0 denominator, which keeps d = 0. */
  d: bigint;
}

const DECIMAL = /^(-?)(\d*)(?:\.(\d*))?$/;
const INTEGER = /^-?\d+$/;

/** An integer or decimal as typed: "12", "-0.5", ".5" and "5." are fine; "", "-", "." and "1e3" are not. */
export function parseDecimal(text: string): Rational | null {
  const m = DECIMAL.exec(text.trim());
  if (!m || (!m[2] && !m[3])) return null;
  const digits = m[3] ?? '';
  const n = BigInt((m[2] || '0') + digits) * (m[1] ? -1n : 1n);
  return { n, d: 10n ** BigInt(digits.length) };
}

/** A fraction from its two boxes. Each must be an integer; a 0 denominator is kept (and never equals anything). */
export function parseFraction(numerator: string, denominator: string): Rational | null {
  const top = numerator.trim();
  const bottom = denominator.trim();
  if (!INTEGER.test(top) || !INTEGER.test(bottom)) return null;
  const n = BigInt(top);
  const d = BigInt(bottom);
  return d < 0n ? { n: -n, d: -d } : { n, d };
}

/** A key written in a question file: "12.5" for a decimal entry, "3/8" for a fraction entry. */
export function parseNumber(text: string, entry: 'decimal' | 'fraction'): Rational | null {
  if (entry === 'decimal') return parseDecimal(text);
  const parts = text.split('/');
  return parts.length === 2 ? parseFraction(parts[0], parts[1]) : null;
}

export const sameNumber = (a: Rational, b: Rational) => a.d !== 0n && b.d !== 0n && a.n * b.d === b.n * a.d;
