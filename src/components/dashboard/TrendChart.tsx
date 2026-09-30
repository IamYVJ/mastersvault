// Accuracy per section over time. One line per section, coloured by the
// section's fixed position in the exam (never by rank), with a legend, end
// labels and a crosshair tooltip. The history table below carries every value.
import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { Trend } from '../../lib/engine/progress.ts';

const W = 720;
const H = 240;
const M = { top: 14, right: 72, bottom: 30, left: 44 };
const PW = W - M.left - M.right;
const PH = H - M.top - M.bottom;
const SERIES = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)'];

interface Props {
  trends: Trend[];
  /** Section ids in exam order; a section's colour is its position here. */
  sectionOrder: string[];
  shortNames: Record<string, string>;
  attempts: { finishedAt: number; title: string }[];
}

const pct = (v: number) => `${Math.round(v * 100)}%`;
const day = (t: number) => new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

export default function TrendChart({ trends, sectionOrder, shortNames, attempts }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const n = attempts.length;
  const x = (i: number) => M.left + (n <= 1 ? PW / 2 : (i / (n - 1)) * PW);
  const y = (v: number) => M.top + PH - v * PH;
  const colour = (id: string) => SERIES[Math.max(0, sectionOrder.indexOf(id)) % SERIES.length];
  const labelEvery = Math.max(1, Math.ceil(n / 8));

  const onMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const r = svg.current!.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = n <= 1 ? 0 : Math.round(((px - M.left) / PW) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  };

  const rows = hover === null ? [] : trends.map((t) => ({ t, p: t.points.find((p) => p.index === hover) })).filter((r) => r.p);

  // End labels: skip any that would collide with one already placed; the legend still names every line.
  const placed: { x: number; y: number }[] = [];
  const endLabel = new Set<string>();
  for (const t of trends) {
    const last = t.points[t.points.length - 1];
    const pos = { x: x(last.index), y: y(last.accuracy) };
    if (placed.some((p) => Math.abs(p.x - pos.x) < 60 && Math.abs(p.y - pos.y) < 14)) continue;
    placed.push(pos);
    endLabel.add(t.sectionId);
  }

  return (
    <figure className="trend">
      <figcaption className="trend-head">
        <span className="trend-title">Accuracy by section</span>
        <ul className="trend-legend">
          {trends.map((t) => (
            <li key={t.sectionId}>
              <svg width="16" height="10" aria-hidden="true">
                <line x1="1" x2="15" y1="5" y2="5" style={{ stroke: colour(t.sectionId), strokeWidth: 2, strokeLinecap: 'round' }} />
              </svg>
              {t.name}
            </li>
          ))}
        </ul>
      </figcaption>
      <div className="trend-plot">
        <svg
          ref={svg}
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`Accuracy by section across ${n} finished tests. ${trends
            .map((t) => `${t.name}: latest ${pct(t.points[t.points.length - 1].accuracy)}`)
            .join('; ')}. Every result is listed in the history table.`}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        >
          {[0, 0.25, 0.5, 0.75, 1].map((v) => (
            <g key={v}>
              <line x1={M.left} x2={M.left + PW} y1={y(v)} y2={y(v)} className="trend-grid" />
              <text x={M.left - 8} y={y(v) + 4} textAnchor="end" className="trend-tick">
                {pct(v)}
              </text>
            </g>
          ))}
          {attempts.map((a, i) => {
            // Label a day once: repeated labels for tests taken the same day add nothing.
            const sameDay = i > 0 && day(attempts[i - 1].finishedAt) === day(a.finishedAt);
            return (i % labelEvery === 0 || i === n - 1) && !sameDay ? (
              <text key={i} x={x(i)} y={H - 10} textAnchor="middle" className="trend-tick">
                {day(a.finishedAt)}
              </text>
            ) : null;
          })}
          {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={M.top} y2={M.top + PH} className="trend-crosshair" />}
          {trends.map((t) => {
            const c = colour(t.sectionId);
            const last = t.points[t.points.length - 1];
            return (
              <g key={t.sectionId}>
                {t.points.length > 1 && (
                  <polyline
                    points={t.points.map((p) => `${x(p.index)},${y(p.accuracy)}`).join(' ')}
                    style={{ fill: 'none', stroke: c, strokeWidth: 2, strokeLinejoin: 'round', strokeLinecap: 'round' }}
                  />
                )}
                {t.points.map((p) => (
                  <circle
                    key={p.index}
                    cx={x(p.index)}
                    cy={y(p.accuracy)}
                    r={hover === p.index ? 5.5 : 4}
                    style={{ fill: c, stroke: 'var(--surface)', strokeWidth: 2 }}
                  />
                ))}
                {endLabel.has(t.sectionId) && (
                  <text x={x(last.index) + 10} y={y(last.accuracy) + 4} className="trend-end">
                    {shortNames[t.sectionId] ?? t.name}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        {hover !== null && rows.length > 0 && (
          <div
            className="trend-tip"
            style={{ left: `${(x(hover) / W) * 100}%`, transform: `translateX(${hover > n / 2 ? 'calc(-100% - 12px)' : '12px'})` }}
            role="status"
          >
            <span className="trend-tip-when">
              {day(attempts[hover].finishedAt)} · {attempts[hover].title}
            </span>
            {rows.map(({ t, p }) => (
              <span key={t.sectionId} className="trend-tip-row">
                <svg width="12" height="8" aria-hidden="true">
                  <line x1="1" x2="11" y1="4" y2="4" style={{ stroke: colour(t.sectionId), strokeWidth: 2, strokeLinecap: 'round' }} />
                </svg>
                <strong>{pct(p!.accuracy)}</strong>
                <span>
                  {t.name} ({p!.correct}/{p!.total})
                </span>
              </span>
            ))}
          </div>
        )}
      </div>
    </figure>
  );
}
