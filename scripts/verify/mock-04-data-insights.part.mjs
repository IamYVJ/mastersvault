// Mock 4 Data Insights checks, run from verify-di4.mjs. Returns the number of failures.
export function run(h) {
  const { q, check, dsAnswer, range, close, yn, tf, answers, money, keyedChoice, pickNearest, rows, argmax, argmin, uniqueMax, uniqueMin, tpa } = h;
  let before = 0;
  const failures = [];
  const wrap = (fn) => { try { fn(); } catch (e) { failures.push(e); console.log('FAIL exception', e.message); } };
  const counted = (fn) => fn;

  // Data sufficiency
  dsAnswer('ds-0039', range(0, 200).map((pt) => ({ pt, prev: null })).flatMap((c) => range(0, 200).map((prev) => ({ pt: c.pt, prev }))),
    (c) => c.pt / 2, (c) => 200 - c.pt === 120, (c) => close(c.pt, c.prev * 1.25));
  { const cases = range(-30, 30, 0.5).map((x) => ({ x }));
    dsAnswer('ds-0040', cases, (c) => c.x, (c) => 3 * c.x - 7 === 2 * c.x + 5, (c) => c.x * c.x - 24 * c.x + 144 === 0); }
  { const cases = []; for (let a = -10; a <= 40; a += 5) for (let b = a; b <= 60; b += 5) for (let c = b; c <= 80; c += 5) for (let d = c; d <= 90; d += 5) { const e = 100 - a - b - c - d; if (e >= d) cases.push([a, b, c, d, e]); }
    dsAnswer('ds-0041', cases, (s) => s[2], (s) => s[4] === 40, (s) => s[0] === 5); }
  dsAnswer('ds-0042', range(1, 2000).map((n) => ({ n })), (c) => c.n % 12 === 0, (c) => c.n % 2 === 0 && c.n % 6 === 0, (c) => c.n % 3 === 0 && c.n % 8 === 0);
  { const cases = []; for (const cost of range(10, 300, 5)) for (const price of range(10, 450, 5)) cases.push({ cost, price });
    dsAnswer('ds-0043', cases, (c) => c.cost, (c) => close(c.price, 1.5 * c.cost), (c) => c.price - c.cost === 30); }
  { const cases = []; for (const d of range(10, 400, 10)) for (const v1 of [30, 40, 50]) for (const v2 of [40, 60, 80]) { const t = d / 2 / v1 + d / 2 / v2; cases.push({ d, v1, v2, t, avg: Math.round((d / t) * 1e6) / 1e6 }); }
    dsAnswer('ds-0044', cases, (c) => c.avg, (c) => c.v1 === 40 && c.v2 === 60, (c) => close(c.t, 5)); }
  { const cases = []; for (let x = -15; x <= 15; x++) for (let y = -15; y <= 15; y++) cases.push({ x, y });
    dsAnswer('ds-0045', cases, (c) => Math.abs(c.x * c.y) % 2 === 0, (c) => Math.abs(c.x + c.y) % 2 === 1, (c) => Math.abs(c.x * c.x + c.y) % 2 === 1); }

  // MSR: training plan
  const opt = { workshop: { fee: 450, hours: 12 }, online: { fee: 180, hours: 15 }, coaching: { fee: 900, hours: 8 } };
  const plan = (p, budget = 20000) => {
    const n = Object.values(p).reduce((a, b) => a + b, 0);
    const fees = Object.entries(p).reduce((s, [k, v]) => s + v * opt[k].fee, 0);
    const wages = Object.entries(p).reduce((s, [k, v]) => s + v * opt[k].hours * 30, 0);
    const ok = n === 60 && fees <= budget && (p.workshop ?? 0) % 20 === 0 && (p.workshop ?? 0) + (p.coaching ?? 0) >= 20;
    return { fees, wages, total: fees + wages, ok };
  };
  check('msr-0018', 'value', money(keyedChoice('msr-0018')), plan({ online: 60 }).total);
  { const plans = [{ online: 60 }, { workshop: 20, online: 40 }, { coaching: 20, online: 40 }, { workshop: 40, online: 20 }, { coaching: 10, workshop: 10, online: 40 }];
    const valid = plans.map((p) => plan(p).ok);
    check('msr-0019', 'valid plans', valid.filter(Boolean).length, 1);
    check('msr-0019', 'answer', q('msr-0019').answer, 'ABCDE'[valid.indexOf(true)]); }
  { const w = plan({ workshop: 20, online: 40 }), c = plan({ coaching: 20, online: 40 }, 26000);
    check('msr-0020', 'coaching plan allowed at $26,000', c.ok, true);
    check('msr-0020', 'answers', answers('msr-0020'), [opt.coaching.hours * 30 < opt.online.hours * 30, w.wages / w.total > 0.5, c.total < w.total].map(yn)); }

  // Tables
  { const t = rows('ta-0016'); const pass = (r) => r[2] / r[1]; const grade = (r) => r[3];
    check('ta-0016', 'unique extremes', uniqueMax(t, pass) && uniqueMax(t, grade), true);
    const overall = t.reduce((s, r) => s + r[2], 0) / t.reduce((s, r) => s + r[1], 0);
    check('ta-0016', 'answers', answers('ta-0016'), [argmax(t, pass) === argmax(t, grade), t.every((r) => r[1] / r[4] >= 35), overall > 0.85].map(tf)); }
  { const t = rows('ta-0017'); const late = (r) => r[2] / r[1], cost = (r) => r[3], perStaff = (r) => r[1] / r[4], total = (r) => r[1] * r[3];
    const by = (n) => t.find((r) => r[0] === n);
    check('ta-0017', 'unique extremes', uniqueMin(t, late) && uniqueMax(t, cost) && uniqueMax(t, perStaff), true);
    check('ta-0017', 'answers', answers('ta-0017'), [argmin(t, late) === argmax(t, cost), argmax(t, perStaff)[0] === 'Newark', total(by('Atlanta')) > total(by('Fresno'))].map(yn)); }
  { const t = rows('ta-0018'); const range_ = (r) => r[2], charge = (r) => r[4], perKwh = (r) => r[2] / r[3], perKm = (r) => r[1] / r[2], price = (r) => r[1];
    check('ta-0018', 'unique extremes', uniqueMax(t, range_) && uniqueMin(t, charge) && uniqueMin(t, perKm) && uniqueMin(t, price), true);
    check('ta-0018', 'answers', answers('ta-0018'), [argmax(t, range_) === argmin(t, charge), t.every((r) => perKwh(r) >= 6.5), argmin(t, perKm) === argmin(t, price)].map(tf)); }

  // Graphs
  { const d = q('gi-0016'); const v = d.chart.series[0].values.map(Number); const total = v.reduce((a, b) => a + b); const top3 = [...v].sort((a, b) => b - a).slice(0, 3).reduce((a, b) => a + b);
    check('gi-0016', 'third and fourth largest differ', [...v].sort((a, b) => b - a)[2] !== [...v].sort((a, b) => b - a)[3], true);
    check('gi-0016', 'answers', d.statements.map((s) => s.answer), [pickNearest(d.statements[0].options, (top3 / total) * 100), String(v[6] / v[0])]); }
  { const d = q('gi-0017'); const [a, b] = d.chart.series.map((s) => s.values.map(Number)); const i = a.findIndex((x, k) => x > b[k]);
    check('gi-0017', 'answers', d.statements.map((s) => s.answer), [d.chart.categories[i], String(a[a.length - 1] - a[0])]); }
  { const d = q('gi-0018'); const pts = d.chart.series[0].points;
    const n = pts.length, mx = pts.reduce((s, p) => s + p[0], 0) / n, my = pts.reduce((s, p) => s + p[1], 0) / n;
    const r = pts.reduce((s, [x, y]) => s + (x - mx) * (y - my), 0) / Math.sqrt(pts.reduce((s, [x]) => s + (x - mx) ** 2, 0) * pts.reduce((s, [, y]) => s + (y - my) ** 2, 0));
    console.log(`     gi-0018 correlation ${r.toFixed(3)}`);
    check('gi-0018', 'readability (no dense town within 15 of $300k)', pts.filter(([x, y]) => x > 20 && Math.abs(y - 300) < 15).length, 0);
    check('gi-0018', 'answers', d.statements.map((s) => s.answer), [String(pts.filter(([x, y]) => x > 20 && y < 300).length), r > 0.7 ? 'positive' : r < -0.7 ? 'negative' : 'close to zero']); }

  // Two-part
  { const o = q('tpa-0020').options; const pairs = []; for (const a of o) for (const p of o) { const x = money(a), y = money(p); if (close(3 * x + 2 * y, 2.6) && close(2 * x + 3 * y, 2.9)) pairs.push([a, p]); } tpa('tpa-0020', pairs); }
  { const o = q('tpa-0022').options.map(Number); const pairs = []; for (const a of o) for (const b of o) if (a + b === 5 && 9 * a + b === 21) pairs.push([String(a), String(b)]); tpa('tpa-0022', pairs); }
  { const o = q('tpa-0023').options.map(Number); const pairs = []; for (const r of o) for (const b of o) if (r + b === 10 && close((r / 10) * ((r - 1) / 9), 1 / 3)) pairs.push([String(r), String(b)]); tpa('tpa-0023', pairs); }

  return failures.length;
}
