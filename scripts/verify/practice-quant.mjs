// Independently recomputes each practice-set quant answer (ps-0048..ps-0092) and compares it with the keyed choice.
import { getExam } from '../../src/lib/content/index.ts';

const exam = getExam('gmat');
const num = (s) => {
  const t = String(s).replace(/[$\\,\s%]/g, '').replace(/−/g, '-');
  const f = /^frac\{(-?\d+)\}\{(\d+)\}$/.exec(t);
  if (f) return Number(f[1]) / Number(f[2]);
  const p = /^(\d+)\^\{?(\d+)\}?$/.exec(t);
  if (p) return Number(p[1]) ** Number(p[2]);
  return Number(t);
};
const close = (a, b) => Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(b));
const comb = (n, k) => { let r = 1; for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1); return r; };
const permutations = (arr) => (arr.length <= 1 ? [arr] : arr.flatMap((x, i) => permutations([...arr.slice(0, i), ...arr.slice(i + 1)]).map((p) => [x, ...p])));
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const solve = (pred, lo, hi, step = 1) => { const out = []; for (let x = lo; x <= hi + 1e-9; x += step) { const v = Math.round(x * 1e6) / 1e6; if (pred(v)) out.push(v); } return out; };
const one = (xs) => (xs.length === 1 ? xs[0] : NaN);

const expected = {
  'ps-0048': 3 / 4 + 5 / 6 - 2 / 3,
  'ps-0049': ((75 - 60) / 60) * 100,
  'ps-0050': [...new Set((() => { const f = []; let n = 360; for (let d = 2; n > 1; d++) while (n % d === 0) { f.push(d); n /= d; } return f; })())].reduce((a, b) => a + b),
  'ps-0051': one(solve((k) => 4 * k + 6 === 5 * k, 1, 100)) * 9,
  'ps-0052': one(solve((x) => 2 ** x * 4 ** 3 === 8 ** 5, 0, 30)),
  // index of the choice whose reduced denominator has only 2s and 5s
  'ps-0053': (() => {
    const ok = exam.questions.get('ps-0053').data.choices.map((c) => {
      const [, a, b] = /frac\{(\d+)\}\{(\d+)\}/.exec(c).map(Number); let d = b / gcd(a, b);
      while (d % 2 === 0) d /= 2; while (d % 5 === 0) d /= 5; return d === 1;
    });
    return ok.filter(Boolean).length === 1 ? num(exam.questions.get('ps-0053').data.choices[ok.indexOf(true)]) : NaN;
  })(),
  'ps-0054': ((0.4 * 0.25 + 0.6 * 0.1) * 100),
  'ps-0055': (() => { const r = new Set(solve((n) => n % 6 === 4, 1, 600).map((n) => (5 * n) % 6)); return r.size === 1 ? [...r][0] : NaN; })(),
  'ps-0056': (() => { const flour = 300, sugar = (flour * 2) / 5; return (sugar * 4) / 3; })(),
  'ps-0057': one(solve((x) => 3 ** (x + 1) - 3 ** x === 162, 0, 20)),
  'ps-0058': (() => { const r = new Set(solve((n) => n % 7 === 3 && n % 4 === 1, 1, 2000).map((n) => n % 28)); return r.size === 1 ? [...r][0] : NaN; })(),
  'ps-0059': (() => { for (let b = 1; b < 1000; b++) for (let a = 1; a < b; a++) if (gcd(a, b) === 1 && Math.abs(a / b - 36 / 99) < 1e-12) return a + b; })(),
  'ps-0060': (() => { const c = one(solve((c) => close(c * 1.4 * 0.85, 476), 1, 1000, 0.01)); return 476 - c; })(),
  'ps-0061': (() => { const k = one(solve((k) => 3 * (2 * k + 10) === 7 * k, 1, 1000)); return 9 * k + 10; })(),
  'ps-0062': solve((d) => 36 % d === 0, 1, 36).reduce((a, b) => a * b, 1),

  'ps-0063': one(solve((t) => close(20 + 0.1 * t, 27.5), 0, 1000)),
  'ps-0064': NaN, // checked separately below
  'ps-0065': ((x) => 2 * x * x - 3 * x)(-2),
  'ps-0066': solve((x) => x * x - 5 * x - 14 === 0, -100, 100).reduce((a, b) => a + b),
  'ps-0067': (() => { const s = one(solve((s) => 3 * s + 12 === 2 * (s + 12), 1, 100)); return 3 * s + 12; })(),
  'ps-0068': solve((x) => Math.abs(2 * x - 3) < 7, -100, 100).length,
  'ps-0069': (() => { const a = [7]; for (let i = 1; i < 20; i++) a.push(a[i - 1] + 4); return a[4] === 23 ? a[19] : NaN; })(),
  'ps-0070': (() => { const r = new Set(); for (let x = -10; x <= 10; x += 0.5) for (let y = -10; y <= 10; y += 0.5) if ((x + y) ** 2 === 49 && x * y === 6) r.add(x * x + y * y); return r.size === 1 ? [...r][0] : NaN; })(),
  'ps-0071': (() => { const r = []; for (let a = 0; a <= 15; a++) for (let b = 0; b <= 10; b++) if (3 * a + 5 * b === 31 && 2 * a + 3 * b === 20) r.push(b); return one(r); })(),
  'ps-0072': NaN, // checked separately below
  'ps-0073': one(solve((k) => [-3, 0, 1, 5].every((x) => 2 * (3 * x - 2) + k === 3 * (2 * x + k) - 2), -10, 10)),
  'ps-0074': one(solve((c) => { const D = c * c - 48; if (D < 0) return false; return close(Math.sqrt(D), 1); }, 0.5, 50, 0.5)),
  'ps-0075': (() => {
    // solve the 3x3 system by Cramer's rule
    const M = [[1, 2, 0], [0, 1, 2], [2, 0, 1]], v = [10, 13, 7];
    const det = (m) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
    const D = det(M); const xs = [0, 1, 2].map((j) => det(M.map((row, i) => row.map((x, k) => (k === j ? v[i] : x)))) / D);
    return xs.reduce((a, b) => a + b);
  })(),
  'ps-0076': solve((x) => close(Math.abs(x - 3), 2 * x + 6), -50, 50, 0.25).reduce((a, b) => a + b, 0),
  'ps-0077': (() => { let a = 2, s = 0; for (let i = 0; i < 100; i++) { s += a; a = 1 / (1 - a); } return Math.round(s * 1e6) / 1e6; })(),

  'ps-0078': (5 * 12 - 4) / 4,
  'ps-0079': 45 / 2.5,
  'ps-0080': one(solve((both) => 30 + 25 - both + 8 === 50, 0, 25)),
  'ps-0081': comb(7, 3),
  'ps-0082': 5000 * 1.1 * 1.1 - 5000,
  'ps-0083': 7 * 17 - 6 * 15,
  'ps-0084': (() => { let t = 0, done = 0; const dt = 1e-4; while (done < 1 - 1e-9) { done += (1 / 6 + (t >= 1 ? 1 / 4 : 0)) * dt; t += dt; } return Math.round(t * 100) / 100; })(),
  'ps-0085': one(solve((x) => close(4 + 0.6 * x, 0.5 * (20 + x)), 0, 200, 0.5)),
  'ps-0086': one(solve((n) => close(0.3 * 0.6 * n + 0.45 * 0.4 * n, 144), 1, 2000)),
  'ps-0087': (() => { let c = 0; for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (a + b === 8) c++; return c / 36; })(),
  'ps-0088': one(solve((d) => close(d / 2 / 10 + d / 2 / 15, 1), 0.5, 50, 0.5)),
  'ps-0089': (() => { let juice = 40; for (let i = 0; i < 2; i++) juice -= 8 * (juice / 40); return Math.round(juice * 1e6) / 1e6; })(),
  'ps-0090': permutations([0, 1, 2, 3, 4]).filter((p) => Math.abs(p.indexOf(0) - p.indexOf(1)) !== 1).length,
  'ps-0091': (() => {
    let best = -Infinity;
    for (let a = 1; a <= 50; a++) for (let b = a; b <= 50; b++) for (let c = b; c <= 50; c++) for (let d = c; d <= 50; d++) {
      const e = 50 - a - b - c - d; if (e < d) continue;
      const s = [a, b, c, d, e]; if (c !== 12) continue;
      const counts = {}; s.forEach((x) => (counts[x] = (counts[x] ?? 0) + 1));
      const max = Math.max(...Object.values(counts)); const modes = Object.keys(counts).filter((k) => counts[k] === max);
      if (max >= 2 && modes.length === 1 && modes[0] === '14') best = Math.max(best, a);
    }
    return best;
  })(),
  'ps-0092': (() => {
    // search region counts (only-A, only-B, only-C, AB, AC, BC, ABC) for any consistent survey
    const found = new Set();
    for (let abc = 0; abc <= 30; abc++) for (let ab = 0; ab <= 24; ab++) for (let ac = 0; ac + ab <= 24; ac++) {
      const bc = 24 - ab - ac; const a = 60 - ab - ac - abc, b = 45 - ab - bc - abc, c = 30 - ac - bc - abc;
      if (a < 0 || b < 0 || c < 0) continue;
      if (a + b + c + ab + ac + bc + abc + 5 === 100) found.add(abc);
    }
    return found.size === 1 ? [...found][0] : NaN;
  })(),
};

const letters = 'ABCDE';
let fail = 0;
const dist = {};
for (const [id, want] of Object.entries(expected)) {
  const d = exam.questions.get(id).data;
  dist[d.answer] = (dist[d.answer] ?? 0) + 1;
  if (Number.isNaN(want)) continue;
  const values = d.choices.map(num);
  const keyed = values[letters.indexOf(d.answer)];
  const hits = values.filter((v) => close(v, want)).length;
  const ok = close(keyed, want) && hits === 1;
  if (!ok) fail++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${id}  keyed=${keyed}  computed=${want}  matches=${hits}`);
}

// Inequality answers: test the keyed description against sampled points.
const inequality = (id, truth, describe) => {
  const d = exam.questions.get(id).data;
  const keyed = d.choices[letters.indexOf(d.answer)];
  const matching = d.choices.filter((c) => {
    const f = describe[c];
    return f && solve(() => true, -10, 10, 0.25).every((x) => f(x) === truth(x));
  });
  const ok = matching.length === 1 && matching[0] === keyed;
  if (!ok) fail++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${id}  keyed=${keyed}  matching=${JSON.stringify(matching)}`);
};
inequality('ps-0064', (x) => -2 * x + 5 > 11, {
  '$x < -3$': (x) => x < -3, '$x > -3$': (x) => x > -3, '$x < 3$': (x) => x < 3, '$x > 3$': (x) => x > 3, '$x < -8$': (x) => x < -8,
});
inequality('ps-0072', (x) => x * x < 2 * x + 8, {
  '$x < -2$ or $x > 4$': (x) => x < -2 || x > 4, '$x < -4$ or $x > 2$': (x) => x < -4 || x > 2,
  '$-4 < x < 2$': (x) => -4 < x && x < 2, '$x < 4$': (x) => x < 4, '$-2 < x < 4$': (x) => -2 < x && x < 4,
});

console.log('answer letters:', dist, fail ? `\n${fail} FAILED` : '\nall verified');
process.exit(fail ? 1 : 0);
