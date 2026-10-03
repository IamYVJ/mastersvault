// Independently recomputes each Mock 1 quant answer and compares it with the keyed choice.
import { getExam } from '../../src/lib/content/index.ts';

const exam = getExam('gmat');
const norm = (s) =>
  String(s)
    .replace(/\\frac\{(-?\d+)\}\{(\d+)\}/g, '$1/$2')
    .replace(/[$\\,\s]/g, '')
    .replace(/−/g, '-');

const comb = (n, k) => { let r = 1; for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1); return r; };
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const frac = (n, d) => { const g = gcd(n, d); return `${n / g}/${d / g}`; };
const sd = (xs) => { const m = xs.reduce((a, b) => a + b, 0) / xs.length; return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / xs.length); };

const expected = {
  'ps-0006': frac(3 * 6 * 3 + 5 * 4 * 3 - 1 * 4 * 6, 4 * 6 * 3), // common denominator 72
  'ps-0007': (() => { for (let k = 1; k < 100; k++) if (5 * k - 3 * k === 12) return 8 * k; })(),
  'ps-0008': (36 / 0.8).toFixed(2),
  'ps-0009': (() => { for (let a = 0; a <= 50; a++) if (12 * a + 7 * (50 - a) === 475) return a; })(),
  'ps-0010': (() => { for (let x = -5; x < 10; x++) if (3 ** (x + 2) - 3 ** x === 72) return x; })(),
  'ps-0011': (() => {
    // search x on a fine grid for median 6, then mean
    for (let x = -100; x <= 100; x += 0.5) { const s = [7, 3, 9, x, 5].sort((a, b) => a - b); if (s[2] === 6) return [7, 3, 9, x, 5].reduce((a, b) => a + b) / 5; }
  })(),
  'ps-0012': (() => { // brute force committees: 5 men (0-4), 4 women (5-8)
    let n = 0; for (let a = 0; a < 9; a++) for (let b = a + 1; b < 9; b++) for (let c = b + 1; c < 9; c++) if (a >= 5 || b >= 5 || c >= 5) n++; return n; })(),
  'ps-0013': (() => { let e = 0; for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if ((a * b) % 2 === 0) e++; return frac(e, 36); })(),
  'ps-0014': (() => { for (let d = 1; d < 1000; d++) if (Math.abs(d / 40 + d / 60 - 5) < 1e-9) return d; })(),
  'ps-0015': (() => { for (let x = 0; x < 100; x += 0.5) if (Math.abs((0.3 * 20 + 0.6 * x) / (20 + x) - 0.4) < 1e-9) return x; })(),
  'ps-0016': Math.round(5000 * 1.04 ** 2),
  'ps-0017': (() => { let n = 0; for (let i = 1; i < 100; i++) { const a = i % 3 === 0, b = i % 5 === 0; if (a !== b) n++; } return n; })(),
  'ps-0018': Number(7n ** 45n % 5n),
  'ps-0019': (() => { let n = 0; for (let x = -100; x <= 100; x++) if (Math.abs(2 * x - 5) < 7) n++; return n; })(),
  'ps-0020': (() => { for (let k = -50; k <= 50; k++) { const disc = 25 - 4 * k; if (disc >= 0 && Math.abs(Math.sqrt(disc) - 3) < 1e-9) return k; } })(),
  'ps-0021': (() => { let a = 3; for (let n = 2; n <= 6; n++) a = 2 * a - 1; return a; })(),
  'ps-0022': (() => { const f = (x) => x * x - 4 * x; for (const a of [-2, -1, 0.5, 1, 2]) if (f(a) === f(3 * a)) return a; })(),
  'ps-0023': 35 + 28 + 10 - 60,
  'ps-0024': (() => {
    const s = sd([2, 4, 6, 8, 10]); const same = (xs) => Math.abs(sd(xs) - s) < 1e-9;
    const r = [same([12, 14, 16, 18, 20]), same([1, 2, 3, 4, 5]), same([-10, -8, -6, -4, -2])];
    return ['I', 'II', 'III'].filter((_, i) => r[i]).join(' and ') + ' only';
  })(),
  'ps-0025': (() => { const C = 60000 / 0.25; return 1.25 * C; })(),
  'ps-0026': (() => { for (let x = -50; x < 50; x++) if (3 * x - 7 === 2 * x + 5) return x; })(),
};

const letters = 'ABCDE';
let fail = 0;
const dist = {};
for (const [id, want] of Object.entries(expected)) {
  const q = exam.questions.get(id);
  const keyed = q.data.choices[letters.indexOf(q.data.answer)];
  const ok = norm(keyed) === norm(want);
  dist[q.data.answer] = (dist[q.data.answer] ?? 0) + 1;
  // the computed answer must appear exactly once among the choices
  const hits = q.data.choices.filter((c) => norm(c) === norm(want)).length;
  if (!ok || hits !== 1) fail++;
  console.log(`${ok && hits === 1 ? 'ok  ' : 'FAIL'} ${id}  keyed=${norm(keyed)}  computed=${norm(want)}  matches=${hits}`);
}
console.log('answer letters:', dist, fail ? `\n${fail} FAILED` : '\nall verified');
process.exit(fail ? 1 : 0);
