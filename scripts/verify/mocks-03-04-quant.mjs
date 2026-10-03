// Independently recomputes each Mock 3 and Mock 4 quant answer (ps-0093..ps-0134) and compares it with the keyed choice.
import { getExam } from '../../src/lib/content/index.ts';

const exam = getExam('gmat');
const num = (s) => {
  const t = String(s).replace(/[$\\,\s%]/g, '').replace(/−/g, '-').replace(/^About/, '');
  const f = /^frac\{(-?\d+)\}\{(\d+)\}$/.exec(t);
  if (f) return Number(f[1]) / Number(f[2]);
  const p = /^(\d+)\^\{?(\d+)\}?$/.exec(t);
  if (p) return Number(p[2]) * Math.log(Number(p[1])); // compare powers by their logarithms
  return Number(t);
};
const close = (a, b) => Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(b));
const comb = (n, k) => { let r = 1; for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1); return r; };
const solve = (pred, lo, hi, step = 1) => { const out = []; for (let x = lo; x <= hi + 1e-9; x += step) { const v = Math.round(x * 1e6) / 1e6; if (pred(v)) out.push(v); } return out; };
const one = (xs) => (xs.length === 1 ? xs[0] : NaN);
const divisors = (n) => solve((d) => n % d === 0, 1, n);
const subsets = (arr, k) => (k === 0 ? [[]] : arr.flatMap((x, i) => subsets(arr.slice(i + 1), k - 1).map((s) => [x, ...s])));
const sd = (xs) => { const m = xs.reduce((a, b) => a + b) / xs.length; return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length); };
const nearest = (id, value) => { const vals = exam.questions.get(id).data.choices.map(num); return vals.reduce((a, b) => (Math.abs(b - value) < Math.abs(a - value) ? b : a)); };

const expected = {
  'ps-0093': divisors(720).filter((d) => d % 6 === 0).length,
  'ps-0094': Math.max(5 / 8, 0.61, 13 / 21, 0.63, 7 / 11),
  'ps-0095': one(solve((n) => close(0.7 * n, 4200), 1, 20000)),
  'ps-0096': one(solve((x) => close(100 * 1.1 * (1 - x / 100), 99), 0, 50, 0.5)),
  'ps-0097': (() => { const k = one(solve((k) => 3 * (3 * k + 6) === 2 * (5 * k + 6), 1, 50)); return 3 * k; })(),
  'ps-0098': Math.round((Math.sqrt(12) + Math.sqrt(27)) ** 2 * 1e9) / 1e9,
  'ps-0099': one(solve((x) => 2 ** (2 * x) - 2 ** (x + 1) === 48, -10, 10, 0.5)),
  'ps-0100': (() => { const sets = [[9, 10, 11], [5, 10, 15], [0, 15, 15, 15, 30], [0, 0, 20, 20], [2, 4, 6, 8, 10]]; const s = sets.map(sd); return 'ABCDE'.indexOf('ABCDE'[s.indexOf(Math.max(...s))]); })(),
  'ps-0101': (() => { const x = one(solve((x) => (x + 2 * x + 3 * x) / 3 === 18, 0, 100)); return 3 * x; })(),
  'ps-0102': (() => { const bag = 'RRRBBBBGGGGG'; let same = 0, all = 0; for (let i = 0; i < 12; i++) for (let j = i + 1; j < 12; j++) { all++; if (bag[i] === bag[j]) same++; } return same / all; })(),
  'ps-0103': subsets([...Array(11).keys()], 4).filter((c) => c.filter((p) => p >= 6).length >= 2).length,
  'ps-0104': one(solve((x) => 3 * x + 4 === 2 * (x - 1) + 7, -50, 50)),
  'ps-0105': (() => { const r = []; for (let l = 0; l <= 120; l++) if (4 * (120 - l) + 7 * l === 645) r.push(l); return one(r); })(),
  'ps-0106': one(solve((x) => x * x - 9 * x + 20 === 0 && x * x - x - 12 === 0, -50, 50)),
  'ps-0107': (() => { let best = -Infinity; for (let t = 0; t <= 6; t += 0.001) best = Math.max(best, -5 * t * t + 20 * t + 25); return Math.round(best * 1000) / 1000; })(),
  'ps-0108': NaN, // checked separately below
  'ps-0109': NaN, // checked separately below
  'ps-0110': 70 * (450 / 150),
  'ps-0111': one(solve((v) => close(120 / (60 / 12 + 60 / v), 15), 12.5, 100, 0.5)),
  'ps-0112': one(solve((x) => close(0.04 * (12000 - x) + 0.07 * x, 630), 0, 12000, 100)),
  'ps-0113': (() => { const r = []; for (let n = 0; n <= 30; n++) { const both = 2 * n; if (35 + 28 - both + n === 60) r.push(n); } return one(r); })(),

  'ps-0114': (13n ** 43n * 7n ** 22n) % 10n === 3n ? 3 : Number((13n ** 43n * 7n ** 22n) % 10n),
  'ps-0115': solve((n) => (n % 3 === 0) !== (n % 5 === 0), 1, 100).length,
  'ps-0116': (1 / 2 + 1 / 3) / (1 / 2 - 1 / 3),
  'ps-0117': 0.15 * 0.4 * 600,
  'ps-0118': (1 - 1 / 1.25) * 100,
  'ps-0119': (40000 * 5) / 10,
  'ps-0120': (() => { const t = one(solve((t) => 14 * (t + 6) === 15 * t + 60, 1, 1000)); return 15 * t; })(),
  'ps-0121': (2 ** 5 * 2 ** -3) ** 2 / 2 ** 3,
  'ps-0122': Math.max(...[[2, 60], [3, 40], [5, 25], [6, 20], [10, 15]].map(([b, e]) => e * Math.log(b))),
  'ps-0123': (() => { let best = 0; for (let a = 1; a < 60; a++) for (let b = a + 1; b < 60; b++) for (let c = b + 1; c < 60; c++) { const d = 60 - a - b - c; if (d > c) best = Math.max(best, d); } return best; })(),
  'ps-0124': NaN, // replaced by the direct search below
  'ps-0125': 1 - 1 / 8,
  'ps-0126': (() => { const people = [...Array(10).keys()]; const groups = subsets(people, 3); return groups.filter((g) => new Set(g.map((p) => Math.floor(p / 2))).size === 3).length / groups.length; })(),
  'ps-0127': ((42 + 8) / 2) * ((42 - 8) / 2),
  'ps-0128': one(solve((k) => [-2, 0, 1, 3].every((x) => (x - 3) * (x + k) === x * x + 2 * x - 15), -20, 20)),
  'ps-0129': (() => { const x = (5 + Math.sqrt(21)) / 2; return Math.round((x * x + 1 / (x * x)) * 1e9) / 1e9; })(),
  'ps-0130': solve((n) => n * n < 30 && Math.abs(n - 2) >= 3, -20, 20).length,
  'ps-0131': (() => { let a = 3; for (let n = 2; n <= 6; n++) a = 2 * a - 1; return a; })(),
  'ps-0132': (240 / (6 * 4)) * 9 * 5,
  'ps-0133': one(solve((w) => close(6 / (30 - w), 0.25), 0, 29, 0.5)),
  'ps-0134': nearest('ps-0134', (25 / (25 + 0.3 * 60)) * 100),
};

// ps-0124 by direct search: 9 distinct integers, median 20, sum 189, minimise the largest.
{
  let best = Infinity;
  const lows = subsets([...Array(19).keys()].map((i) => i + 1), 4).map((s) => s.reduce((a, b) => a + b));
  const lowSums = new Set(lows);
  for (let a = 21; a < 40; a++) for (let b = a + 1; b < 40; b++) for (let c = b + 1; c < 40; c++) for (let d = c + 1; d < 40; d++) {
    if (d >= best) continue;
    if (lowSums.has(189 - 20 - a - b - c - d)) best = d;
  }
  expected['ps-0124'] = best;
}

const letters = 'ABCDE';
let fail = 0;
const dist = { m3: {}, m4: {} };
for (const [id, want] of Object.entries(expected)) {
  const d = exam.questions.get(id).data;
  const bucket = Number(id.slice(3)) <= 113 ? 'm3' : 'm4';
  dist[bucket][d.answer] = (dist[bucket][d.answer] ?? 0) + 1;
  if (Number.isNaN(want)) continue;
  if (id === 'ps-0100') { const ok = letters.indexOf(d.answer) === want; if (!ok) fail++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${id}  keyed=${d.answer} computed=${letters[want]}`); continue; }
  const values = d.choices.map(num);
  const keyed = values[letters.indexOf(d.answer)];
  const hits = values.filter((v) => close(v, want)).length;
  const ok = close(keyed, want) && hits === 1;
  if (!ok) fail++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${id}  keyed=${keyed}  computed=${want}  matches=${hits}`);
}

// ps-0108: test each Roman-numeral statement over many sample points.
{
  const pts = []; for (let x = -10; x < 0; x += 0.5) for (let y = 0.5; y <= 10; y += 0.5) if (Math.abs(x) > Math.abs(y)) pts.push([x, y]);
  const must = [([x, y]) => x + y < 0, ([x, y]) => x * x > y * y, ([x, y]) => y - x < 0].map((f) => pts.every(f));
  const label = { 'true,true,false': 'I and II only' }[must.join()] ?? must.join();
  const d = exam.questions.get('ps-0108').data; const keyed = d.choices[letters.indexOf(d.answer)];
  const ok = keyed === label; if (!ok) fail++; console.log(`${ok ? 'ok  ' : 'FAIL'} ps-0108  keyed=${keyed} computed=${label}`);
}
// ps-0109: compare the keyed expression with f(a+1) - f(a) for several values of a.
{
  const f = (x) => x * x - 3 * x; const exprs = { '$2a - 2$': (a) => 2 * a - 2, '$2a - 3$': (a) => 2 * a - 3, '$2a + 1$': (a) => 2 * a + 1, '$a^2 - 2$': (a) => a * a - 2, '$-2$': () => -2 };
  const d = exam.questions.get('ps-0109').data;
  const matching = d.choices.filter((c) => [-3, 0, 1, 2, 7].every((a) => exprs[c](a) === f(a + 1) - f(a)));
  const ok = matching.length === 1 && matching[0] === d.choices[letters.indexOf(d.answer)]; if (!ok) fail++; console.log(`${ok ? 'ok  ' : 'FAIL'} ps-0109  matching=${JSON.stringify(matching)}`);
}

console.log('answer letters:', JSON.stringify(dist), fail ? `\n${fail} FAILED` : '\nall verified');
process.exit(fail ? 1 : 0);
