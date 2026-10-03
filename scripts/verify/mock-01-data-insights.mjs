// Independent checks for the Mock 1 Data Insights questions. Run from the project root.
import { getExam } from '../../src/lib/content/index.ts';

const exam = getExam('gmat');
const q = (id) => exam.questions.get(id).data;
let fail = 0;
const check = (id, label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fail++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${id} ${label}: keyed=${JSON.stringify(got)} computed=${JSON.stringify(want)}`);
};

// ---- Data Sufficiency by brute force: a statement set is sufficient if every
// case that satisfies it gives the same answer to the question.
function ds(cases, question, s1, s2) {
  const answers = (pred) => new Set(cases.filter(pred).map(question).map(String));
  const suff = (pred) => answers(pred).size === 1;
  const a = suff(s1), b = suff(s2), both = suff((c) => s1(c) && s2(c));
  if (a && b) return 'D';
  if (a) return 'A';
  if (b) return 'B';
  return both ? 'C' : 'E';
}
const range = (lo, hi, step = 1) => { const r = []; for (let x = lo; x <= hi + 1e-9; x += step) r.push(Math.round(x * 100) / 100); return r; };

// ds-0003: value of x
check('ds-0003', 'answer', q('ds-0003').answer, ds(range(-20, 20, 0.5).map((x) => ({ x })), (c) => c.x, (c) => 3 * c.x - 5 === 2 * c.x + 1, (c) => c.x * c.x === 36));
// ds-0004: is integer k odd
check('ds-0004', 'answer', q('ds-0004').answer, ds(range(-50, 50).map((k) => ({ k })), (c) => Math.abs(c.k % 2) === 1, (c) => (c.k * c.k + c.k) % 2 === 0, (c) => Math.abs((c.k + 3) % 2) === 0));
// ds-0005: blue/green/other with total 240
{
  const cases = [];
  for (let b = 0; b <= 240; b++) for (let g = 0; b + g <= 240; g++) cases.push({ b, g, o: 240 - b - g });
  check('ds-0005', 'answer', q('ds-0005').answer, ds(cases, (c) => c.b / 240, (c) => c.o === 80, (c) => c.b === 3 * c.g));
}
// ds-0006: four numbers with mean 20 (search in halves)
{
  const cases = [];
  const vals = range(-10, 80, 0.5);
  for (const a of vals) for (const b of vals) if (b >= a) for (const c of vals) if (c >= b) { const d = 80 - a - b - c; if (d >= c) cases.push([a, b, c, d]); }
  const threeEqual = (s) => (s[0] === s[1] && s[1] === s[2]) || (s[1] === s[2] && s[2] === s[3]);
  // the "together" case with 68/3 isn't on the half grid, so add it explicitly
  cases.push([12, 68 / 3, 68 / 3, 68 / 3]);
  check('ds-0006', 'answer', q('ds-0006').answer, ds(cases, (s) => s[3] > 30, (s) => s[0] === 12, threeEqual));
}
// ds-0007: machines (rates as 1/hours)
{
  const cases = [];
  for (let a = 1; a <= 200; a++) for (let b = 1; b <= 200; b++) if (Math.abs(1 / a + 1 / b - 1 / 6) < 1e-12) cases.push({ a, b });
  check('ds-0007', 'answer', q('ds-0007').answer, ds(cases, (c) => c.a, (c) => Math.abs(1 / c.b - 2 / c.a) < 1e-12, (c) => c.b === 9));
}
// ds-0008: is x > y
{
  const cases = [];
  for (const x of range(-6, 6, 0.5)) for (const y of range(-6, 6, 0.5)) cases.push({ x, y });
  check('ds-0008', 'answer', q('ds-0008').answer, ds(cases, (c) => c.x > c.y, (c) => c.x * c.x > c.y * c.y, (c) => c.x > 0));
}
// ds-0009: remainder of n mod 24
check('ds-0009', 'answer', q('ds-0009').answer, ds(range(1, 500).map((n) => ({ n })), (c) => c.n % 24, (c) => c.n % 4 === 3, (c) => c.n % 6 === 5));

// ---- MSR: conference venues
const venues = { Harborview: { cap: 400, rent: 9000, cater: 55, km: 12 }, Lakeside: { cap: 300, rent: 6500, cater: 62, km: 25 }, Grand: { cap: 500, rent: 12000, cater: 48, km: 8 } };
const cost = (v, people, sponsor = true) => {
  const rent = 2 * v.rent, cater = people * v.cater * 2, shuttle = v.km > 20 ? 4000 : 0;
  const contribution = !sponsor ? 0 : v.cap >= 450 ? v.rent : 0.2 * cater;
  return rent + cater + shuttle - contribution;
};
const money = (s) => Number(String(s).replace(/[^0-9.]/g, ''));
const keyed = (id) => { const d = q(id); return money(d.choices['ABCDE'.indexOf(d.answer)]); };
check('msr-0003', 'value', keyed('msr-0003'), cost(venues.Lakeside, 280, false));
check('msr-0004', 'answers', q('msr-0004').statements.map((s) => s.answer), ['Harborview', 'Lakeside', 'Grand'].map((k) => (cost(venues[k], 280) <= 44000 ? 'Yes' : 'No')));
check('msr-0005', 'value', keyed('msr-0005'), Math.min(...Object.values(venues).filter((v) => v.cap >= 320).map((v) => cost(v, 320))));

// ---- Table Analysis
const offices = [['Austin', 120, 36.0, 88, 9], ['Boston', 210, 50.4, 91, 12], ['Chicago', 180, 45.0, 84, 15], ['Denver', 90, 30.6, 93, 7], ['Miami', 150, 33.0, 79, 18], ['Seattle', 160, 48.0, 90, 10]];
{
  const per = (o) => (o[2] * 1e6) / o[1];
  const most = offices.reduce((a, b) => (b[1] > a[1] ? b : a));
  const best = offices.reduce((a, b) => (per(b) > per(a) ? b : a));
  const sat = offices.map((o) => o[3]).sort((a, b) => a - b);
  const median = (sat[2] + sat[3]) / 2;
  const s3 = offices.filter((o) => o[4] < 11).every((o) => per(o) >= 300000 - 1e-6);
  check('ta-0002', 'answers', q('ta-0002').statements.map((s) => s.answer), [most === best, median === 89, s3].map((b) => (b ? 'True' : 'False')));
}
const channels = [['Search', 40, 80, 1600, 96], ['Social', 25, 125, 1000, 45], ['Email', 5, 20, 900, 36], ['Video', 30, 60, 600, 42], ['Affiliates', 15, 30, 750, 60]];
{
  const minBy = (f) => channels.reduce((a, b) => (f(b) < f(a) ? b : a));
  const maxBy = (f) => channels.reduce((a, b) => (f(b) > f(a) ? b : a));
  const s1 = minBy((c) => c[1] / c[2]) === minBy((c) => c[1] / c[3]);
  const top = maxBy((c) => c[4] / c[3]);
  const s2 = top[0] === 'Affiliates' && channels.filter((c) => c[4] / c[3] === top[4] / top[3]).length === 1;
  const total = channels.reduce((n, c) => n + c[4], 0);
  const s3 = (96 + 36) / total > 0.5;
  check('ta-0003', 'answers', q('ta-0003').statements.map((s) => s.answer), [s1, s2, s3].map((b) => (b ? 'Yes' : 'No')));
}
const courses = [['Accounting', 1200, 65, 4.4, 49], ['Writing', 800, 72, 4.6, 39], ['Data', 1500, 58, 4.2, 79], ['Negotiation', 600, 80, 4.7, 59], ['PM', 1100, 70, 4.5, 69]];
{
  const maxBy = (f) => courses.reduce((a, b) => (f(b) > f(a) ? b : a));
  const minBy = (f) => courses.reduce((a, b) => (f(b) < f(a) ? b : a));
  const s1 = maxBy((c) => c[4]) === minBy((c) => c[2]);
  const s2 = maxBy((c) => c[1] * c[2])[0] === 'Accounting';
  const s3 = courses.filter((c) => c[3] >= 4.5).every((c) => c[2] >= 70);
  check('ta-0004', 'answers', q('ta-0004').statements.map((s) => s.answer), [s1, s2, s3].map((b) => (b ? 'True' : 'False')));
}

// ---- Graphics Interpretation (read the data from the question file itself)
{
  const d = q('gi-0002');
  const [hw, sv] = d.chart.series.map((s) => s.values);
  const first = d.chart.categories[sv.findIndex((v, i) => v / hw[i] >= 0.6)];
  const ratio = (sv.at(-1) / sv[0] - 1) / (hw.at(-1) / hw[0] - 1);
  check('gi-0002', 'answers', d.statements.map((s) => s.answer), [first, ratio === 2.5 ? '2.5 times' : String(ratio)]);
}
{
  const d = q('gi-0003');
  const pts = d.chart.series[0].points;
  const count = pts.filter(([x, y]) => x > 10 && y > 60).length;
  const best = pts.reduce((a, b) => (b[1] / b[0] > a[1] / a[0] ? b : a));
  const ties = pts.filter((p) => p[1] / p[0] === best[1] / best[0]).length;
  check('gi-0003', 'answers', d.statements.map((s) => s.answer), [String(count), ties === 1 ? String(best[0] * 100) : 'tie']);
}
{
  const d = q('gi-0004');
  const [car, transit, bike] = d.chart.series.map((s) => s.values);
  const share = Math.round((bike[0] / (bike[0] + transit[0])) * 100);
  check('gi-0004', 'answers', d.statements.map((s) => s.answer), [`${share}%`, String(car[3] - car[0])]);
}

// ---- Two-Part Analysis
{
  let pair = null;
  for (let a = 1; a < 30; a++) for (let b = a; b < 30; b++) if (a + b === 30 && a * b === 216) pair = [String(a), String(b)];
  check('tpa-0002', 'answer', q('tpa-0002').answer, pair);
}
{
  let pair = null;
  for (let p = 1; p < 100; p++) if (Math.abs(1 / p + 1 / (p + 6) - 1 / 4) < 1e-12) pair = [String(p), String(p + 6)];
  check('tpa-0004', 'answer', q('tpa-0004').answer, pair);
}
{
  let pair = null;
  for (let c = 1; c < 1000; c++) { const L = (1.2 * c) / 0.8; if (Math.abs(0.9 * L - c - 42) < 1e-9) pair = [String(c), String(L)]; }
  check('tpa-0005', 'answer', q('tpa-0005').answer, pair);
}

console.log(fail ? `\n${fail} FAILED` : '\nall verified');
process.exit(fail ? 1 : 0);
