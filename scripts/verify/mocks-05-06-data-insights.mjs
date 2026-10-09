// Independent checks for the Mock 5 and Mock 6 Data Insights questions. Run from the project root.
import { getExam } from '../../src/lib/content/index.ts';

const exam = getExam('gmat');
const has = (id) => exam.questions.has(id);
const q = (id) => exam.questions.get(id).data;
let fail = 0;
const check = (id, label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fail++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${id} ${label}: keyed=${JSON.stringify(got)} computed=${JSON.stringify(want)}`);
};
function ds(cases, question, s1, s2) {
  const suff = (pred) => new Set(cases.filter(pred).map(question).map(String)).size === 1;
  if (!cases.some((c) => s1(c) && s2(c))) return 'CONTRADICTION';
  const a = suff(s1), b = suff(s2), both = suff((c) => s1(c) && s2(c));
  return a && b ? 'D' : a ? 'A' : b ? 'B' : both ? 'C' : 'E';
}
const range = (lo, hi, step = 1) => { const r = []; for (let x = lo; x <= hi + 1e-9; x += step) r.push(Math.round(x * 1e6) / 1e6); return r; };
const close = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;
const yn = (b) => (b ? 'Yes' : 'No');
const tf = (b) => (b ? 'True' : 'False');
const answers = (id) => q(id).statements.map((s) => s.answer);
const dsAnswer = (id, ...args) => check(id, 'answer', q(id).answer, ds(...args));
const money = (s) => Number(String(s).replace(/[^0-9.]/g, ''));
const keyedChoice = (id) => { const d = q(id); return d.choices['ABCDE'.indexOf(d.answer)]; };
const pickNearest = (options, value, parse = (o) => Number(String(o).replace(/[^0-9.]/g, ''))) => options.reduce((a, b) => (Math.abs(parse(b) - value) < Math.abs(parse(a) - value) ? b : a));
const rows = (id) => q(id).table.rows.map((r) => r.map((c) => { if (typeof c === 'number') return c; const n = Number(String(c).replace(/,/g, '').replace(/−/g, '-')); return Number.isNaN(n) ? c : n; }));
const argmax = (rs, f) => rs.reduce((a, b) => (f(b) > f(a) ? b : a));
const argmin = (rs, f) => rs.reduce((a, b) => (f(b) < f(a) ? b : a));
const uniqueMax = (rs, f) => rs.filter((r) => close(f(r), f(argmax(rs, f)))).length === 1;
const uniqueMin = (rs, f) => rs.filter((r) => close(f(r), f(argmin(rs, f)))).length === 1;
const rankBy = (rs, f) => [...rs].sort((a, b) => f(b) - f(a)).map((r) => r[0]);
const tpa = (id, pairs) => check(id, 'answer', q(id).answer, pairs.length === 1 ? pairs[0] : pairs);
const sum = (xs) => xs.reduce((a, b) => a + b, 0);

// ======================= Mock 5 =======================
dsAnswer('ds-0046', range(0, 20).map((n) => ({ n, spent: n * 12 })), (c) => c.n, (c) => c.spent === 84, (c) => 100 - c.spent === 16);
{ const cases = []; for (const x of range(-25, 25, 0.5)) for (const y of range(-25, 25, 0.5)) cases.push({ x, y });
  dsAnswer('ds-0047', cases, (c) => c.x - c.y, (c) => c.x + c.y === 10, (c) => c.x * c.x - c.y * c.y === 40); }
{ const cases = []; for (const a of [-20, -10, 0, 10, 20]) for (const b of [-20, -10, 0, 10, 20]) cases.push({ a, b, change: Math.round(((1 + a / 100) * (1 + b / 100) - 1) * 1e6) / 1e4 });
  dsAnswer('ds-0048', cases, (c) => c.change, (c) => c.a === 10 && c.b === -10, (c) => c.change < 0); }
{ const cases = []; for (let a = 0; a <= 20; a++) for (let b = a + 1; b <= 25; b++) for (let c = b + 1; c <= 30; c++) for (let d = c + 1; d <= 35; d++) for (const e of [60 - a - b - c - d, d + 1, d + 7]) if (e > d) cases.push([a, b, c, d, e]);
  const consecutive = (s) => s.every((x, i) => i === 0 || x === s[i - 1] + 1);
  dsAnswer('ds-0049', cases, (s) => s[2], (s) => sum(s) === 60, (s) => consecutive(s) && sum(s) === 60); }
dsAnswer('ds-0050', range(1, 1000).map((n) => ({ n })), (c) => c.n % 4 === 0, (c) => c.n % 2 === 0, (c) => c.n % 6 === 0);
{ const cases = []; for (const x of range(-6, 6, 0.5)) for (const y of range(-6, 6, 0.5)) cases.push({ x, y });
  dsAnswer('ds-0051', cases, (c) => c.x > c.y, (c) => c.x * c.x > c.y * c.y, (c) => c.x > 0); }
{ const cases = []; for (const nx of [5, 10, 21, 25, 30, 50]) for (const ny of [5, 10, 20]) for (const px of [100, 150]) for (const py of [100, 250, 320, 400]) cases.push({ nx, ny, px, py });
  dsAnswer('ds-0052', cases, (c) => c.nx * c.px > c.ny * c.py, (c) => c.nx > 2 * c.ny, (c) => c.py > 2 * c.px); }

// MSR: file-storage plans
{ const plans = { Basic: { price: 8, gb: 50, min: 0 }, Team: { price: 14, gb: 200, min: 10 }, Enterprise: { price: 22, gb: 1000, min: 25 } };
  const perUser = (plan, need, annual) => plans[plan].price * (annual ? 0.85 : 1) + Math.max(0, need - plans[plan].gb) * 0.02;
  check('msr-0021', 'value', money(keyedChoice('msr-0021')), 30 * plans.Team.price * 12);
  // cheapest annual cost: split 8 designers (300 GB) and 22 others (40 GB) across accounts, each account meeting its minimum
  let best = Infinity; const names = Object.keys(plans);
  for (const dPlan of names) for (const oPlan of names) for (let moved = 0; moved <= 22; moved++) {
    // `moved` non-designers join the designers' account; the rest use oPlan in a second account
    const acct1 = 8 + moved, acct2 = 22 - moved;
    if (acct1 < plans[dPlan].min) continue; if (acct2 > 0 && acct2 < plans[oPlan].min) continue;
    const monthly = 8 * perUser(dPlan, 300, true) + moved * perUser(dPlan, 40, true) + acct2 * perUser(oPlan, 40, true);
    best = Math.min(best, Math.round(monthly * 12 * 100) / 100);
  }
  check('msr-0022', 'value', money(keyedChoice('msr-0022')), best);
  check('msr-0023', 'answers', answers('msr-0023'), [8 >= plans.Enterprise.min, 30 * 22 * 12 * 0.85 > 5000, perUser('Team', 300, false) < perUser('Basic', 300, false)].map(yn)); }

// Tables
{ const t = rows('ta-0019'); const density = (r) => r[1] / r[3], visit = (r) => r[2], perStaff = (r) => r[1] / r[4];
  const top2 = [...t].sort((a, b) => visit(b) - visit(a)).slice(0, 2);
  check('ta-0019', 'unique extremes', uniqueMax(t, density) && uniqueMin(t, visit), true);
  check('ta-0019', 'answers', answers('ta-0019'), [argmax(t, density) === argmin(t, visit), t.every((r) => perStaff(r) >= 20), sum(top2.map((r) => r[1])) / sum(t.map((r) => r[1])) > 0.6].map(tf)); }
{ const t = rows('ta-0020'); const rate = (r) => r[4] / r[1], interest = (r) => r[2] * r[3], avg = (r) => r[2] / r[1]; const by = (n) => t.find((r) => r[0] === n);
  check('ta-0020', 'unique extremes', uniqueMax(t, rate) && uniqueMax(t, (r) => r[3]), true);
  check('ta-0020', 'answers', answers('ta-0020'), [argmax(t, rate) === argmax(t, (r) => r[3]), avg(by('Business')) > avg(by('Home')), interest(by('Home')) > sum(t.filter((r) => r[0] !== 'Home').map(interest))].map(yn)); }
{ const t = rows('ta-0021'); const yieldPer = (r) => r[2] / r[1], fert = (r) => r[4], total = (r) => r[1] * r[4]; const by = (n) => t.find((r) => r[0] === n);
  check('ta-0021', 'unique extremes', uniqueMax(t, yieldPer) && uniqueMax(t, fert), true);
  check('ta-0021', 'answers', answers('ta-0021'), [argmax(t, yieldPer) === argmax(t, fert), JSON.stringify(rankBy(t, yieldPer)) === JSON.stringify(rankBy(t, (r) => r[3])), total(by('Croft')) > total(by('Brook'))].map(tf)); }

// Graphs
{ const d = q('gi-0019'); const [budget, actual] = d.chart.series.map((s) => s.values.map(Number)); const over = actual.map((a, i) => a / budget[i] - 1);
  const diff = (sum(actual) / sum(budget) - 1) * 100; const label = Math.abs(diff) < 0.5 ? 'equal to' : `${Math.round(Math.abs(diff))}% ${diff > 0 ? 'more' : 'less'} than`;
  check('gi-0019', 'answers', d.statements.map((s) => s.answer), [d.chart.categories[over.indexOf(Math.max(...over))], label]); }
{ const d = q('gi-0020'); const [a, b] = d.chart.series.map((s) => s.values.map(Number));
  check('gi-0020', 'readable gaps (0 or at least 30)', a.every((v, i) => v === b[i] || Math.abs(v - b[i]) >= 30), true);
  const summer = (v) => v[5] + v[6] + v[7];
  check('gi-0020', 'answers', d.statements.map((s) => s.answer), [String(b.filter((v, i) => v > a[i]).length), pickNearest(d.statements[1].options, (summer(b) / summer(a) - 1) * 100)]); }
{ const d = q('gi-0021'); const v = d.chart.series[0].values.map(Number); const total = sum(v); const cum = v.map((_, i) => sum(v.slice(0, i + 1)));
  const lo = cum.findIndex((c) => c >= total / 2), hi = cum.findIndex((c) => c >= total / 2 + 1);
  check('gi-0021', 'answers', d.statements.map((s) => s.answer), [pickNearest(d.statements[0].options, (sum(v.slice(3)) / total) * 100), lo === hi ? d.chart.categories[lo] : 'straddles two groups']); }

// Two-part
{ const o = q('tpa-0024').options.map(Number); const pairs = []; for (const a of o) for (const c of o) if (a + c === 200 && 15 * a + 9 * c === 2580) pairs.push([String(a), String(c)]); tpa('tpa-0024', pairs); }
{ const o = q('tpa-0026').options.map(Number); const pairs = []; for (const t of o) for (const dist of o) if (60 * t === 80 * (t - 1) && dist === 60 * t) pairs.push([String(t), String(dist)]); tpa('tpa-0026', pairs); }
{ const o = q('tpa-0027').options.map(Number); const tri = (k) => (k * (k + 1)) / 2; const pairs = []; for (const n of o) for (const m of o) if (tri(n) === 3 * tri(m)) pairs.push([String(n), String(m)]); tpa('tpa-0027', pairs); }

// ======================= Mock 6 =======================
if (has('ds-0053')) {
  const m = await import('./mock-06-data-insights.part.mjs');
  m.run({ q, check, ds, dsAnswer, range, close, yn, tf, answers, money, keyedChoice, pickNearest, rows, argmax, argmin, uniqueMax, uniqueMin, rankBy, tpa, sum });
}

const letters = {}; for (const id of [...exam.questions.keys()].filter((k) => /^ds-00(4[6-9]|5[0-9])$/.test(k))) { const a = q(id).answer; letters[a] = (letters[a] ?? 0) + 1; }
console.log('DS answer letters (ds-0046..0059):', letters, fail ? `\n${fail} FAILED` : '\nall verified');
process.exit(fail ? 1 : 0);
