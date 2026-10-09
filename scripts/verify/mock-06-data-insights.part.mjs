// Mock 6 Data Insights checks, run from mocks-05-06-data-insights.mjs with its helpers.
export function run(h) {
  const { q, check, dsAnswer, range, close, yn, tf, answers, money, keyedChoice, pickNearest, rows, argmax, argmin, uniqueMax, uniqueMin, tpa, sum } = h;

  // ---- Data sufficiency
  { const cases = []; for (const regular of range(20, 300, 10)) for (const sale of range(10, 300, 5)) if (sale < regular) cases.push({ regular, sale });
    dsAnswer('ds-0053', cases, (c) => c.sale, (c) => close(c.sale, 0.75 * c.regular), (c) => c.regular === 80 && c.regular - c.sale === 20); }
  { const cases = []; for (const x of range(-12, 12, 0.5)) for (const y of range(-12, 12, 0.5)) cases.push({ x, y });
    dsAnswer('ds-0054', cases, (c) => 2 * c.x + 6 * c.y, (c) => c.x + 3 * c.y === 9, (c) => 4 * c.x + 12 * c.y === 36); }
  { const factors = (n) => range(1, n).filter((d) => n % d === 0).length;
    dsAnswer('ds-0055', range(1, 400).map((n) => ({ n })), (c) => c.n % 2 === 1, (c) => c.n ** 3 % 2 === 1, (c) => factors(c.n) % 2 === 1); }
  { const cases = []; for (const a of range(50, 100, 5)) for (const b of range(50, 100, 5)) cases.push({ a, b, mean: (12 * a + 18 * b) / 30 });
    dsAnswer('ds-0056', cases, (c) => c.mean, (c) => c.a === 80, (c) => c.b === 70); }
  { const cases = []; for (const d of range(5, 80, 5)) for (const v of range(5, 40, 2.5)) cases.push({ d, v, t: Math.round((d / v) * 1e6) / 1e6 });
    dsAnswer('ds-0057', cases, (c) => c.t, (c) => close(c.v, c.d / 2 + 5), (c) => c.d === 30 && c.v === 20); }
  { const cases = range(0, 6000, 150).map((F) => ({ F, breakEven: F / 6 }));
    dsAnswer('ds-0058', cases, (c) => c.breakEven, (c) => c.F === 1800, (c) => 500 * 6 - c.F === 1200); }
  { const cases = []; for (let a = 1; a <= 60; a++) for (let b = 1; b <= 60; b++) cases.push({ a, b });
    dsAnswer('ds-0059', cases, (c) => c.a + c.b, (c) => c.a * c.b === 13, (c) => c.a - c.b === 12); }

  // ---- MSR: clinic appointments
  { const perDoctor = (8 - 1) * 60; const demand = 60 * 20 + 10 * 40;
    check('msr-0024', 'value', money(keyedChoice('msr-0024')), 3 * perDoctor);
    check('msr-0025', 'four doctors can book all requests', 4 * perDoctor >= demand, true);
    const standard = 0.9 * 60 * 50, extended = 0.9 * 10 * 90;
    check('msr-0025', 'value', money(keyedChoice('msr-0025')), standard + extended);
    check('msr-0026', 'answers', answers('msr-0026'), [3 * perDoctor >= demand, 10 * 40 > (60 * 20) / 3, standard > 3 * extended].map(yn)); }

  // ---- Tables
  { const t = rows('ta-0022'); const revenue = (r) => r[1] * r[2], hours = (r) => r[1] * r[3]; const by = (n) => t.find((r) => r[0] === n);
    check('ta-0022', 'unique extremes', uniqueMax(t, revenue) && uniqueMax(t, (r) => r[1]) && uniqueMin(t, (r) => r[4]) && uniqueMin(t, (r) => r[3]), true);
    check('ta-0022', 'answers', answers('ta-0022'), [argmax(t, revenue) === argmax(t, (r) => r[1]), argmin(t, (r) => r[4]) === argmin(t, (r) => r[3]), hours(by('East')) > hours(by('North')) + hours(by('West'))].map(tf)); }
  { const t = rows('ta-0023'); const over = (r) => r[2] / r[1] - 1, delay = (r) => r[4] / r[3] - 1;
    check('ta-0023', 'unique extremes', uniqueMax(t, over) && uniqueMax(t, delay), true);
    check('ta-0023', 'answers', answers('ta-0023'), [argmax(t, over) === argmax(t, delay), t.filter((r) => r[2] <= r[1]).length === 1, sum(t.map((r) => r[2])) / sum(t.map((r) => r[1])) - 1 > 0.15].map(yn)); }
  { const t = rows('ta-0024'); const five = (r) => (r[1] * r[3]) / 100, one = (r) => (r[1] * r[4]) / 100; const by = (n) => t.find((r) => r[0] === n);
    check('ta-0024', 'unique extremes', uniqueMax(t, (r) => r[2]) && uniqueMax(t, (r) => r[5]) && uniqueMax(t, one) && uniqueMin(t, (r) => r[2]), true);
    check('ta-0024', 'whole review counts', t.every((r) => Number.isInteger(five(r)) && Number.isInteger(one(r))), true);
    check('ta-0024', 'answers', answers('ta-0024'), [argmax(t, (r) => r[2]) === argmax(t, (r) => r[5]), five(by('Bolero')) > five(by('Cadence')) + five(by('Encore')), argmax(t, one) === argmin(t, (r) => r[2])].map(tf)); }

  // ---- Graphs
  { const d = q('gi-0022'); const [gained, lost] = d.chart.series.map((s) => s.values.map(Number));
    check('gi-0022', 'readable gaps (at least 10)', gained.every((v, i) => Math.abs(v - lost[i]) >= 10), true);
    check('gi-0022', 'answers', d.statements.map((s) => s.answer), [String(gained.filter((v, i) => lost[i] > v).length), String(sum(gained) - sum(lost))]); }
  { const d = q('gi-0023'); const [y20, y25] = d.chart.series.map((s) => s.values.map(Number)); const a20 = (y20[0] / 100) * 50, a25 = (y25[0] / 100) * 80; const change = Math.round((a25 / a20 - 1) * 100);
    check('gi-0023', 'shares add to 100', sum(y20) === 100 && sum(y25) === 100, true);
    const label = change === 0 ? 'did not change' : `${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(change)}%`;
    check('gi-0023', 'answers', d.statements.map((s) => s.answer), [label, pickNearest(d.statements[1].options, y25[1] / y25[2])]); }
  { const d = q('gi-0024'); const pts = d.chart.series[0].points; const oldest = pts.reduce((a, b) => (b[0] > a[0] ? b : a)), newest = pts.reduce((a, b) => (b[0] < a[0] ? b : a));
    check('gi-0024', 'answers', d.statements.map((s) => s.answer), [String(pts.filter(([, y]) => y > 5).length), String(oldest[1] / newest[1])]); }

  // ---- Two-part
  { const o = q('tpa-0028').options.map(Number); const pairs = []; for (const w of o) for (const amt of o) if (200 + 30 * w === 500 - 20 * w && amt === 200 + 30 * w) pairs.push([String(w), String(amt)]); tpa('tpa-0028', pairs); }
  { const o = q('tpa-0030').options.map(Number); const pairs = []; for (const x of o) for (const r of o) { const s = [3, 5, 8, 12, x]; if (close(sum(s) / 5, x) && Math.max(...s) - Math.min(...s) === r) pairs.push([String(x), String(r)]); } tpa('tpa-0030', pairs); }
  { const valid = range(1, 500).filter((n) => n % 5 === 2 && n % 7 === 3); tpa('tpa-0031', [[String(valid[0]), String(valid[1])]]);
    check('tpa-0031', 'both answers are options', q('tpa-0031').options.includes(String(valid[0])) && q('tpa-0031').options.includes(String(valid[1])), true); }
}
