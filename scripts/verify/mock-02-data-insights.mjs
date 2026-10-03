// Independent checks for the Mock 2 Data Insights questions. Run from the project root.
import { getExam } from '../../src/lib/content/index.ts';

const exam = getExam('gmat');
const q = (id) => exam.questions.get(id).data;
let fail = 0;
const check = (id, label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fail++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${id} ${label}: keyed=${JSON.stringify(got)} computed=${JSON.stringify(want)}`);
};
function ds(cases, question, s1, s2) {
  const suff = (pred) => new Set(cases.filter(pred).map(question).map(String)).size === 1;
  const a = suff(s1), b = suff(s2), both = suff((c) => s1(c) && s2(c));
  if (!cases.some((c) => s1(c) && s2(c))) return 'CONTRADICTION';
  return a && b ? 'D' : a ? 'A' : b ? 'B' : both ? 'C' : 'E';
}
const range = (lo, hi, step = 1) => { const r = []; for (let x = lo; x <= hi + 1e-9; x += step) r.push(Math.round(x * 1000) / 1000); return r; };
const close = (a, b) => Math.abs(a - b) < 1e-6;

// ds-0010: notebooks n, pens p (prices in quarter-dollars)
{ const cases = []; for (const n of range(0.25, 13, 0.25)) for (const p of range(0.25, 13, 0.25)) cases.push({ n, p });
  check('ds-0010', 'answer', q('ds-0010').answer, ds(cases, (c) => c.n, (c) => close(3 * c.n + 2 * c.p, 13), (c) => c.p === 2)); }
// ds-0011
check('ds-0011', 'answer', q('ds-0011').answer, ds(range(1, 2000).map((n) => ({ n })), (c) => c.n % 12 === 0, (c) => c.n % 6 === 0, (c) => (c.n * c.n) % 144 === 0));
// ds-0012: revenue R, costs C (2023), in hundred-thousands
{ const cases = []; for (const R of range(1, 40, 0.5)) for (const C of range(0.5, 40, 0.5)) if (R > C) cases.push({ R, C, R2: 1.1 * R, C2: 1.08 * C });
  // statement 2 alone: some unrelated growth rates too
  for (const R of range(1, 20, 1)) for (const g of [1.05, 1.2]) cases.push({ R, C: R - 1, R2: g * R, C2: g * R - 1.3 });
  const pct = (c) => Math.round(((c.R2 - c.C2) / (c.R - c.C) - 1) * 1000);
  check('ds-0012', 'answer', q('ds-0012').answer, ds(cases, pct, (c) => close(c.R2, 1.1 * c.R) && close(c.C2, 1.08 * c.C), (c) => Math.abs(c.R2 - c.C2 - 1.3) < 0.02)); }
// ds-0013: five distinct integers, median 10
{ const cases = []; for (let a = -20; a < 10; a++) for (let b = a + 1; b < 10; b++) for (let d = 11; d < 40; d++) for (let e = d + 1; e < 60; e++) cases.push([a, b, 10, d, e]);
  check('ds-0013', 'answer', q('ds-0013').answer, ds(cases, (s) => s[4], (s) => s.reduce((x, y) => x + y) === 50, (s) => s[4] - s[0] === 4)); }
// ds-0014
{ const cases = []; for (const x of range(-10, 10, 0.5)) for (const y of range(-10, 10, 0.5)) cases.push({ x, y });
  check('ds-0014', 'answer', q('ds-0014').answer, ds(cases, (c) => 2 * c.x + 3 * c.y, (c) => close(4 * c.x + 6 * c.y, 18), (c) => close(c.x, 4.5 - 1.5 * c.y))); }
// ds-0015: distance d, speed v
{ const cases = []; for (const v of range(10, 120, 0.5)) for (const t of range(0.5, 6, 0.25)) cases.push({ v, d: v * t, t });
  const faster = (c) => close(c.d / (c.v + 12), c.t - 0.5);
  check('ds-0015', 'answer', q('ds-0015').answer, ds(cases, (c) => c.v, (c) => c.t === 2.5, faster)); }
// ds-0016
{ const isPrime = (n) => { if (n < 2) return false; for (let i = 2; i * i <= n; i++) if (n % i === 0) return false; return true; };
  const cases = range(-51, 101).map((x) => ({ x }));
  check('ds-0016', 'answer', q('ds-0016').answer, ds(cases, (c) => (c.x * c.x - 1) % 8 === 0, (c) => Math.abs(c.x % 2) === 1, (c) => isPrime(c.x))); }

// ---- MSR: warehouse robots
const cost = (pickers) => {
  const remaining = Math.max(0, 18000 - pickers * 300);
  const robots = Math.ceil(remaining / 1200);
  const supervisors = Math.ceil(robots / 10);
  return { robots, supervisors, total: pickers * 3600 + robots * 2400 + supervisors * 5000, lease: robots * 2400 };
};
const money = (s) => Number(String(s).replace(/[^0-9.]/g, ''));
const keyed = (id) => { const d = q(id); return money(d.choices['ABCDE'.indexOf(d.answer)]); };
check('msr-0006', 'value', keyed('msr-0006'), cost(20).robots);
{ const plan = cost(20), current = 60 * 3600, allRobots = cost(0);
  check('msr-0007', 'answers', q('msr-0007').statements.map((s) => s.answer), [plan.lease < 30000, (current - plan.total) / current > 0.6, allRobots.supervisors === 2].map((b) => (b ? 'Yes' : 'No'))); }
check('msr-0008', 'value', keyed('msr-0008'), cost(30).total);

// ---- Table Analysis
{ const h = [['Lisbon', 220, 82, 140], ['Oslo', 180, 74, 210], ['Prague', 260, 88, 110], ['Seoul', 300, 79, 160], ['Toronto', 240, 85, 175], ['Vienna', 200, 70, 190]];
  const maxBy = (f) => h.reduce((a, b) => (f(b) > f(a) ? b : a)); const minBy = (f) => h.reduce((a, b) => (f(b) < f(a) ? b : a));
  const rates = h.map((r) => r[3]).sort((a, b) => a - b);
  check('ta-0005', 'answers', q('ta-0005').statements.map((s) => s.answer), [maxBy((r) => r[2]) === minBy((r) => r[3]), maxBy((r) => r[1]) === maxBy((r) => r[2] * r[3]), (rates[2] + rates[3]) / 2 > 170].map((b) => (b ? 'True' : 'False'))); }
{ const d = [['Eng', 240, 180, 70], ['Fin', 60, 50, 80], ['Mkt', 90, 60, 60], ['Ops', 300, 150, 72], ['Sales', 150, 120, 55]];
  const maxBy = (f) => d.reduce((a, b) => (f(b) > f(a) ? b : a));
  const sat = (r) => (r[2] * r[3]) / 100;
  const s1 = maxBy((r) => r[2] / r[1]) === maxBy((r) => r[3]);
  const s2 = sat(d[3]) > sat(d[0]);
  const s3 = d.reduce((n, r) => n + sat(r), 0) / d.reduce((n, r) => n + r[2], 0) > 0.65;
  const integers = d.every((r) => Number.isInteger(sat(r)));
  check('ta-0006', 'answers', q('ta-0006').statements.map((s) => s.answer), [s1, s2, s3].map((b) => (b ? 'Yes' : 'No')));
  check('ta-0006', 'whole respondents', integers, true); }
{ const b = [['Alder', 12000, 1560, 840, 1998], ['Birch', 8000, 1120, 400, 2012], ['Cedar', 15000, 1650, 1500, 1985], ['Dogwood', 6000, 690, 300, 2018], ['Elm', 10000, 1300, 700, 2005]];
  const per = (r) => ((r[2] + r[3]) * 1000) / r[1];
  const newest = b.reduce((x, y) => (y[4] > x[4] ? y : x)); const least = b.reduce((x, y) => (per(y) < per(x) ? y : x));
  check('ta-0007', 'answers', q('ta-0007').statements.map((s) => s.answer), [newest === least, b.filter((r) => r[4] < 2000).every((r) => per(r) > 190), b.every((r) => r[2] / (r[2] + r[3]) > 0.7)].map((x) => (x ? 'True' : 'False'))); }

// ---- Graphics Interpretation (data read from the question files)
{ const d = q('gi-0005'); const [y23, y24] = d.chart.series.map((s) => s.values);
  const pct = y23.map((v, i) => y24[i] / v - 1); const best = d.chart.categories[pct.indexOf(Math.max(...pct))];
  const ties = pct.filter((p) => p === Math.max(...pct)).length;
  const sorted = [...y24].sort((a, b) => b - a); const share = Math.round(((sorted[0] + sorted[1]) / y24.reduce((a, b) => a + b)) * 100);
  check('gi-0005', 'answers', d.statements.map((s) => s.answer), [ties === 1 ? best : 'tie', `${Math.round(share / 5) * 5}%`]); }
{ const d = q('gi-0006'); const [x, y] = d.chart.series.map((s) => s.values);
  const months = x.filter((v, i) => v > y[i]).length; const ratio = y.reduce((a, b) => a + b) / x.reduce((a, b) => a + b);
  const label = ratio > 1.05 && ratio < 1.15 ? 'about 10% more than' : String(ratio);
  check('gi-0006', 'answers', d.statements.map((s) => s.answer), [String(months), label]); }
{ const d = q('gi-0007'); const v = d.chart.series[0].values; const total = v.reduce((a, b) => a + b);
  check('gi-0007', 'answers', d.statements.map((s) => s.answer), [`${Math.round(((v[1] + v[2]) / total) * 100)}%`, `${Math.round(((v[3] + 150) / (total + 150)) * 100)}%`]); }

// ---- Two-Part Analysis
{ let pair = null; for (let a = 0; a <= 500; a++) if (4 * a + 6 * (500 - a) === 2600) pair = [String(a), String(500 - a)];
  check('tpa-0006', 'answer', q('tpa-0006').answer, pair); }
{ let a = null, w = null; for (let x = 0; x <= 100; x += 0.5) { if (close((15 + x) / (60 + x), 0.4)) a = x; if (close(15 / (60 + x), 0.2)) w = x; }
  check('tpa-0008', 'answer', q('tpa-0008').answer, [String(a), String(w)]); }
{ const gcd = (a, b) => (b ? gcd(b, a % b) : a); const pairs = [];
  for (let m = 1; m < 100; m++) for (let n = m + 1; n < 100; n++) if (gcd(m, n) === 4 && (m * n) / gcd(m, n) === 60 && m + n === 32) pairs.push([String(m), String(n)]);
  check('tpa-0009', 'answer', q('tpa-0009').answer, pairs.length === 1 ? pairs[0] : pairs); }

console.log(fail ? `\n${fail} FAILED` : '\nall verified');
process.exit(fail ? 1 : 0);
