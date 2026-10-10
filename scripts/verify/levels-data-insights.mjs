// Independent checks for the Data Insights Foundation and Challenge sets
// (ds-0060..0070, msr-0027..0032, ta-0025..0028, gi-0025..0029, tpa-0032..0036).
// tpa-0037 rests on written reasoning and can't be checked this way. Run from the project root.
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
const money = (s) => Number(String(s).replace(/[^0-9.]/g, ''));
const keyed = (id) => { const d = q(id); return d.choices['ABCDE'.indexOf(d.answer)]; };
const mcq = (id, want) => { const d = q(id); check(id, 'value', money(keyed(id)), want); check(id, 'one matching choice', d.choices.filter((c) => money(c) === want).length, 1); };

// ---- Data sufficiency: Foundation
{ const cases = []; for (const a of range(-10, 30, 2)) for (const b of range(-10, 30, 2)) for (const c of range(-10, 30, 2)) cases.push({ a, b, c });
  dsAnswer('ds-0060', cases, (c) => (c.a + c.b + c.c) / 3, (c) => c.a + c.b + c.c === 36, (c) => c.a === 12); }
dsAnswer('ds-0061', range(0, 30).map((d) => ({ d })), (c) => c.d, (c) => 30 - c.d === 18, (c) => close(c.d, 0.4 * 30));
{ const cases = []; for (let m = 0; m <= 100; m++) for (let t = 0; t <= 100; t++) cases.push({ m, t });
  dsAnswer('ds-0062', cases, (c) => c.t, (c) => c.m + c.t === 40, (c) => c.m === 3 * c.t); }
dsAnswer('ds-0063', range(-10, 10, 0.5).map((x) => ({ x })), (c) => c.x > 0, (c) => c.x * c.x === 9, (c) => c.x ** 3 === 27);
{ const cases = []; for (let tom = 18; tom <= 30; tom++) for (let sara = 18; sara <= 30; sara++) for (let raj = 18; raj <= 30; raj++) cases.push({ tom, sara, raj });
  dsAnswer('ds-0064', cases, (c) => c.tom > c.sara, (c) => c.tom > c.raj, (c) => c.sara > c.raj); }

// ---- Data sufficiency: Challenge
{ const cases = []; for (const x of range(-6, 6, 0.5)) for (const y of range(-6, 6, 0.5)) cases.push({ x, y });
  dsAnswer('ds-0065', cases, (c) => c.x * c.x > c.y * c.y, (c) => c.x > c.y, (c) => c.x > 0); }
{ // class of 100: 60 girls, 40 boys; g and b of them passed, at least one student in all
  const cases = []; for (let g = 0; g <= 60; g++) for (let b = 0; b <= 40; b++) if (g + b > 0) cases.push({ g, b });
  dsAnswer('ds-0066', cases, (c) => (c.g / (c.g + c.b)).toFixed(6), (c) => c.g + c.b === 64, (c) => close(c.g / 60, 2 * (c.b / 40))); }
{ const speeds = [10, 20, 30, 40, 60, 80, 90, 120, 150, 240, 1000, 100000];
  const cases = []; for (const v1 of speeds) for (const v2 of speeds) cases.push({ v1, v2, avg: 2 / (1 / v1 + 1 / v2) });
  dsAnswer('ds-0067', cases, (c) => c.avg >= 60, (c) => c.v1 === 30, (c) => c.v2 === 120); }
{ const cases = []; for (let p = 1; p <= 40; p++) for (let n = 1; n <= 40; n++) cases.push({ p, n });
  dsAnswer('ds-0068', cases, (c) => c.n, (c) => 3 * c.p + 5 * c.n === 29, (c) => c.p > c.n);
  check('ds-0068', 'purchases costing $29', cases.filter((c) => 3 * c.p + 5 * c.n === 29).map((c) => [c.p, c.n]), [[3, 4], [8, 1]]); }
{ const cases = range(-60, 60, 2).map((a) => range(0, 6).map((i) => a + 2 * i));
  dsAnswer('ds-0069', cases, (s) => s[3], (s) => s[0] + s[6] === 28, (s) => s[4] + s[5] + s[6] === 54); }
dsAnswer('ds-0070', range(1, 2000).map((n) => ({ n })), (c) => (c.n ** 3 - c.n) % 24 === 0, (c) => c.n % 2 === 1, (c) => c.n % 3 === 0);

// ---- Multi-source: trains (figures as given in sources/msr-s010.yaml)
{ const mins = (t) => { const [h, m] = t.split(':').map(Number); return 60 * h + m; };
  const trains = [
    { id: 1, leaves: '7:10', brook: '7:50', corby: '8:40' }, { id: 2, leaves: '8:00', brook: null, corby: '9:10' },
    { id: 3, leaves: '8:30', brook: '9:10', corby: '10:00' }, { id: 4, leaves: '9:20', brook: null, corby: '10:30' },
  ];
  const peak = (t) => mins(t.leaves) < mins('9:00');
  const fare = (t, to) => ({ brook: [10, 7], corby: [24, 16] })[to][peak(t) ? 0 : 1];
  const onTime = trains.filter((t) => mins(t.corby) + 10 <= mins('10:15'));
  const latest = onTime.reduce((a, b) => (mins(b.leaves) > mins(a.leaves) ? b : a));
  check('msr-0027', 'latest train on time', latest.id, 3);
  mcq('msr-0027', 1.5 * fare(latest, 'corby'));
  const duration = (t) => mins(t.corby) - mins(t.leaves);
  check('msr-0028', 'answers', answers('msr-0028'), [duration(trains[1]) < duration(trains[0]), fare(trains[2], 'brook') === 7, trains.filter(peak).every((t) => t.brook)].map(yn));
  const group = (t) => fare(t, 'corby') * (1 + 0.5 + 0.5);
  mcq('msr-0029', group(trains[1]) - group(trains[3])); }

// ---- Multi-source: translation (figures as given in sources/msr-s011.yaml)
{ const PAGES = 180, DAYS = 15, CHECK = 300, BUDGET = 12500;
  const T = { amelie: { rate: 12, fee: 22 }, bruno: { rate: 15, fee: 25 }, carla: { rate: 10, fee: 18 }, dieter: { rate: 9, fee: 24 }, elke: { rate: 12, fee: 26 } };
  // Search every way of sharing the pages, in steps of 5 pages. Amélie, Bruno and Elke can do French;
  // Bruno and Carla Spanish; Dieter and Elke German. A translator's days across languages can't exceed 15.
  const plans = [];
  for (let fa = 0; fa <= PAGES; fa += 5) for (let fb = 0; fa + fb <= PAGES; fb += 5) { const fe = PAGES - fa - fb;
    for (let sb = 0; sb <= PAGES; sb += 5) { const sc = PAGES - sb;
      for (let gd = 0; gd <= PAGES; gd += 5) { const ge = PAGES - gd;
        const days = { amelie: fa / 12, bruno: (fb + sb) / 15, carla: sc / 10, dieter: gd / 9, elke: (fe + ge) / 12 };
        if (Object.values(days).some((d) => d > DAYS + 1e-9)) continue;
        const splits = [[fa, fb, fe], [sb, sc], [gd, ge]].map((parts) => parts.filter((p) => p > 0).length > 1);
        const cost = fa * 22 + fb * 25 + fe * 26 + sb * 25 + sc * 18 + gd * 24 + ge * 26 + CHECK * splits.filter(Boolean).length;
        plans.push({ cost, splits, sb, sc, gd, ge });
      } } }
  const min = (ps) => ps.reduce((m, p) => Math.min(m, p.cost), Infinity);
  const noSplit = min(plans.filter((p) => !p.splits.some(Boolean)));
  const spanishSplit = plans.filter((p) => p.splits[1] && !p.splits[0] && !p.splits[2]);
  const cheapestSpanish = spanishSplit.filter((p) => p.cost === min(spanishSplit));
  const germanSplitOnly = min(plans.filter((p) => p.splits[2] && !p.splits[0] && !p.splits[1]));
  check('msr-0030', 'answers', answers('msr-0030'), [PAGES / T.carla.rate <= DAYS, cheapestSpanish.every((p) => p.sb === 30), germanSplitOnly < noSplit].map(yn));
  console.log(`     translation: no split ${noSplit}, cheapest overall ${min(plans)}, cheapest with only German split ${germanSplitOnly}`);
  mcq('msr-0031', noSplit - BUDGET);
  mcq('msr-0032', min(plans));
  check('msr-0032', 'within budget', min(plans) <= BUDGET, true); }

// ---- Table analysis (data read from the question files)
const rows = (id) => q(id).table.rows.map((r) => r.map((c) => { const n = Number(String(c).replace(/,/g, '').replace(/−/g, '-')); return Number.isNaN(n) ? c : n; }));
const argmax = (rs, f) => rs.reduce((a, b) => (f(b) > f(a) ? b : a));
const argmin = (rs, f) => rs.reduce((a, b) => (f(b) < f(a) ? b : a));
const unique = (rs, f, pick) => rs.filter((r) => f(r) === f(pick(rs, f))).length === 1;
const by = (t, name) => t.find((r) => r[0] === name);
{ const t = rows('ta-0025'); // truck, meals, price, hours
  const money$ = (r) => r[1] * r[2];
  check('ta-0025', 'unique extremes', unique(t, (r) => r[1], argmax) && unique(t, (r) => r[2], argmin) && unique(t, money$, argmax), true);
  check('ta-0025', 'answers', answers('ta-0025'), [argmax(t, (r) => r[1]) === argmin(t, (r) => r[2]), argmax(t, money$)[0] === 'Cumin', t.every((r) => r[1] / r[3] >= 18)].map(tf)); }
{ const t = rows('ta-0026'); // apartment, rent, area, walk
  const perM2 = (r) => r[1] / r[2]; const rents = t.map((r) => r[1]).sort((a, b) => a - b);
  check('ta-0026', 'unique extremes', unique(t, (r) => r[3], argmin) && unique(t, perM2, argmin) && unique(t, (r) => r[2], argmax) && unique(t, (r) => r[1], argmax), true);
  check('ta-0026', 'answers', answers('ta-0026'), [argmin(t, (r) => r[3]) === argmin(t, perM2), argmax(t, (r) => r[2]) === argmax(t, (r) => r[1]), rents[2] === 1000].map(tf)); }
{ const t = rows('ta-0027'); // ward, beds, occupancy %, stay, nurses
  const occupied = (r) => (r[1] * r[2]) / 100; const patients = (r) => (occupied(r) * 30) / r[3]; const perNurse = (r) => occupied(r) / r[4];
  const overall = t.reduce((n, r) => n + occupied(r), 0) / t.reduce((n, r) => n + r[1], 0);
  console.log(`     ta-0027 overall occupancy ${(overall * 100).toFixed(2)}%, simple average ${(t.reduce((n, r) => n + r[2], 0) / t.length).toFixed(1)}%`);
  check('ta-0027', 'answers', answers('ta-0027'), [overall > 0.78, patients(by(t, 'Pediatrics')) < patients(by(t, 'Cardiology')), argmax(t, perNurse)[0] === 'Surgery' && unique(t, perNurse, argmax)].map(tf)); }
{ const t = rows('ta-0028'); // product, revenue, change %, margin %
  const last = (r) => r[1] / (1 + r[2] / 100); const rise = (r) => r[1] - last(r); const profit = (r) => (r[1] * r[3]) / 100;
  const counts = {}; t.forEach((r) => { const k = last(r).toFixed(4); counts[k] = (counts[k] ?? 0) + 1; });
  const growth = t.reduce((n, r) => n + r[1], 0) / t.reduce((n, r) => n + last(r), 0) - 1;
  console.log(`     ta-0028 combined growth ${(growth * 100).toFixed(2)}%`);
  check('ta-0028', 'unique extremes', unique(t, rise, argmax) && unique(t, profit, argmin), true);
  check('ta-0028', 'answers', answers('ta-0028'), [Math.max(...Object.values(counts)) === 4, growth > 0.06, argmax(t, rise) === argmin(t, profit)].map(tf)); }

// ---- Graphics interpretation (data read from the question files)
const nearest = (options, value) => options.reduce((a, b) => (Math.abs(Number(b) - value) < Math.abs(Number(a) - value) ? b : a));
const dayName = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' };
const monthName = { Jan: 'January', Feb: 'February', Mar: 'March', Apr: 'April', May: 'May', Jun: 'June' };
{ const d = q('gi-0025'); const v = d.chart.series[0].values; const cat = d.chart.categories;
  const ratio = v[cat.indexOf('Fri')] / v[cat.indexOf('Tue')];
  const word = { 1.5: 'one and a half times', 2: 'twice', 3: 'three times' }[ratio];
  check('gi-0025', 'answers', answers('gi-0025'), [word, String(v.reduce((a, b) => a + b) / v.length)]);
  check('gi-0025', 'values on gridlines', v.every((x) => x % d.chart.y.step === 0), true); }
{ const d = q('gi-0026'); const v = d.chart.series[0].values; const cat = d.chart.categories;
  const falls = cat.filter((_, i) => i > 0 && v[i] < v[i - 1]).map((c) => monthName[c]);
  check('gi-0026', 'answers', answers('gi-0026'), [falls.length === 1 ? falls[0] : falls, `${(v[5] / v[0] - 1) * 100}%`]);
  check('gi-0026', 'values on gridlines', v.every((x) => x % d.chart.y.step === 0), true); }
{ const d = q('gi-0027'); const [adults, children] = d.chart.series.map((s) => s.values); const cat = d.chart.categories;
  const half = cat.filter((_, i) => adults[i] === children[i]).map((c) => dayName[c]);
  const total = (day) => adults[cat.indexOf(day)] + children[cat.indexOf(day)];
  const cmp = total('Sat') > 2 * total('Thu') ? 'more than twice' : total('Sat') === 2 * total('Thu') ? 'exactly twice' : 'less than twice';
  check('gi-0027', 'answers', answers('gi-0027'), [half.length === 1 ? half[0] : half, cmp]);
  check('gi-0027', 'values on gridlines', [...adults, ...children].every((x) => x % d.chart.y.step === 0), true); }
{ const d = q('gi-0028'); const pts = d.chart.series[0].points; const revenue = ([p, u]) => p * u;
  const best = argmax(pts, revenue); const at6 = pts.find(([p]) => p === 6);
  check('gi-0028', 'unique greatest revenue', unique(pts, revenue, argmax), true);
  check('gi-0028', 'answers', answers('gi-0028'), [String(best[0]), nearest(d.statements[1].options, (1 - revenue(at6) / revenue(best)) * 100)]);
  check('gi-0028', 'values on gridlines', pts.every(([, u]) => u % d.chart.y.step === 0), true); }
{ const d = q('gi-0029'); const [a, b] = d.chart.series.map((s) => s.values);
  const top = Math.max(...a.slice(1).map((v, i) => (v - a[i]) / 0.5));
  // Positions at any time by straight-line interpolation between the half-hour marks; time in steps of 1/1000 hour.
  const at = (v, t) => { const i = Math.min(Math.floor(t / 0.5), v.length - 2); return v[i] + ((v[i + 1] - v[i]) * (t - 0.5 * i)) / 0.5; };
  let ahead = 0; const dt = 0.001; for (let t = dt / 2; t < 3; t += dt) if (at(b, t) > at(a, t) + 1e-9) ahead += dt;
  const label = { 0.5: '30 minutes', 0.75: '45 minutes', 1: '1 hour', 1.25: '1 hour 15 minutes' }[Math.round(ahead * 100) / 100];
  console.log(`     gi-0029 B ahead for ${ahead.toFixed(3)} hours`);
  check('gi-0029', 'answers', answers('gi-0029'), [String(top), label]);
  check('gi-0029', 'values on gridlines', [...a, ...b].every((x) => x % d.chart.y.step === 0), true); }

// ---- Two-part analysis
const tpa = (id, pairs) => check(id, 'answer', q(id).answer, pairs.length === 1 ? pairs[0] : pairs);
{ const o = q('tpa-0032').options.map(Number); const pairs = [];
  for (const c of o) for (const h of o) if (c + h === 3 && 60 * c + 90 * h === 210) pairs.push([String(c), String(h)]);
  tpa('tpa-0032', pairs); }
{ const list = 40 * 1.5, sale = list * 0.8; tpa('tpa-0033', [[String(list), String(sale - 40)]]); }
{ const people = ['Amara', 'Boris', 'Chen', 'Dana'];
  const perms = (xs) => (xs.length <= 1 ? [xs] : xs.flatMap((x, i) => perms([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p])));
  const valid = perms(people).filter((p) => p.indexOf('Boris') === p.indexOf('Amara') + 1 && p.indexOf('Dana') < p.indexOf('Amara') && p[3] !== 'Chen');
  const must = (slot) => { const s = new Set(valid.map((p) => p[slot])); return s.size === 1 ? [...s][0] : null; };
  check('tpa-0034', 'orders', valid.length, 2);
  check('tpa-0034', 'only slots 3 and 4 are fixed', [must(0), must(1)], [null, null]);
  tpa('tpa-0034', [[must(2), must(3)]]); }
{ const breakEven = range(1, 2000).filter((u) => 15 * u - 4500 === 0); const target = range(1, 2000).filter((u) => close(15 * u - 4500, 0.2 * 25 * u));
  tpa('tpa-0035', [[String(breakEven[0]), String(target[0])]]);
  check('tpa-0035', 'unique', [breakEven.length, target.length], [1, 1]); }
{ const pairs = []; for (let x = 1; x <= 5000; x++) for (let y = x + 1; y <= 5000; y++) if (10 * (x + y) === x * y) pairs.push([x, y]);
  tpa('tpa-0036', [[String(pairs.length), String(Math.max(...pairs.map((p) => p[1])))]]); }

const letters = (ids) => ids.reduce((d, id) => { const a = q(id).answer; d[a] = (d[a] ?? 0) + 1; return d; }, {});
const dsIds = (lo, hi) => range(lo, hi).map((i) => `ds-00${i}`);
console.log('DS answer letters: foundation', letters(dsIds(60, 64)), 'challenge', letters(dsIds(65, 70)), fail ? `\n${fail} FAILED` : '\nall verified');
process.exit(fail ? 1 : 0);
