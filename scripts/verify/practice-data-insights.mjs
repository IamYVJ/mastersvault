// Independent checks for the practice-set Data Insights questions. Run from the project root.
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
  const suff = (pred) => { const v = new Set(cases.filter(pred).map(question).map(String)); return v.size === 1; };
  if (!cases.some((c) => s1(c) && s2(c))) return 'CONTRADICTION';
  if (!cases.some(s1) || !cases.some(s2)) return 'EMPTY';
  const a = suff(s1), b = suff(s2), both = suff((c) => s1(c) && s2(c));
  return a && b ? 'D' : a ? 'A' : b ? 'B' : both ? 'C' : 'E';
}
const range = (lo, hi, step = 1) => { const r = []; for (let x = lo; x <= hi + 1e-9; x += step) r.push(Math.round(x * 1e6) / 1e6); return r; };
const close = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;
const yn = (b) => (b ? 'Yes' : 'No');
const tf = (b) => (b ? 'True' : 'False');
const answers = (id) => q(id).statements.map((s) => s.answer);
const dsAnswer = (id, ...args) => check(id, 'answer', q(id).answer, ds(...args));

// ---- Data sufficiency
dsAnswer('ds-0017', range(0, 120).map((b) => ({ b })), (c) => c.b, (c) => c.b === 0.35 * 120, (c) => 120 - c.b === 78);
{ const cases = []; for (let r = 1; r <= 200; r++) for (let g = 1; g <= 200; g++) cases.push({ r, g });
  dsAnswer('ds-0018', cases, (c) => c.r / c.g, (c) => c.r - c.g === 12, (c) => close(c.r / (c.r + c.g), 0.6)); }
dsAnswer('ds-0019', range(1, 1000).map((n) => ({ n })), (c) => c.n % 6, (c) => c.n % 12 === 11, (c) => c.n % 3 === 2);
{ const cases = []; for (const x of range(-10, 10, 0.25)) for (const y of range(-10, 10, 0.25)) cases.push({ x, y });
  dsAnswer('ds-0020', cases, (c) => 3 * c.x - 2 * c.y, (c) => close(6 * c.x - 4 * c.y, 10), (c) => close(c.x, 2 * c.y)); }
dsAnswer('ds-0021', range(-600, 600).map((n) => ({ n })), (c) => c.n % 6 === 0, (c) => c.n % 3 === 0, (c) => Math.abs((c.n + 1) % 2) === 1);
{ const cases = []; for (const v of range(10, 120, 0.5)) for (const t of range(1, 6, 0.25)) cases.push({ v, t, d: v * t });
  dsAnswer('ds-0022', cases, (c) => c.v, (c) => c.t === 3, (c) => close(c.d, (c.v + 10) * (c.t - 0.5))); }
{ const cases = []; for (let a = -20; a <= 80; a++) for (let b = a; b <= 80; b++) for (let c = b; c <= 80; c++) { const d = 80 - a - b - c; if (d >= c) cases.push([a, b, c, d]); }
  const triple = (s) => s[0] === s[2] || s[1] === s[3];
  dsAnswer('ds-0023', cases, (s) => s[3], (s) => s[0] === 5, triple); }
dsAnswer('ds-0024', range(5, 500, 5).map((N) => ({ N })), (c) => 0.6 * c.N, (c) => close(0.6 * c.N - 0.4 * c.N, 8), (c) => close(0.4 * c.N, 16));
{ const cases = []; for (const a of range(0.1, 6, 0.1)) for (const b of range(0.1, 6, 0.1)) cases.push({ a, b });
  dsAnswer('ds-0025', cases, (c) => c.a > c.b, (c) => c.a * c.a > c.b, (c) => c.a / c.b > 1); }
{ const cases = []; for (const tA of range(6.5, 200, 0.5)) { const tB = 1 / (1 / 6 - 1 / tA); if (tB > 0) cases.push({ tA, tB }); }
  dsAnswer('ds-0026', cases, (c) => c.tA, (c) => close(c.tB, 10), (c) => close((1 / c.tA) / (1 / c.tB), 2 / 3)); }
dsAnswer('ds-0027', range(-5, 5, 0.05).map((x) => ({ x })), (c) => c.x > 1, (c) => c.x ** 3 > c.x ** 2 + 1e-12, (c) => c.x ** 2 > c.x + 1e-12);
dsAnswer('ds-0028', range(-10, 10, 0.5).map((x) => ({ x })), (c) => c.x, (c) => c.x * c.x === 4 * c.x, (c) => c.x ** 3 === 16 * c.x);
{ const cases = [];
  for (let n = -20; n <= 20; n += 2) cases.push([n, n + 2, n + 4, n + 6, n + 8]);
  for (let a = 0; a <= 20; a++) for (let b = a; b <= 20; b++) for (let c = b; c <= 20; c++) for (let d = c; d <= 20; d++) for (let e = d; e <= 20; e++) cases.push([a, b, c, d, e]);
  const consecEven = (s) => s[0] % 2 === 0 && s.every((x, i) => i === 0 || x === s[i - 1] + 2);
  dsAnswer('ds-0029', cases, (s) => s[4] - s[0], (s) => s.reduce((x, y) => x + y) === 50 && s[2] === 10, consecEven); }
{ const cases = []; for (let x = -10; x <= 10; x++) for (let y = -10; y <= 10; y++) cases.push({ x, y });
  dsAnswer('ds-0030', cases, (c) => c.x > c.y, (c) => c.x - c.y > -1, (c) => c.y !== 0 && c.x / c.y > 1); }
{ const cases = [];
  for (let R = 1; R <= 20; R++) for (let C = 1; C <= 20; C++) for (const gr of [0.9, 1, 1.1, 1.3]) for (const gc of [0.8, 1, 1.1, 1.2]) cases.push({ R, C, R2: R * gr, C2: C * gc });
  dsAnswer('ds-0031', cases, (c) => c.R2 - c.C2 > c.R - c.C + 1e-9, (c) => close(c.R2, 1.1 * c.R), (c) => close(c.C2, 1.1 * c.C)); }

// ---- Table analysis (data read from the question files)
const rows = (id) => q(id).table.rows.map((r) => r.map((c) => (typeof c === 'number' ? c : Number.isNaN(Number(String(c).replace(/,/g, '').replace(/−/g, '-'))) ? c : Number(String(c).replace(/,/g, '').replace(/−/g, '-')))));
const argmax = (rs, f) => rs.reduce((a, b) => (f(b) > f(a) ? b : a));
const argmin = (rs, f) => rs.reduce((a, b) => (f(b) < f(a) ? b : a));
const unique = (rs, f, pick) => rs.filter((r) => f(r) === f(pick(rs, f))).length === 1;
{ const t = rows('ta-0008'); // city, stores, revenue $m, employees, growth
  const perStore = (r) => r[2] / r[1]; const growth = (r) => r[4];
  const perEmp = t.map((r) => (r[2] * 1e6) / r[3]); const eps = t.map((r) => r[3] / r[1]).sort((a, b) => a - b);
  const median = (eps[2] + eps[3]) / 2;
  check('ta-0008', 'unique maxima', unique(t, perStore, argmax) && unique(t, growth, argmax), true);
  check('ta-0008', 'answers', answers('ta-0008'), [argmax(t, perStore) === argmax(t, growth), perEmp.every((v) => v >= 85000), median > 15 && median < 16].map(tf)); }
{ const t = rows('ta-0009'); // program, applicants, admitted, enrolled, score
  const rate = (r) => r[2] / r[1]; const yieldR = (r) => r[3] / r[2];
  const enrolled = t.reduce((n, r) => n + r[3], 0), admitted = t.reduce((n, r) => n + r[2], 0);
  check('ta-0009', 'unique extremes', unique(t, rate, argmin) && unique(t, (r) => r[4], argmax) && unique(t, yieldR, argmin), true);
  check('ta-0009', 'answers', answers('ta-0009'), [argmin(t, rate) === argmax(t, (r) => r[4]), enrolled / admitted > 0.75, argmin(t, yieldR)[0] === 'History'].map(yn)); }
{ const t = rows('ta-0010'); // category, units k, price, return %
  const returned = (r) => (r[1] * r[3]) / 100; const net = (r) => r[1] * r[2] * (1 - r[3] / 100);
  const home = t.find((r) => r[0] === 'Home'), apparel = t.find((r) => r[0] === 'Apparel');
  const share = t.reduce((n, r) => n + returned(r), 0) / t.reduce((n, r) => n + r[1], 0);
  check('ta-0010', 'answers', answers('ta-0010'), [argmax(t, returned)[0] === 'Apparel' && unique(t, returned, argmax), net(home) > net(apparel), share < 0.1].map(tf));
  check('ta-0010', 'gross trap holds', apparel[1] * apparel[2] > home[1] * home[2], true); }
{ const t = rows('ta-0011'); // airline, operated, on-time %, cancellations, avg delay
  const late = (r) => (r[1] * (100 - r[2])) / 100; const delay = (r) => late(r) * r[4]; const cancel = (r) => r[3] / (r[1] + r[3]);
  const by = (n) => t.find((r) => r[0] === n);
  check('ta-0011', 'whole late counts', t.every((r) => Number.isInteger(late(r))), true);
  check('ta-0011', 'answers', answers('ta-0011'), [argmax(t, late)[0] === 'Ember', delay(by('Cirrus')) > delay(by('Ember')), argmax(t, cancel) === argmin(t, (r) => r[2])].map(tf)); }
{ const t = rows('ta-0012'); // gym, start, new, cancel, fee
  const end = (r) => r[1] + r[2] - r[3]; const growth = (r) => end(r) / r[1] - 1; const fees = (r) => end(r) * r[4];
  const by = (n) => t.find((r) => r[0] === n);
  const total = t.reduce((n, r) => n + end(r), 0) / t.reduce((n, r) => n + r[1], 0) - 1;
  check('ta-0012', 'answers', answers('ta-0012'), [argmax(t, growth) === argmax(t, (r) => r[4]), fees(by('West')) > fees(by('South')), total > 0.12].map(yn)); }

// ---- Graphics interpretation (data read from the question files)
const pickNearest = (options, value, parse = (o) => Number(o.replace(/[^0-9.]/g, ''))) => options.reduce((a, b) => (Math.abs(parse(b) - value) < Math.abs(parse(a) - value) ? b : a));
{ const d = q('gi-0008'); const [x, y] = d.chart.series.map((s) => s.values);
  const first = d.chart.categories[y.findIndex((v, i) => v > x[i])];
  const full = { Jan: 'January', May: 'May', Jun: 'June', Jul: 'July', Aug: 'August' }[first];
  const pct = (y[11] / y[0] - 1) * 100;
  check('gi-0008', 'answers', d.statements.map((s) => s.answer), [full, pickNearest(d.statements[1].options, pct)]); }
{ const d = q('gi-0009'); const sizes = [200, 300, 250, 50]; const [car, transit] = d.chart.series.map((s) => s.values);
  const carN = car.map((p, i) => (p * sizes[i]) / 100); const transitN = transit.map((p, i) => (p * sizes[i]) / 100);
  const cmp = carN[1] < carN[2] ? 'less than' : carN[1] === carN[2] ? 'equal to' : 'greater than';
  check('gi-0009', 'shares add to 100', d.chart.categories.every((_, i) => d.chart.series.reduce((n, s) => n + s.values[i], 0) === 100), true);
  check('gi-0009', 'answers', d.statements.map((s) => s.answer), [cmp, pickNearest(d.statements[1].options, (transitN[0] / transitN.reduce((a, b) => a + b)) * 100)]); }
{ const d = q('gi-0010'); const pts = d.chart.series[0].points;
  const count = pts.filter(([x, y]) => y > 6 * x).length;
  const mx = pts.reduce((n, p) => n + p[0], 0) / pts.length, my = pts.reduce((n, p) => n + p[1], 0) / pts.length;
  const slope = pts.reduce((n, [x, y]) => n + (x - mx) * (y - my), 0) / pts.reduce((n, [x]) => n + (x - mx) ** 2, 0);
  console.log(`     gi-0010 least-squares slope ${slope.toFixed(3)} -> ${(slope * 5000).toFixed(0)} per $5,000`);
  check('gi-0010', 'answers', d.statements.map((s) => s.answer), [String(count), pickNearest(d.statements[1].options, slope * 5000)]); }
{ const d = q('gi-0011'); const [a, b] = d.chart.series.map((s) => s.values); const yrs = d.chart.categories;
  const i = a.findIndex((v, k) => v > b[k]); const label = `${yrs[i - 1]} and ${yrs[i]}`;
  const pct = ((a[6] + b[6]) / (a[0] + b[0]) - 1) * 100;
  check('gi-0011', 'answers', d.statements.map((s) => s.answer), [label, pickNearest(d.statements[1].options, pct)]); }
{ const d = q('gi-0012'); const v = d.chart.series[0].values; const total = v.reduce((x, y) => x + y);
  const cum = v.map((_, i) => v.slice(0, i + 1).reduce((x, y) => x + y)); const lo = cum.findIndex((c) => c >= total / 2), hi = cum.findIndex((c) => c >= total / 2 + 1);
  const bounds = d.chart.categories.map((c) => c.split('–'));
  const medianLabel = lo === hi ? `$${bounds[lo][0]} and $${bounds[lo][1]}` : 'straddles';
  check('gi-0012', 'answers', d.statements.map((s) => s.answer), [medianLabel, pickNearest(d.statements[1].options, ((v[3] + v[4] + v[5]) / total) * 100)]); }

// ---- Multi-source: bike share
{ const extra = 0.1 * 40000 * 10 * 0.2 + 0.05 * 36000 * 10 * 0.2;
  const money = (s) => Number(String(s).replace(/[^0-9.]/g, ''));
  const keyed = (id) => { const d = q(id); return d.choices['ABCDE'.indexOf(d.answer)]; };
  check('msr-0009', 'value', money(keyed('msr-0009')), extra);
  const before = 40000 * 3 + 2000 * 25, after = 36000 * 3.5 + 1900 * 30; const change = (after / before - 1) * 100;
  console.log(`     msr-0010 change ${change.toFixed(2)}%`);
  check('msr-0010', 'choice', keyed('msr-0010'), change > 6.5 && change < 9.5 ? 'An increase of about 8%' : String(change));
  check('msr-0011', 'answers', answers('msr-0011'), [(2000 * 25) / 36000 < 1, 25 < 10 * 3, 8 * 3.5 < 30].map(yn));
  // museum
  const tickets = 12 * 6 * 8 * 120; const avg = 0.6 * 20 + 0.25 * 12; const revenue = tickets * avg; const costs = 450000 + 6000 * 72;
  check('msr-0012', 'value', money(keyed('msr-0012')), tickets);
  check('msr-0013', 'value', money(keyed('msr-0013')), revenue);
  check('msr-0014', 'answers', answers('msr-0014'), [revenue + 100000 >= costs, 0.75 * revenue + 100000 >= costs, (6000 * 72) / costs > 0.5].map(yn)); }

// ---- Two-part analysis
const tpa = (id, pairs) => check(id, 'answer', q(id).answer, pairs.length === 1 ? pairs[0] : pairs);
{ const pairs = []; for (let f = 0; f <= 2000; f += 10) for (let g = 1; g <= 100; g++) if (f + 40 * g === 1300 && f + 70 * g === 2050) pairs.push([`\\$${f.toLocaleString('en-US')}`, `\\$${g}`]);
  tpa('tpa-0010', pairs); }
{ const pairs = []; for (const x of q('tpa-0012').options.map(Number)) for (const y of q('tpa-0012').options.map(Number)) {
    if (!(x < y)) continue; const s = [3, 8, 10, x, y].sort((a, b) => a - b);
    if (s.reduce((a, b) => a + b) === 40 && s[2] === 8 && s[4] - s[0] === 15) pairs.push([String(x), String(y)]); }
  tpa('tpa-0012', pairs); }
{ const pairs = []; for (const p of q('tpa-0014').options.map(Number)) for (const qq of q('tpa-0014').options.map(Number)) if (qq - p === 5 && close(1 / p + 1 / qq, 1 / 6)) pairs.push([String(p), String(qq)]);
  tpa('tpa-0014', pairs); }
{ let best = null; for (let a = 1; a < 100; a++) for (let b = 1; b < a; b++) if (a * a - b * b === 45 && (!best || a + b < best[0] + best[1])) best = [a, b];
  tpa('tpa-0015', [best.map(String)]); }

// DS letter balance
const letters = {}; for (let i = 17; i <= 31; i++) { const a = q(`ds-00${i}`).answer; letters[a] = (letters[a] ?? 0) + 1; }
console.log('DS answer letters:', letters, fail ? `\n${fail} FAILED` : '\nall verified');
process.exit(fail ? 1 : 0);
