// Independently recomputes each Mock 2 quant answer and compares it with the keyed choice.
import { getExam } from '../../src/lib/content/index.ts';

const exam = getExam('gmat');
const num = (s) => {
  const t = String(s).replace(/[$\\,\s%]/g, '').replace(/−/g, '-');
  const f = /^frac\{(-?\d+)\}\{(\d+)\}$/.exec(t);
  if (f) return Number(f[1]) / Number(f[2]);
  const r = /^(\d*)sqrt\{(\d+)\}$/.exec(t);
  if (r) return (r[1] ? Number(r[1]) : 1) * Math.sqrt(Number(r[2]));
  return Number(t);
};
const close = (a, b) => Math.abs(a - b) < 1e-9;
const comb = (n, k) => { let r = 1; for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1); return r; };
const perms = (s) => { if (s.length <= 1) return [s]; const out = new Set(); [...s].forEach((c, i) => perms(s.slice(0, i) + s.slice(i + 1)).forEach((p) => out.add(c + p))); return [...out]; };

const expected = {
  'ps-0027': (() => { const n = 18 / (2 / 5); return (3 / 4) * n; })(),
  'ps-0028': ((27000 - 24000) / 24000) * 100,
  'ps-0029': 3.5 * (5 / 2),
  'ps-0030': (() => { for (let k = 0; k < 100; k++) if (k + 4 - 5 === 2 * (k - 5)) return k; })(),
  'ps-0031': Math.sqrt(50) + Math.sqrt(18) - Math.sqrt(8),
  'ps-0032': (6 * 82 - 67) / 5,
  'ps-0033': perms('LEVEL').length,
  'ps-0034': (() => { const bag = 'RRRRBBBBBB'; let same = 0, all = 0; for (let i = 0; i < 10; i++) for (let j = i + 1; j < 10; j++) { all++; if (bag[i] === bag[j]) same++; } return same / all; })(),
  'ps-0035': (() => { let t = 0, v = 0; while (v < 1 - 1e-12) { t += 0.001; v = t * (1 / 3 - 1 / 5); } return Math.round(t * 1000) / 1000; })(),
  'ps-0036': 50 * (360 / (70 + 50)),
  'ps-0037': (() => { for (let x = 0; x <= 30; x++) if (12 * x + 18 * (30 - x) === 14 * 30) return x; })(),
  'ps-0038': (() => { for (let n = 1; n < 1000; n++) if (Number.isInteger(Math.sqrt(150 * n))) return n; })(),
  'ps-0039': (() => { let c = 0; for (let n = 1; n <= 60; n++) { let f = 0; for (let d = 1; d <= n; d++) if (n % d === 0) f++; if (f % 2 === 1) c++; } return c; })(),
  'ps-0040': (() => {
    // which choices lie strictly inside the achievable range of xy (sampled densely)
    let lo = Infinity, hi = -Infinity;
    for (let x = -2.999; x < 5; x += 0.01) for (let y = -1.999; y < 4; y += 0.01) { lo = Math.min(lo, x * y); hi = Math.max(hi, x * y); }
    const ok = exam.questions.get('ps-0040').data.choices.map(num).filter((v) => v > lo && v < hi);
    return ok.length === 1 ? ok[0] : NaN;
  })(),
  'ps-0041': Math.max(...[10, -4].flatMap((x) => [3, -7].map((y) => x - y))),
  'ps-0042': (() => { const f = (x) => 3 * x - 2, g = (x) => x * x + 1; return f(g(2)); })(),
  'ps-0043': (() => { const d = (41 - 17) / 6, a = 17 - 3 * d; let s = 0; for (let i = 0; i < 10; i++) s += a + i * d; return s; })(),
  'ps-0044': (() => { const both = 18 + 15 + 12 - 40; return 18 - both + (15 - both); })(),
  'ps-0045': (() => { for (let m = 0; m <= 40; m++) if (80000 * m + 45000 * (40 - m) === 52000 * 40) return m; })(),
  'ps-0046': (() => { for (let x = 0; x <= 100; x += 0.5) if (close(1.25 * (1 - x / 100), 0.9)) return x; })(),
  'ps-0047': (() => { for (let x = -50; x < 50; x++) if (2 * (x + 3) === 5 * x - 9) return x; })(),
};

const letters = 'ABCDE';
let fail = 0;
const dist = {};
for (const [id, want] of Object.entries(expected)) {
  const d = exam.questions.get(id).data;
  const values = d.choices.map(num);
  const keyed = values[letters.indexOf(d.answer)];
  const hits = values.filter((v) => close(v, want)).length;
  const ok = close(keyed, want) && hits === 1;
  dist[d.answer] = (dist[d.answer] ?? 0) + 1;
  if (!ok) fail++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${id}  keyed=${keyed}  computed=${want}  matches=${hits}`);
}
console.log('answer letters:', dist, fail ? `\n${fail} FAILED` : '\nall verified');
process.exit(fail ? 1 : 0);
