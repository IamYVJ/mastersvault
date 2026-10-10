// Independent checks for the Mock 7 and Mock 8 Data Insights questions. Run from the project root.
// tpa-0044 rests on written reasoning and is not checked here.
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
const keyedChoice = (id) => { const d = q(id); return d.choices['ABCDE'.indexOf(d.answer)]; };
const pickNearest = (options, value, parse = money) => options.reduce((a, b) => (Math.abs(parse(b) - value) < Math.abs(parse(a) - value) ? b : a));
const rows = (id) => q(id).table.rows.map((r) => r.map((c) => { if (typeof c === 'number') return c; const n = Number(String(c).replace(/,/g, '')); return Number.isNaN(n) ? c : n; }));
const argmax = (rs, f) => rs.reduce((a, b) => (f(b) > f(a) ? b : a));
const argmin = (rs, f) => rs.reduce((a, b) => (f(b) < f(a) ? b : a));
const uniqueMax = (rs, f) => rs.filter((r) => close(f(r), f(argmax(rs, f)))).length === 1;
const uniqueMin = (rs, f) => rs.filter((r) => close(f(r), f(argmin(rs, f)))).length === 1;
const tpa = (id, pairs) => check(id, 'answer', q(id).answer, pairs.length === 1 ? pairs[0] : pairs);
const sum = (xs) => xs.reduce((a, b) => a + b, 0);
const isPrime = (n) => { if (n < 2) return false; for (let i = 2; i * i <= n; i++) if (n % i === 0) return false; return true; };
const onGrid = (id) => { const c = q(id).chart; const ok = (v, axis) => close(((v - axis.min) / axis.step) % 1, 0) || close(((v - axis.min) / axis.step) % 1, 1);
  const ys = c.series.flatMap((s) => (s.points ? s.points.map((p) => p[1]) : s.values)); const xs = c.series.flatMap((s) => (s.points ? s.points.map((p) => p[0]) : []));
  check(id, 'values on gridlines', ys.every((v) => ok(Number(v), c.y)) && xs.every((v) => ok(Number(v), c.x)), true); };
const gi = (id) => q(id).statements.map((s) => s.answer);

// ======================= Mock 7 =======================
{ const cases = []; for (let a = 1; a <= 60; a++) for (let c = 1; c <= 60; c++) cases.push({ a, c });
  dsAnswer('ds-0071', cases, (c) => c.a / c.c, (c) => c.a - c.c === 12, (c) => 5 * c.a === 3 * (c.a + c.c)); }
dsAnswer('ds-0072', range(20, 1000, 20).map((n) => ({ n })), (c) => c.n, (c) => (7 * c.n) / 20 === 84, (c) => (13 * c.n) / 20 - (7 * c.n) / 20 === 72);
dsAnswer('ds-0073', range(1, 300).map((n) => ({ n })), (c) => c.n % 10, (c) => (c.n * c.n) % 10 === 5, (c) => (2 * c.n) % 10 === 0);
dsAnswer('ds-0074', range(10, 99).map((n) => ({ n })), (c) => c.n, (c) => Math.floor(c.n / 10) + (c.n % 10) === 9, (c) => c.n % 7 === 0);
{ const cases = []; for (const a of range(-6, 6, 0.5)) for (const b of range(-6, 6, 0.5)) if (a !== 0 && b !== 0) cases.push({ a, b });
  dsAnswer('ds-0075', cases, (c) => c.a / c.b > 1, (c) => c.a > c.b, (c) => c.a + c.b > 0); }
{ const cases = []; for (const n of [10, 300, 500]) for (const [lo, hi] of [[10, 30], [18, 25], [20, 40]]) for (let k = 0; k <= 10; k++) cases.push({ n, lo, hi, revenue: (n * k / 10) * lo + (n - (n * k) / 10) * hi });
  dsAnswer('ds-0076', cases, (c) => c.revenue > 5000, (c) => c.n === 300, (c) => c.lo === 18 && c.hi === 25); }
{ const cases = []; for (let a = 1; a <= 10; a++) for (let b = a; b <= 10; b++) for (let c = b; c <= 10; c++) for (let d = c; d <= 10; d++) for (let e = d; e <= 10; e++) cases.push([a, b, c, d, e]);
  dsAnswer('ds-0077', cases, (s) => s[2] >= 7, (s) => sum(s) === 42, (s) => s[0] === 5); }

// MSR: charity concert
{ const venues = { guild: { seats: 300, fee: 1200, cut: 0 }, riverside: { seats: 500, fee: 2400, cut: 0.1 } };
  const other = 1500 + 400;
  const raised = (v, standard, student) => (standard * 20 + student * 10) * (1 - venues[v].cut) - venues[v].fee - other;
  const mixed = (v, wanted) => { const sold = Math.min(wanted, venues[v].seats); return raised(v, (sold * 3) / 4, sold / 4); };
  check('msr-0033', 'value', money(keyedChoice('msr-0033')), mixed('guild', 300));
  check('msr-0034', 'answers', answers('msr-0034'), [mixed('riverside', 420) > mixed('guild', 420), raised('guild', 300, 0) >= 3000, close(raised('riverside', 201, 50) - raised('riverside', 200, 50), 18)].map(yn));
  check('msr-0035', 'value', money(keyedChoice('msr-0035')), mixed('riverside', 480));
  for (const id of ['msr-0033', 'msr-0035']) check(id, 'only one matching choice', q(id).choices.filter((c) => c === keyedChoice(id)).length, 1); }

// Tables
{ const t = rows('ta-0029'); const perTrip = (r) => r[3] / r[2], perDay = (r) => r[3]; const by = (n) => t.find((r) => r[0] === n);
  check('ta-0029', 'unique extremes', uniqueMax(t, perTrip) && uniqueMax(t, perDay), true);
  check('ta-0029', 'answers', answers('ta-0029'), [argmax(t, perTrip) === argmax(t, perDay), (by('Route 30')[2] * (100 - by('Route 30')[4])) / 100 > 10, by('Route 14')[1] * by('Route 14')[2] === by('Route 8')[1] * by('Route 8')[2]].map(tf)); }
{ const t = rows('ta-0030'); const share = (r) => r[3], recycled = (r) => (r[2] * r[3]) / 100, perResident = (r) => (r[2] * r[4]) / r[1]; const by = (n) => t.find((r) => r[0] === n);
  check('ta-0030', 'unique extremes', uniqueMax(t, share) && uniqueMin(t, recycled) && uniqueMin(t, perResident), true);
  check('ta-0030', 'answers', answers('ta-0030'), [argmax(t, share) === argmin(t, recycled), recycled(by('Dunmoor')) > recycled(by('Glenby')) + 1e-9, argmin(t, perResident)[0] === 'Farley'].map(tf)); }
{ const t = rows('ta-0031'); const perMember = (r) => r[2] / r[1], perStaff = (r) => r[2] / r[4], perHour = (r) => r[2] / r[3]; const by = (n) => t.find((r) => r[0] === n);
  check('ta-0031', 'unique extremes', uniqueMax(t, perMember) && uniqueMax(t, perStaff), true);
  check('ta-0031', 'answers', answers('ta-0031'), [argmax(t, perMember) === argmax(t, perStaff), by('Central')[2] / sum(t.map((r) => r[2])) < by('Central')[1] / sum(t.map((r) => r[1])), perHour(by('Northgate')) > perHour(by('Eastside'))].map(tf)); }

// Graphs
{ const d = q('gi-0030'); const [apps, offers] = d.chart.series.map((s) => s.values.map(Number)); const rate = offers.map((o, i) => o / apps[i]);
  onGrid('gi-0030');
  check('gi-0030', 'unique greatest proportion', rate.filter((r) => close(r, Math.max(...rate))).length, 1);
  check('gi-0030', 'answers', gi('gi-0030'), [d.chart.categories[rate.indexOf(Math.max(...rate))], pickNearest(d.statements[1].options, (100 * sum(offers)) / sum(apps))]); }
{ const d = q('gi-0031'); const pts = d.chart.series[0].points; const speed = (p) => (p[0] / p[1]) * 60; const top = Math.max(...pts.map(speed));
  onGrid('gi-0031');
  check('gi-0031', 'unique fastest', pts.filter((p) => close(speed(p), top)).length, 1);
  check('gi-0031', 'answers', gi('gi-0031'), [String(pts.find((p) => close(speed(p), top))[0]), String(pts.filter((p) => speed(p) < 30 - 1e-9).length)]); }
{ const d = q('gi-0032'); const v = d.chart.series[0].values.map(Number); const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July'];
  const rise = (label) => { const i = months.indexOf(label.split(' to ')[0]); return v[i + 1] / v[i] - 1; };
  const allRises = v.slice(1).map((x, i) => x / v[i] - 1); const best = d.statements[0].options.reduce((a, b) => (rise(b) > rise(a) ? b : a));
  onGrid('gi-0032');
  check('gi-0032', 'best option is the greatest rise of all months', close(rise(best), Math.max(...allRises)) && allRises.filter((r) => close(r, Math.max(...allRises))).length === 1, true);
  check('gi-0032', 'answers', gi('gi-0032'), [best, pickNearest(d.statements[1].options, ((v[1] - v[4]) / v[1]) * 100)]); }

// Two-part
{ const o = q('tpa-0038').options.map(money); const pairs = []; for (const b of o) for (const c of o) { const a = (2 * b) / 3; if (b === 2 * c && close(a + b + c, 1950)) pairs.push([String(b), String(c)]); } tpa('tpa-0038', pairs); }
{ const people = ['Lena', 'Marco', 'Nia', 'Omar', 'Priya']; const teams = [];
  for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) for (let k = j + 1; k < 5; k++) { const t = new Set([people[i], people[j], people[k]]);
    if (t.has('Lena') && t.has('Marco')) continue; if (t.has('Nia') && !t.has('Omar')) continue; if (t.has('Marco') === t.has('Priya')) continue; teams.push(t); }
  check('tpa-0039', 'number of possible teams', teams.length, 3);
  const must = people.filter((p) => teams.every((t) => t.has(p))); const never = people.filter((p) => p !== 'Nia' && !teams.some((t) => t.has('Nia') && t.has(p)));
  const pairs = []; for (const m of must) for (const n of never) pairs.push([m, n]); tpa('tpa-0039', pairs); }
{ const o = q('tpa-0040').options; const pairs = []; for (const r of o) for (const p of o) { const m = 1 + money(r) / 100; if (close(20000 * m * m, 24200, 0.5) && close(24200 * m, money(p), 0.5)) pairs.push([r, p]); } tpa('tpa-0040', pairs); }
{ let lo = Infinity, hi = -Infinity; for (let a = 1; a < 10; a++) for (let b = a + 1; b < 10; b++) for (let d = 11; d <= 60; d++) { const e = 60 - 10 - a - b - d; if (e > d) { lo = Math.min(lo, e); hi = Math.max(hi, e); } }
  tpa('tpa-0041', [[String(lo), String(hi)]]); }

// ======================= Mock 8 =======================
{ const cases = []; for (const dep of [450, 460, 470]) for (const arr of [495, 505, 515]) cases.push({ dep, arr });
  dsAnswer('ds-0078', cases, (c) => c.arr - c.dep, (c) => c.dep === 7 * 60 + 40, (c) => c.arr === 8 * 60 + 25); }
{ const cases = []; for (const chess of [40, 50]) for (const bridge of [45, 50]) for (let neither = 0; neither <= 30; neither++) { const both = chess + bridge + neither - 80; if (both >= 0 && both <= Math.min(chess, bridge)) cases.push({ chess, bridge, neither, both }); }
  dsAnswer('ds-0079', cases, (c) => c.both, (c) => c.chess === 50 && c.bridge === 45, (c) => c.neither >= 5); }
dsAnswer('ds-0080', range(-10, 10, 0.5).map((x) => ({ x })), (c) => c.x, (c) => c.x * c.x - 6 * c.x + 9 === 0, (c) => c.x * c.x - 9 === 0);
dsAnswer('ds-0081', range(-20, 120, 0.5).map((x) => ({ x })), (c) => Math.abs(c.x - 10) < Math.abs(c.x), (c) => c.x > 3, (c) => c.x > 6);
{ const cases = range(0, 20).map((k) => { const s = [...Array(20 - k).fill(40000), ...Array(k).fill(60000)]; return { k, mean: sum(s) / 20, median: (s[9] + s[10]) / 2 }; });
  dsAnswer('ds-0082', cases, (c) => c.median, (c) => c.mean === 48000, (c) => c.k > 5); }
{ const cases = []; for (const x of range(-8, 8, 0.5)) for (const y of range(-8, 8, 0.5)) cases.push({ x, y }); cases.push({ x: Math.sqrt(29), y: 0 });
  dsAnswer('ds-0083', cases, (c) => Math.round(c.x * c.y * 1e6) / 1e6, (c) => c.x + c.y === 7, (c) => close(c.x * c.x + c.y * c.y, 29)); }
dsAnswer('ds-0084', range(2, 3000).filter(isPrime).map((p) => ({ p })), (c) => c.p, (c) => isPrime(c.p + 2) && isPrime(c.p + 4), (c) => isPrime(c.p * c.p + 2));

// MSR: office coffee machine
{ const m = { Arabella: { price: 1200, cup: 0.4, service: 200, max: 80 }, Brio: { price: 3000, cup: 0.25, service: 300, max: 150 }, Crema: { price: 6600, cup: 0.15, service: 500, max: 300 } };
  const perDay = 50 * 2, perYear = perDay * 250;
  const total = (name, cups, years) => m[name].price + years * (cups * m[name].cup + m[name].service);
  check('msr-0036', 'value', money(keyedChoice('msr-0036')), total('Brio', perYear, 1));
  check('msr-0037', 'answers', answers('msr-0037'), [m.Arabella.max >= perDay, total('Crema', perYear, 3) < total('Brio', perYear, 3), total('Brio', perYear / 2, 3) < total('Crema', perYear / 2, 3)].map(yn));
  const even = range(1000, 60000, 100).filter((n) => close(total('Brio', n, 3), total('Crema', n, 3)));
  check('msr-0038', 'value', [money(keyedChoice('msr-0038'))], even); }

// Tables
{ const t = rows('ta-0032'); const perHour = (r) => r[1] / r[3], late = (r) => r[4] / r[1], kmEach = (r) => r[2] / r[1]; const by = (n) => t.find((r) => r[0] === n);
  check('ta-0032', 'unique extremes', uniqueMax(t, perHour) && uniqueMin(t, late) && uniqueMax(t, kmEach), true);
  check('ta-0032', 'answers', answers('ta-0032'), [argmax(t, perHour) === argmin(t, late), argmax(t, kmEach)[0] === 'Cole', late(by('Amir')) > late(by('Dina')) + 1e-9].map(tf)); }
{ const t = rows('ta-0033'); const size = (r) => r[2] / r[1], yieldPer = (r) => r[3] / r[2], costPer = (r) => r[4] / r[3]; const by = (n) => t.find((r) => r[0] === n);
  check('ta-0033', 'unique extremes', uniqueMax(t, size) && uniqueMax(t, yieldPer), true);
  check('ta-0033', 'answers', answers('ta-0033'), [argmax(t, size) === argmax(t, yieldPer), by('Blackmoor')[3] > sum(t.map((r) => r[3])) / 4, costPer(by('Ember')) > 2 * costPer(by('Cairn'))].map(tf)); }
{ const t = rows('ta-0034'); const paying = (r) => (r[1] * r[2]) / 100, revenue = (r) => paying(r) * r[3], perDownload = (r) => revenue(r) / r[1], rating = (r) => r[4]; const by = (n) => t.find((r) => r[0] === n);
  check('ta-0034', 'unique extremes', uniqueMin(t, paying) && uniqueMax(t, revenue) && uniqueMax(t, rating) && uniqueMax(t, perDownload), true);
  check('ta-0034', 'answers', answers('ta-0034'), [revenue(by('Bloom')) > revenue(by('Atlas')), argmin(t, paying) === argmax(t, revenue), argmax(t, rating) === argmax(t, perDownload)].map(tf)); }

// Graphs
{ const d = q('gi-0033'); const [dry, rainy] = d.chart.series.map((s) => s.values.map(Number)); const full = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' };
  const half = d.chart.categories.filter((_, i) => rainy[i] * 2 === dry[i]).map((c) => full[c]);
  onGrid('gi-0033');
  check('gi-0033', 'answers', gi('gi-0033'), [half.length === 1 ? half[0] : half, pickNearest(d.statements[1].options, ((sum(dry) - sum(rainy)) / sum(dry)) * 100)]); }
{ const d = q('gi-0034'); const [a, b] = d.chart.series.map((s) => s.values.map(Number)); const volA = [20000, 20000, 20000, 20000], volB = [10000, 10000, 10000, 30000];
  const lateA = a.map((p, i) => (p * volA[i]) / 100), lateB = b.map((p, i) => (p * volB[i]) / 100); const ratio = lateA[0] / lateB[0];
  onGrid('gi-0034');
  check('gi-0034', 'answers', gi('gi-0034'), [close(ratio, 1) ? 'equal to' : close(ratio, 0.5) ? 'half' : close(ratio, 2) ? 'twice' : 'none', pickNearest(d.statements[1].options, (sum(lateB) / sum(volB)) * 100)]);
  check('gi-0034', 'yearly figure is exact', (sum(lateB) / sum(volB)) * 100, money(d.statements[1].answer)); }
{ const d = q('gi-0035'); const pts = d.chart.series[0].points; const wages = pts.map((p) => p[1]).sort((x, y) => x - y); const median = (wages[4] + wages[5]) / 2;
  const mx = sum(pts.map((p) => p[0])) / pts.length, my = sum(pts.map((p) => p[1])) / pts.length;
  const slope = sum(pts.map((p) => (p[0] - mx) * (p[1] - my))) / sum(pts.map((p) => (p[0] - mx) ** 2));
  onGrid('gi-0035');
  check('gi-0035', 'answers', gi('gi-0035'), [pickNearest(d.statements[0].options, median), pickNearest(d.statements[1].options, slope)]);
  check('gi-0035', 'median is exactly an option', money(d.statements[0].answer), median); }

// Two-part
{ const o = q('tpa-0042').options.map(Number); const pairs = []; for (const a of o) for (const b of o) if (a % 2 === 1 && b === a + 2 && b * b - a * a === 48) pairs.push([String(a), String(b)]); tpa('tpa-0042', pairs); }
{ const o = q('tpa-0043').options; const pairs = []; for (const p of o) for (const r of o) if (close(money(p) * (1 + (2 * money(r)) / 100), 5600) && close(money(p) * (1 + (5 * money(r)) / 100), 6500)) pairs.push([p, r]); tpa('tpa-0043', pairs); }
{ // Try many speeds and distances; keep those where the times left after passing are 2 hours (P) and 8 hours (Q).
  const found = new Set(); const speedQ = 60;
  for (const speedP of range(10, 400, 5)) for (const dist of range(10, 4000, 10)) { const t = dist / (speedP + speedQ);
    if (close((dist - speedP * t) / speedP, 2) && close((dist - speedQ * t) / speedQ, 8)) found.add(`${Math.round(t * 1e6) / 1e6}|${Math.round((dist / Math.min(speedP, speedQ)) * 1e6) / 1e6}`); }
  tpa('tpa-0045', [...found].map((s) => s.split('|'))); }

const tally = (re) => { const t = {}; for (const id of [...exam.questions.keys()].filter((k) => re.test(k))) { const a = q(id).answer; t[a] = (t[a] ?? 0) + 1; } return t; };
console.log('DS answer letters: mock 7', JSON.stringify(tally(/^ds-007[1-7]$/)), 'mock 8', JSON.stringify(tally(/^ds-00(7[89]|8[0-4])$/)), fail ? `\n${fail} FAILED` : '\nall verified');
process.exit(fail ? 1 : 0);
