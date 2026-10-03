// Independent checks for the Mock 3 and Mock 4 Data Insights questions. Run from the project root.
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
const pickNearest = (options, value, parse = (o) => Number(String(o).replace(/[^0-9.]/g, ''))) => options.reduce((a, b) => (Math.abs(parse(b) - value) < Math.abs(parse(a) - value) ? b : a));
const rows = (id) => q(id).table.rows.map((r) => r.map((c) => { if (typeof c === 'number') return c; const n = Number(String(c).replace(/,/g, '').replace(/−/g, '-')); return Number.isNaN(n) ? c : n; }));
const argmax = (rs, f) => rs.reduce((a, b) => (f(b) > f(a) ? b : a));
const argmin = (rs, f) => rs.reduce((a, b) => (f(b) < f(a) ? b : a));
const uniqueMax = (rs, f) => rs.filter((r) => close(f(r), f(argmax(rs, f)))).length === 1;
const uniqueMin = (rs, f) => rs.filter((r) => close(f(r), f(argmin(rs, f)))).length === 1;
const isPrime = (n) => { if (n < 2) return false; for (let i = 2; i * i <= n; i++) if (n % i === 0) return false; return true; };
const divisorCount = (n) => range(1, n).filter((d) => n % d === 0).length;

// ======================= Mock 3 =======================
{ const cases = []; for (let r = 0; r <= 60; r++) for (let b = 0; b <= 60; b++) cases.push({ r, b });
  dsAnswer('ds-0032', cases, (c) => c.r, (c) => c.r + c.b === 24, (c) => c.b === 2 * c.r); }
dsAnswer('ds-0033', range(-200, 200).map((n) => ({ n })), (c) => c.n % 2 === 0, (c) => (c.n * c.n + c.n) % 2 === 0, (c) => (c.n * c.n) % 2 === 0);
{ const cases = []; for (const x of range(-10, 70, 1)) for (const y of range(-10, 40, 1)) for (const z of [...range(-10, 30, 1)]) cases.push({ x, y, z });
  dsAnswer('ds-0034', cases, (c) => (c.x + c.y + c.z) / 3, (c) => c.x + 2 * c.y + 3 * c.z === 60, (c) => 3 * c.x + 2 * c.y + c.z === 60); }
{ const cases = []; for (const u of [0.8, 0.9, 1, 1.1, 1.2]) for (const p of [0.85, 0.92, 1, 1.05]) for (const cost of [0.7, 0.9, 1, 1.1]) cases.push({ u, p, rev: u * p, profitUp: u * p * 100 - cost * 80 > 20 });
  dsAnswer('ds-0035', cases, (c) => c.rev > 1, (c) => c.u === 1.1 && c.p === 0.92, (c) => c.profitUp); }
dsAnswer('ds-0036', range(1, 3000).map((n) => ({ n })), (c) => c.n % 4, (c) => { const r = Math.round(Math.sqrt(c.n)); return r * r === c.n && r % 2 === 1; }, (c) => (c.n - 1) % 8 === 0);
{ const cases = []; for (const tB of range(1, 40, 0.5)) for (const tA of range(1, 40, 0.5)) cases.push({ tA, tB, together: 1 / (1 / tA + 1 / tB) });
  dsAnswer('ds-0037', cases, (c) => c.tA, (c) => close(c.tB, 2 * c.tA), (c) => c.together < 6); }
{ const terminates = (p, q0) => { const g = (a, b) => (b ? g(b, a % b) : a); let d = q0 / g(p, q0); while (d % 2 === 0) d /= 2; while (d % 5 === 0) d /= 5; return d === 1; };
  const only25 = (n) => { while (n % 2 === 0) n /= 2; while (n % 5 === 0) n /= 5; return n === 1; };
  const cases = []; for (let p = 1; p <= 60; p++) for (let qq = 1; qq <= 200; qq++) cases.push({ p, qq });
  dsAnswer('ds-0038', cases, (c) => terminates(c.p, c.qq), (c) => c.p % 3 === 0, (c) => only25(c.qq)); }

// MSR: solar panels
{ const roof = { Alder: 300, Birch: 500, Cedar: 400 }, use = { Alder: 60000, Birch: 200000, Cedar: 350000 };
  const plan = (panels) => { const n = Object.values(panels).reduce((a, b) => a + b, 0); const cost = n * 400 * (n >= 200 ? 0.7 : 1); const savings = n * 450 * 0.1; const fits = Object.entries(panels).every(([s, k]) => k * 2 <= roof[s]); const surplus = Object.entries(panels).some(([s, k]) => k * 450 > use[s]); return { n, payback: cost / savings, fits, surplus }; };
  check('msr-0015', 'value', money(keyedChoice('msr-0015')), Object.values(roof).reduce((a, b) => a + b) / 2);
  const cedar = plan({ Cedar: 200 });
  check('msr-0016', 'choice', keyedChoice('msr-0016'), pickNearest(q('msr-0016').choices, cedar.payback));
  const ok = (p) => p.fits && !p.surplus && p.payback <= 8;
  check('msr-0017', 'answers', answers('msr-0017'), [plan({ Alder: 150, Birch: 250, Cedar: 200 }), plan({ Birch: 250, Cedar: 200 }), plan({ Alder: 100 })].map(ok).map(yn)); }

// Tables
{ const t = rows('ta-0013'); const life = (r) => r[2], weight = (r) => r[3], price = (r) => r[1], rating = (r) => r[4], value = (r) => r[2] / r[1];
  check('ta-0013', 'unique extremes', [uniqueMax(t, life), uniqueMax(t, weight), uniqueMin(t, price), uniqueMin(t, rating), uniqueMax(t, value)].every(Boolean), true);
  check('ta-0013', 'answers', answers('ta-0013'), [argmax(t, life) === argmax(t, weight), argmin(t, price) === argmin(t, rating), argmin(t, price) === argmax(t, value)].map(tf)); }
{ const t = rows('ta-0014'); const perRep = (r) => r[2] / r[1], over = (r) => r[2] / r[3] - 1, perClient = (r) => r[2] / r[4];
  const by = (n) => t.find((r) => r[0] === n);
  check('ta-0014', 'unique extremes', uniqueMax(t, perRep) && uniqueMax(t, over), true);
  check('ta-0014', 'answers', answers('ta-0014'), [argmax(t, perRep) === argmax(t, over), t.filter((r) => r[2] >= r[3]).length > t.length / 2, perClient(by('East')) > perClient(by('North')) + 1e-9].map(yn)); }
{ const t = rows('ta-0015'); const by = (n) => t.find((r) => r[0] === n); const home = (r) => (r[1] * r[4]) / 100;
  const big = argmax(t, (r) => r[1]);
  check('ta-0015', 'answers', answers('ta-0015'), [big === argmax(t, (r) => r[2]) && big === argmax(t, (r) => r[3]), t.every((r) => r[4] < r[3]), home(by('Dalby')) > home(by('Belmar'))].map(tf)); }

// Graphs
{ const d = q('gi-0013'); const [rev, cost] = d.chart.series.map((s) => s.values); const profit = rev.map((v, i) => v - cost[i]); const best = profit.indexOf(Math.max(...profit));
  check('gi-0013', 'unique max profit', profit.filter((p) => p === Math.max(...profit)).length, 1);
  check('gi-0013', 'answers', d.statements.map((s) => s.answer), [d.chart.categories[best], pickNearest(d.statements[1].options, (cost.reduce((a, b) => a + b) / rev.reduce((a, b) => a + b)) * 100)]); }
{ const d = q('gi-0014'); const pts = d.chart.series[0].points; const ys = pts.map((p) => p[1]); const top = pts.filter((p) => p[1] === Math.max(...ys));
  check('gi-0014', 'readability (no score within 4 of 65 among <6h)', pts.filter(([x, y]) => x < 6 && Math.abs(y - 65) < 4).length, 0);
  check('gi-0014', 'answers', d.statements.map((s) => s.answer), [String(pts.filter(([x, y]) => x < 6 && y > 65).length), top.length === 1 ? String(top[0][0]) : 'tie']); }
{ const d = q('gi-0015'); const [a, b] = d.chart.series.map((s) => s.values.map(Number)); const lower = a.filter((v, i) => v < b[i]).length;
  const frac = (a[4] - a[9]) / a[4]; const words = { 'one-quarter': 0.25, 'one-third': 1 / 3, 'one-half': 0.5, 'two-thirds': 2 / 3 };
  check('gi-0015', 'answers', d.statements.map((s) => s.answer), [String(lower), Object.entries(words).reduce((x, y) => (Math.abs(y[1] - frac) < Math.abs(x[1] - frac) ? y : x))[0]]); }

// Two-part
const tpa = (id, pairs) => check(id, 'answer', q(id).answer, pairs.length === 1 ? pairs[0] : pairs);
{ const o = q('tpa-0016').options.map(Number); const pairs = []; for (const l of o) for (const w of o) if (l > w && 2 * (l + w) === 34 && l * w === 60) pairs.push([String(l), String(w)]); tpa('tpa-0016', pairs); }
{ const o = q('tpa-0018').options.map(Number); const pairs = []; for (const a of o) for (const b of o) if (a + b === 11 && 10 * b + a - (10 * a + b) === 27) pairs.push([String(a), String(b)]); tpa('tpa-0018', pairs); }
{ const o = q('tpa-0019').options.map(Number); const pairs = []; for (const a of o) for (const b of o) if (divisorCount(a) === 3 && divisorCount(b) === 4 && a + b === 35) pairs.push([String(a), String(b)]); tpa('tpa-0019', pairs); }

// ======================= Mock 4 =======================
if (has('ds-0039')) await import('./mock-04-data-insights.part.mjs').then((m) => { const extra = m.run({ q, check, ds, dsAnswer, range, close, yn, tf, answers, money, keyedChoice, pickNearest, rows, argmax, argmin, uniqueMax, uniqueMin, isPrime, divisorCount, tpa }); fail += extra; });

const letters = {}; for (const id of [...exam.questions.keys()].filter((k) => /^ds-00(3[2-9]|4[0-5])$/.test(k))) { const a = q(id).answer; letters[a] = (letters[a] ?? 0) + 1; }
console.log('DS answer letters (ds-0032..0045):', letters, fail ? `\n${fail} FAILED` : '\nall verified');
process.exit(fail ? 1 : 0);
