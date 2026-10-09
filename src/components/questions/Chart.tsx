// SVG bar, line and scatter charts drawn from the chart spec in question files.
// There are deliberately no data labels: reading values off the chart is part of the task.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Chart as ChartSpec } from '../../lib/content/schema.ts';

// The drawing is sized to its container (within limits) so that text stays the same size in a narrow
// multi-source tab or on a phone instead of shrinking with the whole chart.
const DEFAULT_W = 640;
const MIN_W = 360;
const MAX_W = 960;
const M = { top: 14, right: 16, bottom: 54, left: 62 };
const SERIES = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)'];
const MARKERS = ['circle', 'square', 'diamond', 'triangle'] as const;

interface Axis {
  label?: string;
  min?: number;
  max?: number;
  step?: number;
  prefix?: string;
  suffix?: string;
}

function niceStep(span: number, target = 6): number {
  const raw = span / target || 1;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const n = raw / mag;
  return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * mag;
}

function scale(values: number[], axis: Axis, includeZero: boolean) {
  const lo = Math.min(...values, ...(includeZero ? [0] : []));
  const hi = Math.max(...values);
  const step = axis.step ?? niceStep((axis.max ?? hi) - (axis.min ?? lo));
  const min = axis.min ?? Math.floor(lo / step) * step;
  const max = axis.max ?? Math.ceil(hi / step) * step;
  const ticks: number[] = [];
  for (let v = min; v <= max + step / 1e6; v += step) ticks.push(Number(v.toFixed(10)));
  const decimals = Math.max(0, -Math.floor(Math.log10(step)));
  const format = (v: number) => `${axis.prefix ?? ''}${v.toLocaleString('en-US', { maximumFractionDigits: decimals })}${axis.suffix ?? ''}`;
  return { min, max, ticks, format, to: (v: number, px: number) => ((v - min) / (max - min || 1)) * px };
}

function Marker({ kind, x, y, color }: { kind: (typeof MARKERS)[number]; x: number; y: number; color: string }) {
  const s = 4.5;
  const style = { fill: color, stroke: 'var(--surface)', strokeWidth: 1.5 };
  if (kind === 'square') return <rect x={x - s} y={y - s} width={s * 2} height={s * 2} style={style} />;
  if (kind === 'diamond') return <path d={`M${x} ${y - s * 1.3}L${x + s * 1.3} ${y}L${x} ${y + s * 1.3}L${x - s * 1.3} ${y}Z`} style={style} />;
  if (kind === 'triangle') return <path d={`M${x} ${y - s * 1.3}L${x + s * 1.2} ${y + s}L${x - s * 1.2} ${y + s}Z`} style={style} />;
  return <circle cx={x} cy={y} r={s} style={style} />;
}

export default function Chart({ chart }: { chart: ChartSpec }) {
  const ref = useRef<HTMLElement>(null);
  const [W, setW] = useState(DEFAULT_W);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.round(entry.contentRect.width);
      if (width > 0) setW(Math.min(MAX_W, Math.max(MIN_W, width)));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const H = Math.round(Math.min(340, Math.max(260, W * 0.55)));
  const PW = W - M.left - M.right;
  const PH = H - M.top - M.bottom;

  const multi = chart.series.length > 1;
  const yValues = chart.kind === 'scatter' ? chart.series.flatMap((s) => s.points.map((p) => p[1])) : chart.series.flatMap((s) => s.values);
  const y = scale(yValues, chart.y, chart.kind !== 'scatter');
  const yPx = (v: number) => M.top + PH - y.to(v, PH);

  let body: ReactNode;
  let xAxis: ReactNode;

  if (chart.kind === 'scatter') {
    const x = scale(chart.series.flatMap((s) => s.points.map((p) => p[0])), chart.x, false);
    const xPx = (v: number) => M.left + x.to(v, PW);
    xAxis = x.ticks.map((t) => (
      <g key={t}>
        <line x1={xPx(t)} x2={xPx(t)} y1={M.top} y2={M.top + PH} className="grid" />
        <text x={xPx(t)} y={M.top + PH + 18} textAnchor="middle" className="tick">
          {x.format(t)}
        </text>
      </g>
    ));
    body = chart.series.map((s, i) =>
      s.points.map(([px, py], j) => <Marker key={`${i}-${j}`} kind={MARKERS[i]} x={xPx(px)} y={yPx(py)} color={SERIES[i]} />),
    );
  } else {
    const n = chart.categories.length;
    const band = PW / n;
    const cx = (j: number) => M.left + band * (j + 0.5);
    xAxis = chart.categories.map((c, j) => (
      <text key={c} x={cx(j)} y={M.top + PH + 18} textAnchor="middle" className="tick">
        {c}
      </text>
    ));
    if (chart.kind === 'bar') {
      const group = band * 0.72;
      const bw = group / chart.series.length;
      const base = yPx(Math.max(y.min, 0));
      body = chart.series.map((s, i) =>
        s.values.map((v, j) => {
          const x0 = cx(j) - group / 2 + i * bw;
          const top = yPx(v);
          return (
            <rect
              key={`${i}-${j}`}
              x={x0 + 1}
              y={Math.min(top, base)}
              width={Math.max(bw - 2, 1)}
              height={Math.abs(base - top)}
              rx={2}
              style={{ fill: SERIES[i] }}
            />
          );
        }),
      );
    } else {
      body = chart.series.map((s, i) => (
        <g key={i}>
          <polyline
            points={s.values.map((v, j) => `${cx(j)},${yPx(v)}`).join(' ')}
            style={{ fill: 'none', stroke: SERIES[i], strokeWidth: 2.5, strokeLinejoin: 'round' }}
          />
          {s.values.map((v, j) => (
            <Marker key={j} kind={MARKERS[i]} x={cx(j)} y={yPx(v)} color={SERIES[i]} />
          ))}
        </g>
      ));
    }
  }

  const kind = { bar: 'Bar chart', line: 'Line chart', scatter: 'Scatter plot' }[chart.kind];
  const label = `${kind}${chart.title ? `: ${chart.title}` : ''}. The values are in the table that follows.`;
  // Exact values, not rounded to the axis step as the tick labels are.
  const yUnit = (v: number) => `${chart.y.prefix ?? ''}${v.toLocaleString('en-US', { maximumFractionDigits: 6 })}${chart.y.suffix ?? ''}`;

  // People who can't see the chart get the same data as a table. It is hidden visually, because for
  // everyone else reading values off the chart is part of the task.
  const dataTable =
    chart.kind === 'scatter' ? (
      <table className="visually-hidden">
        <caption>{chart.title ?? 'Chart'}: data</caption>
        <thead>
          <tr>
            {multi && <th scope="col">Series</th>}
            <th scope="col">{chart.x.label ?? 'Horizontal value'}</th>
            <th scope="col">{chart.y.label ?? 'Vertical value'}</th>
          </tr>
        </thead>
        <tbody>
          {chart.series.flatMap((s) =>
            s.points.map(([px, py], j) => (
              <tr key={`${s.name}-${j}`}>
                {multi && <td>{s.name}</td>}
                <td>{px}</td>
                <td>{yUnit(py)}</td>
              </tr>
            )),
          )}
        </tbody>
      </table>
    ) : (
      <table className="visually-hidden">
        <caption>
          {chart.title ?? 'Chart'}: data{chart.y.label ? ` (${chart.y.label})` : ''}
        </caption>
        <thead>
          <tr>
            <th scope="col">{chart.x.label ?? 'Category'}</th>
            {chart.series.map((s) => (
              <th key={s.name} scope="col">
                {s.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {chart.categories.map((c, j) => (
            <tr key={c}>
              <th scope="row">{c}</th>
              {chart.series.map((s) => (
                <td key={s.name}>{yUnit(s.values[j])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );

  return (
    <figure className="q-chart" ref={ref}>
      {chart.title && <figcaption className="q-chart-title">{chart.title}</figcaption>}
      {multi && (
        <ul className="q-legend">
          {chart.series.map((s, i) => (
            <li key={s.name}>
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                {chart.kind === 'bar' ? <rect x="1" y="1" width="12" height="12" rx="2" style={{ fill: SERIES[i] }} /> : <Marker kind={MARKERS[i]} x={7} y={7} color={SERIES[i]} />}
              </svg>
              {s.name}
            </li>
          ))}
        </ul>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="q-chart-svg">
        {y.ticks.map((t) => (
          <g key={t}>
            <line x1={M.left} x2={M.left + PW} y1={yPx(t)} y2={yPx(t)} className="grid" />
            <text x={M.left - 8} y={yPx(t) + 4} textAnchor="end" className="tick">
              {y.format(t)}
            </text>
          </g>
        ))}
        {xAxis}
        <line x1={M.left} x2={M.left + PW} y1={yPx(Math.max(y.min, 0))} y2={yPx(Math.max(y.min, 0))} className="axis" />
        {body}
        {chart.x.label && (
          <text x={M.left + PW / 2} y={H - 10} textAnchor="middle" className="axis-label">
            {chart.x.label}
          </text>
        )}
        {chart.y.label && (
          <text transform={`translate(16 ${M.top + PH / 2}) rotate(-90)`} textAnchor="middle" className="axis-label">
            {chart.y.label}
          </text>
        )}
      </svg>
      {dataTable}
    </figure>
  );
}
