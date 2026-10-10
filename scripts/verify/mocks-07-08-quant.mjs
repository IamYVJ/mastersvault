// Independently recomputes each Mock 7 and Mock 8 quant answer (ps-0207..ps-0248) and compares it with the keyed choice.
import { getExam } from '../../src/lib/content/index.ts';

const exam = getExam('gmat');
const num = (s) => {
  const t = String(s).replace(/[$\\,\s%]/g, '').replace(/−/g, '-');
  const f = /^frac\{(-?\d+)\}\{(\d+)\}$/.exec(t);
  if (f) return Number(f[1]) / Number(f[2]);
  const r = /^(\d*)sqrt\{(\d+)\}$/.exec(t);
  if (r) return (r[1] ? Number(r[1]) : 1) * Math.sqrt(Number(r[2]));
  const ratio = /^(\d+):(\d+)$/.exec(t);
  if (ratio) return Number(ratio[1]) / Number(ratio[2]);
  return Number(t);
};
const close = (a, b) => Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(b));
const solve = (pred, lo, hi, step = 1) => { const out = []; for (let x = lo; x <= hi + 1e-9; x += step) { const v = Math.round(x * 1e6) / 1e6; if (pred(v)) out.push(v); } return out; };
const one = (xs) => (xs.length === 1 ? xs[0] : NaN);
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const subsets = (arr, k) => (k === 0 ? [[]] : arr.flatMap((x, i) => subsets(arr.slice(i + 1), k - 1).map((s) => [x, ...s])));
const isSquare = (n) => Number.isInteger(Math.sqrt(n));
const isCube = (n) => { const r = Math.round(Math.cbrt(n)); return r * r * r === n; };

const expected = {
  // ---- Mock 7
  'ps-0207': one(solve((x) => 4 * (x - 2) === x + 10, -50, 50, 0.5)),
  'ps-0208': one(solve((k) => close(k * 0.15, 2.4), 1, 500)),
  'ps-0209': 800 * 0.85 * 1.1,
  'ps-0210': solve((n) => n % 4 === 0 && n % 6 === 0, 10, 99).length,
  'ps-0211': (12 * 70 + 18 * 80) / (12 + 18),
  'ps-0212': one(solve((d) => close(2.5 / 40, 7 / d), 1, 500)),
  'ps-0213': 6 ** 4 / (2 ** 4 * 3 ** 2),
  'ps-0214': solve((n) => { const d = String(n).split(''); return n % 2 === 0 && new Set(d).size === 4 && d.every((c) => '12345'.includes(c)); }, 1000, 9999).length,
  'ps-0215': (() => { const r = []; for (const b of solve(() => true, 0, 40, 0.5)) for (const c of solve(() => true, 0, 20, 0.5)) if (b > c && close(24 / (b - c), 3) && close(24 / (b + c), 2)) r.push(c); return one(r); })(),
  'ps-0216': 3 * one(solve((t) => 3 * t - 14 === t + 14, 1, 500)),
  'ps-0217': (() => { const n = one(solve((k) => k % 2 === 0 && k * (k + 2) === 168, 1, 200)); return n + (n + 2); })(),
  'ps-0218': (() => { let m = Infinity; for (const x of solve(() => true, 3, 8, 0.25)) for (const y of solve(() => true, -2, 5, 0.25)) m = Math.min(m, x - 2 * y); return m; })(),
  'ps-0219': (() => { const r = []; for (const a of solve(() => true, -20, 20, 0.5)) for (const b of solve(() => true, -20, 20, 0.5)) if (2 * a + b === 7 && 5 * a + b === 16) r.push(10 * a + b); return one(r); })(),
  'ps-0220': one(solve((r) => close(8000 * (1 + (r / 100) * 2.5), 9300), 0.1, 30, 0.1)),
  'ps-0221': (() => { const r = []; for (let b = 1; b <= 160; b++) for (let d = 1; d <= 160; d++) { const both = b + d - 160; if (both > 0 && 5 * both === 3 * b && 2 * both === d) r.push(both); } return one(r); })(),
  'ps-0222': (() => { let n = 1n; for (let i = 1n; i <= 30n; i++) n *= i; let k = 0; while (n % 3n === 0n) { n /= 3n; k++; } return k; })(),
  'ps-0224': 4 * 10 + 4 * 15 - 7 * 12,
  'ps-0225': (() => { const all = subsets([1, 2, 3, 4, 5, 6, 7, 8, 9], 3); return all.filter((s) => (s[0] * s[1] * s[2]) % 2 === 0).length / all.length; })(),
  'ps-0226': (() => { let n = 0; for (let x = -5; x <= 5; x++) for (let y = -5; y <= 5; y++) if (Math.abs(x) + Math.abs(y) <= 3) n++; return n; })(),
  'ps-0227': one(solve((t) => close(1 - t / 6, 2 * (1 - t / 4)), 0.05, 3.95, 0.05)),

  // ---- Mock 8
  'ps-0228': (6 * 350) / 100,
  'ps-0229': Math.round((Math.sqrt(0.09) + 0.2 ** 2) * 1e9) / 1e9,
  'ps-0230': one(solve((n) => n + (n + 1) + (n + 2) === 72, 1, 100)) + 2,
  'ps-0231': Math.max(...solve((k) => (k * 2) / 3 <= 5 + 1e-9, 0, 50)),
  'ps-0232': solve((n) => n % 4 === 0 || n % 7 === 0, 1, 30).length / 30,
  'ps-0233': (6 ** 2 - 3 * 6) - (5 ** 2 - 3 * 5),
  'ps-0234': one(solve((p) => close(0.3 * (p / 100) * 200, 0.45 * 200), 1, 400, 0.5)),
  'ps-0235': one(solve((n) => gcd(30, n) === 6 && (30 * n) / gcd(30, n) === 180, 1, 2000)),
  'ps-0236': (10 * 72 - 60 - 94) / 8,
  'ps-0238': (() => { const vals = [(5 + Math.sqrt(13)) / 2, (5 - Math.sqrt(13)) / 2].map((x) => 2 * x * x - 10 * x + 11); return close(vals[0], vals[1]) ? Math.round(vals[0] * 1e9) / 1e9 : NaN; })(),
  'ps-0239': one(solve((w) => close((0.25 * 12) / (12 + w), 0.15), 0, 100, 0.1)),
  'ps-0240': (() => { const drink = 0.45 * 200, snack = 0.3 * 200, neither = 0.4 * 200; return drink + snack - (200 - neither); })(),
  'ps-0242': (3 / 4 + 2 / 5) / (1 / 4 + 3 / 5),
  'ps-0243': 1 / (Math.sqrt(3) - Math.sqrt(2)) - 1 / (Math.sqrt(3) + Math.sqrt(2)),
  'ps-0244': (() => { const r = []; for (const b of solve(() => true, -20, 20, 0.5)) for (const c of solve(() => true, -20, 20, 0.5)) if (1 + b + c === 25 + 5 * b + c && close(c - (b * b) / 4, -2)) r.push(c); return one(r); })(),
  'ps-0245': one(solve((n) => close(360 / (n - 3) - 360 / n, 6), 4, 200)),
  'ps-0246': one(solve((d) => close(0.8 * 1.25 + 0.2 * (1 - d / 100), 1.1), 0, 100, 0.5)),
  'ps-0247': solve((n) => isSquare(3 * n) && isCube(2 * n), 1, 20000)[0],
  'ps-0248': (() => { let hit = 0; for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) for (let c = 1; c <= 6; c++) if (Math.max(a, b, c) === 4) hit++; return hit / 216; })(),
};

const letters = 'ABCDE';
let fail = 0;
const report = (id, ok, detail) => { if (!ok) fail++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${id}  ${detail}`); };
const data = (id) => exam.questions.get(id).data;
const keyedChoice = (id) => { const d = data(id); return d.choices[letters.indexOf(d.answer)]; };

for (const [id, want] of Object.entries(expected)) {
  const d = data(id);
  const values = d.choices.map(num);
  const keyed = values[letters.indexOf(d.answer)];
  const hits = values.filter((v) => close(v, want)).length;
  report(id, close(keyed, want) && hits === 1, `keyed=${keyed}  computed=${want}  matches=${hits}`);
}

// ps-0223: the choices are phrases, so turn each into a signed percent (a loss is negative).
{
  const cost = 600 / 1.2 + 600 / 0.8;
  const result = ((1200 - cost) / cost) * 100;
  const signed = (c) => (/neither/.test(c) ? 0 : (/loss/.test(c) ? -1 : 1) * Number(/(\d+)/.exec(c)[1]));
  const values = data('ps-0223').choices.map(signed);
  report('ps-0223', close(signed(keyedChoice('ps-0223')), result) && values.filter((v) => close(v, result)).length === 1, `keyed=${signed(keyedChoice('ps-0223'))}  computed=${result}`);
}

// ps-0237: find the first minute at which 1,000 parts have been made, counting from 8:00 a.m.
{
  const parts = (m) => (120 * m) / 60 + (80 * Math.max(0, m - 90)) / 60;
  let m = 0; while (parts(m) < 1000 - 1e-9) m++;
  const clock = (c) => { const [, h, min, half] = /^(\d+):(\d+) (a|p)\.m\.$/.exec(c); return ((Number(h) % 12) + (half === 'p' ? 12 : 0)) * 60 + Number(min); };
  const want = 8 * 60 + m;
  report('ps-0237', clock(keyedChoice('ps-0237')) === want && data('ps-0237').choices.filter((c) => clock(c) === want).length === 1, `keyed=${keyedChoice('ps-0237')}  computed minute of day=${want}`);
}

// ps-0241: test each statement on a grid of pairs with a < b < 0.
{
  const pairs = []; for (const a of solve(() => true, -9, -0.25, 0.25)) for (const b of solve(() => true, -9, -0.25, 0.25)) if (a < b) pairs.push([a, b]);
  const always = [([a, b]) => a * a > b * b, ([a, b]) => 1 / a > 1 / b, ([a, b]) => a + b > a * b].map((f) => pairs.every(f));
  const names = ['I', 'II', 'III'].filter((_, i) => always[i]);
  const want = names.length === 1 ? `${names[0]} only` : names.length === 3 ? 'I, II and III' : `${names.join(' and ')} only`;
  report('ps-0241', keyedChoice('ps-0241') === want, `keyed=${keyedChoice('ps-0241')}  computed=${want}`);
}

// ps-0247: the two conditions hold for the keyed value and for no smaller positive integer.
{ const n = num(keyedChoice('ps-0247')); report('ps-0247', isSquare(3 * n) && isCube(2 * n) && solve((k) => isSquare(3 * k) && isCube(2 * k), 1, n - 1).length === 0, `smallest check for n=${n}`); }

const tally = (ids) => ids.reduce((t, id) => { const a = data(id).answer; t[a] = (t[a] ?? 0) + 1; return t; }, {});
const range = (lo, hi) => Array.from({ length: hi - lo + 1 }, (_, i) => `ps-${String(lo + i).padStart(4, '0')}`);
console.log('answer letters: mock 7', JSON.stringify(tally(range(207, 227))), 'mock 8', JSON.stringify(tally(range(228, 248))), fail ? `\n${fail} FAILED` : '\nall verified');
process.exit(fail ? 1 : 0);
