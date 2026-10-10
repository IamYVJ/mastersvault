// Independently recomputes each answer in the Quant Foundation and Challenge sets (ps-0177..ps-0206)
// and compares it with the keyed choice. Run from the project root.
import { getExam } from '../../src/lib/content/index.ts';

const exam = getExam('gmat');
const num = (s) => {
  const t = String(s).replace(/[$\\,\s%]/g, '').replace(/−/g, '-');
  const f = /^frac\{(-?\d+)\}\{(\d+)\}$/.exec(t);
  if (f) return Number(f[1]) / Number(f[2]);
  return Number(t);
};
const close = (a, b) => Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(b));
const range = (lo, hi, step = 1) => { const r = []; for (let x = lo; x <= hi + 1e-9; x += step) r.push(Math.round(x * 1e6) / 1e6); return r; };
const one = (xs) => (xs.length === 1 ? xs[0] : NaN);
const isPrime = (n) => { if (n < 2) return false; for (let i = 2; i * i <= n; i++) if (n % i === 0) return false; return true; };
const factors = (n) => range(1, n).filter((d) => n % d === 0).length;
const arrangements = (letters) => {
  const out = new Set();
  const go = (rest, built) => { if (!rest.length) return out.add(built); rest.forEach((c, i) => go([...rest.slice(0, i), ...rest.slice(i + 1)], built + c)); };
  go([...letters], '');
  return [...out];
};

const expected = {
  // ---- Foundation
  'ps-0177': 48 - (48 * 3) / 8,
  'ps-0178': 120 * 1.15,
  'ps-0179': one(range(0, 20, 0.5).filter((b) => close(b / (20 - b), 2 / 3))),
  'ps-0180': Math.sqrt(36 + 64),
  'ps-0181': range(21, 39).filter(isPrime).length,
  'ps-0182': (() => { const s = [3, 7, 5, 9, 5, 13].sort((a, b) => a - b); return (s[2] + s[3]) / 2; })(),
  'ps-0183': one(range(0, 10).filter((c) => 2 * 12 + 7 * c === 45)),
  'ps-0184': (() => { let t = 0, filled = 0; const dt = 1e-4; while (filled < 1 - 1e-9) { filled += (1 / 6 + 1 / 3) * dt; t += dt; } return Math.round(t * 100) / 100; })(),
  'ps-0185': 2400 * 0.05 * (18 / 12),
  'ps-0186': (() => { const partTime = 120 - 70, partTimeLaptop = 48 - 40; return partTime - partTimeLaptop; })(),
  'ps-0187': (() => { let n = 0; for (const a of 'ABCDE') for (const b of 'ABCDE') for (const d of '1234') if (a !== b && d) n++; return n; })(),
  'ps-0188': (() => { const r = new Set(); for (const x of range(-30, 30, 0.5)) for (const y of range(-30, 30, 0.5)) if (x * x - y * y === 48 && x - y === 4) r.add(x + y); return one([...r]); })(),
  'ps-0189': range(-50, 50).filter((x) => -7 < 2 * x + 1 && 2 * x + 1 <= 9).length,
  'ps-0190': one(range(-50, 50, 0.5).filter((a) => 2 * (2 * a - 3) - 3 === 19)),
  'ps-0191': one(range(100, 5000, 10).filter((p) => { const afterRent = p - p / 3; return close(afterRent - afterRent / 4, 900); })),

  // ---- Challenge
  'ps-0192': range(1, 19, 2).reduce((s, k) => s + 1 / (k * (k + 2)), 0),
  'ps-0193': one(range(1, 99, 0.5).filter((c) => close(120 - 1.1 * c, 1.5 * (100 - c)))),
  'ps-0194': (() => { const r = []; for (let m = 1; m <= 200; m++) { const s = 8 * m; if (5 * (m + 4) === s - 4) r.push(m + s); } return one(r); })(),
  'ps-0195': String(BigInt(8) ** 5n * BigInt(25) ** 6n).length,
  'ps-0196': (() => { const n = one(range(1, 500).filter((k) => close((15 * k + 39) / (k + 1), 17))); return 18 * (n + 2) - (15 * n + 39); })(),
  'ps-0197': (() => { let best = Infinity; for (let c = 0; c <= 30; c++) for (let w = 0; c + w <= 30; w++) if (4 * c - w === 84) best = Math.min(best, 30 - c - w); return best; })(),
  'ps-0198': (() => { const d = Math.sqrt(36 - 16); const r = (6 + d) / 2, s = (6 - d) / 2; return r / s + s / r; })(),
  'ps-0199': range(-100, 100).filter((x) => Math.abs(x - 2) + Math.abs(x + 4) < 10).length,
  'ps-0200': one(range(0.1, 50, 0.1).filter((r) => close(10000 * (1 + r / 100) ** 2 - 10000 - 2 * 10000 * (r / 100), 64))),
  'ps-0201': one(range(5, 60, 0.5).filter((T) => close((T - 5) / 20 + T / 30, 1))),
  'ps-0202': range(1, 999).filter((n) => factors(n) === 3).length,
  'ps-0203': arrangements('COFFEE').filter((w) => !/(.)\1/.test(w)).length,
  'ps-0204': (() => { let more = 0; for (let m = 0; m < 64; m++) { const heads = m.toString(2).split('1').length - 1; if (heads > 6 - heads) more++; } return more / 64; })(),
  // f(x) + 2 f(1 - x) = 3x at x = 0 and x = 1: search for the values f(0) and f(1)
  'ps-0205': (() => { const r = []; for (const f0 of range(-10, 10, 0.5)) for (const f1 of range(-10, 10, 0.5)) if (f0 + 2 * f1 === 0 && f1 + 2 * f0 === 3) r.push(f0); return one(r); })(),
  // region counts: pairs ab, ac, bc and all three abc; singles follow from the group sizes
  'ps-0206': (() => {
    let best = -1;
    for (let abc = 0; abc <= 45; abc++) for (let ab = 0; ab <= 75; ab++) for (let ac = 0; ac <= 75; ac++) for (let bc = 0; bc <= 60; bc++) {
      const a = 75 - ab - ac - abc, b = 60 - ab - bc - abc, c = 45 - ac - bc - abc;
      if (a < 0 || b < 0 || c < 0) continue;
      if (a + b + c + ab + ac + bc + abc === 120) best = Math.max(best, abc);
    }
    return best;
  })(),
};

const letters = 'ABCDE';
let fail = 0;
const tally = (ids) => ids.reduce((d, id) => { const a = exam.questions.get(id).data.answer; d[a] = (d[a] ?? 0) + 1; return d; }, {});
for (const [id, want] of Object.entries(expected)) {
  const d = exam.questions.get(id).data;
  const values = d.choices.map(num);
  const keyed = values[letters.indexOf(d.answer)];
  const hits = values.filter((v) => close(v, want)).length;
  const ok = close(keyed, want) && hits === 1;
  if (!ok) fail++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${id}  keyed=${keyed}  computed=${want}  matches=${hits}`);
}

// The total number of arrangements of COFFEE, used in the explanation of ps-0203.
{ const total = arrangements('COFFEE').length; const ok = total === 180; if (!ok) fail++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ps-0203 total arrangements=${total}`); }

const ids = Object.keys(expected);
console.log('answer letters: foundation', tally(ids.slice(0, 15)), 'challenge', tally(ids.slice(15)), fail ? `\n${fail} FAILED` : '\nall verified');
process.exit(fail ? 1 : 0);
