// Independently recomputes each Mock 5 and Mock 6 quant answer (ps-0135..ps-0176) and compares it with the keyed choice.
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
const comb = (n, k) => { let r = 1; for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1); return r; };
const solve = (pred, lo, hi, step = 1) => { const out = []; for (let x = lo; x <= hi + 1e-9; x += step) { const v = Math.round(x * 1e6) / 1e6; if (pred(v)) out.push(v); } return out; };
const one = (xs) => (xs.length === 1 ? xs[0] : NaN);
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const primeFactors = (n) => { const f = []; for (let d = 2; n > 1; d++) while (n % d === 0) { f.push(d); n /= d; } return f; };
const subsets = (arr, k) => (k === 0 ? [[]] : arr.flatMap((x, i) => subsets(arr.slice(i + 1), k - 1).map((s) => [x, ...s])));

const expected = {
  // ---- Mock 5
  'ps-0135': Math.max(...primeFactors(2 ** 10 - 4)),
  'ps-0136': (() => { const ns = solve((n) => (n * n) % 72 === 0, 1, 5000); return ns.reduce(gcd); })(),
  'ps-0137': one(solve((c) => close((3 / 5) * c + 12, (3 / 4) * c), 1, 500)),
  'ps-0138': one(solve((p) => close(0.8 * p, 36), 1, 200, 0.05)),
  'ps-0139': one(solve((n) => close(0.6 * 0.75 * n - 0.4 * 0.75 * n, 2400), 1000, 40000, 500)),
  'ps-0140': (() => { const k = one(solve((k) => 5 * k - 2 * k === 18, 1, 100)); return 10 * k; })(),
  'ps-0141': (3 ** 2) ** 3 / 3 ** 4,
  'ps-0142': one(solve((x) => x + 7 >= 0 && close(Math.sqrt(x + 7), x - 5), -7, 100, 0.5)),
  'ps-0143': 5 * 85 - 4 * 82,
  'ps-0144': (() => {
    let best = -Infinity;
    for (let a = 1; a <= 20; a++) for (let b = a; b <= 20; b++) for (let c = b; c <= 20; c++) { const d = 14 - c; if (d < c) continue;
      for (let e = d; e <= 30; e++) { const f = 48 - a - b - c - d - e; if (f < e) continue;
        const counts = {}; [a, b, c, d, e, f].forEach((v) => (counts[v] = (counts[v] ?? 0) + 1));
        const max = Math.max(...Object.values(counts)); const modes = Object.keys(counts).filter((k) => counts[k] === max);
        if (max >= 2 && modes.length === 1 && modes[0] === '5') best = Math.max(best, f); } }
    return best;
  })(),
  'ps-0145': solve((n) => { const d = String(n).split('').map(Number); return d.every((x) => x % 2 === 1) && new Set(d).size === 3; }, 100, 999).length,
  'ps-0146': (() => { const pairs = subsets([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 2); return pairs.filter(([a, b]) => (a + b) % 2 === 0).length / pairs.length; })(),
  'ps-0147': one(solve((k) => close(3.5 + 1.25 * k, 16), 0, 100, 0.1)),
  'ps-0148': (() => { const x = one(solve((x) => x + 2 * x + 2 * x + 4 === 84, 1, 84)); return Math.max(x, 2 * x, 2 * x + 4); })(),
  'ps-0149': (() => { const k = one(solve((k) => 9 + 3 * k - 24 === 0, -50, 50)); return one(solve((x) => x !== 3 && x * x + k * x - 24 === 0, -50, 50)); })(),
  'ps-0150': solve((k) => k * k - 36 < 0, -50, 50).length,
  'ps-0151': NaN, // checked separately below
  'ps-0152': one(solve((x) => close(4 * x - 4 - x, 14), -50, 50, 0.5)),
  'ps-0153': 1 / (1 / 8 - 1 / 12),
  'ps-0154': one(solve((x) => close(0.3 * 12 + 0.6 * x, 0.4 * (12 + x)), 0, 100, 0.5)),
  // least number passing all three: 40 minus the most students who can fail at least one exam
  'ps-0155': 40 - Math.min(40, 40 - 28 + (40 - 30) + (40 - 25)),

  // ---- Mock 6
  'ps-0156': (18 * 24) / gcd(18, 24) - gcd(18, 24),
  'ps-0157': solve((n) => n % 6 === 0 && n % 9 !== 0, 1, 199).length,
  'ps-0158': (1 / 2 - 1 / 4) / (2 / 3 - 1 / 4),
  'ps-0159': 0.08 * (12500 - 5000),
  'ps-0160': 1.2 * 0.75 * 100,
  'ps-0161': (2 / 3) * (4 / 5),
  'ps-0162': one(solve((x) => close(42 / (18 + x), 3 / 2), 0, 100, 0.5)),
  'ps-0163': one(solve((x) => close(5 ** (2 * x - 1), 125), -5, 10, 0.5)),
  'ps-0164': Math.sqrt(7 + 4 * Math.sqrt(3)) - Math.sqrt(7 - 4 * Math.sqrt(3)),
  'ps-0165': one(solve((x) => { const s = [12, 5, 9, x, 20].sort((a, b) => a - b); return s[2] === 12 && s[4] - s[0] === 17; }, -50, 100, 0.5)),
  'ps-0166': 3 * 5 * 2,
  'ps-0167': subsets([0, 1, 2, 3, 4, 5, 6, 7], 5).length * 5,
  'ps-0168': one(solve((x) => 5 * x - 3 === 3 * x + 11, -50, 50)),
  'ps-0169': one(solve((m) => close(30 + 0.05 * m, 18 + 0.08 * m), 0, 5000)),
  'ps-0170': one(solve((x) => x < 0 && x * x - 6 * x === 16, -50, 50)),
  'ps-0171': Math.max(...solve((x) => Math.abs(x - 4) <= 3 + 1e-12, -10, 20, 0.001).map((x) => Math.round((x * x - 8 * x) * 1e6) / 1e6)),
  'ps-0172': (() => { const r = Math.round(Math.cbrt(162 / 6) * 1e9) / 1e9; return 6 * r; })(),
  'ps-0173': 300 / (45 / 1.5),
  'ps-0174': (() => { // simulate positions on the track; count meetings
    let t = 0, meetings = 0; const dt = 0.01; let prev = 0;
    while (meetings < 3) { t += dt; const gap = (8 * t) % 400; if (gap < prev) meetings++; prev = gap; }
    return Math.round(t);
  })(),
  'ps-0175': (() => { const rate = 2 ** (1 / 9); let v = 1, years = 0; while (v < 8 - 1e-9) { v *= rate; years++; } return years; })(),
  'ps-0176': (() => { const both = 50 + 40 - 80; return 80 - both; })(),
};

const letters = 'ABCDE';
let fail = 0;
const dist = { m5: {}, m6: {} };
for (const [id, want] of Object.entries(expected)) {
  const d = exam.questions.get(id).data;
  const bucket = Number(id.slice(3)) <= 155 ? 'm5' : 'm6';
  dist[bucket][d.answer] = (dist[bucket][d.answer] ?? 0) + 1;
  if (Number.isNaN(want)) continue;
  const values = d.choices.map(num);
  const keyed = values[letters.indexOf(d.answer)];
  const hits = values.filter((v) => close(v, want)).length;
  const ok = close(keyed, want) && hits === 1;
  if (!ok) fail++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${id}  keyed=${keyed}  computed=${want}  matches=${hits}`);
}

// ps-0151: test the keyed range against sampled points.
{
  const truth = (x) => 3 - 2 * x >= 7 && x + 6 > 1;
  const ranges = {
    '$x \\le -2$': (x) => x <= -2, '$-5 < x \\le -2$': (x) => -5 < x && x <= -2, '$-2 \\le x < 5$': (x) => -2 <= x && x < 5,
    '$x > -5$': (x) => x > -5, '$-5 \\le x < -2$': (x) => -5 <= x && x < -2,
  };
  const d = exam.questions.get('ps-0151').data;
  const matching = d.choices.filter((c) => ranges[c] && solve(() => true, -10, 10, 0.25).every((x) => ranges[c](x) === truth(x)));
  const ok = matching.length === 1 && matching[0] === d.choices[letters.indexOf(d.answer)];
  if (!ok) fail++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ps-0151  matching=${JSON.stringify(matching)}`);
}

console.log('answer letters:', JSON.stringify(dist), fail ? `\n${fail} FAILED` : '\nall verified');
process.exit(fail ? 1 : 0);
