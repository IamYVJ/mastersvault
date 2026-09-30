// Time spent on each question against its target, as an emphasis column chart:
// questions well over target are highlighted, the rest are context. Every value
// is also in the results table below it, so the tooltip only adds convenience.
import { useRef, useState } from 'react';
import { formatDuration, type QuestionResult } from '../../lib/engine/results.ts';
import { pacing } from '../../lib/engine/scoring.ts';

const W = 720;
const H = 210;
const M = { top: 12, right: 8, bottom: 30, left: 46 };
const PW = W - M.left - M.right;
const PH = H - M.top - M.bottom;

function minuteTicks(maxMs: number): number[] {
  const maxMin = maxMs / 60_000;
  const step = maxMin <= 3 ? 1 : maxMin <= 8 ? 2 : maxMin <= 20 ? 5 : 10;
  const top = Math.max(step, Math.ceil(maxMin / step) * step);
  return Array.from({ length: top / step + 1 }, (_, i) => i * step * 60_000);
}

/** Column with a 4px rounded top and a square base. */
function column(x: number, y: number, w: number, h: number): string {
  if (h <= 0) return '';
  const r = Math.min(4, w / 2, h);
  return `M${x} ${y + h}V${y + r}Q${x} ${y} ${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + h}Z`;
}

interface Props {
  questions: QuestionResult[];
  sectionName: string;
  onSelect?: (index: number) => void;
}

export default function PacingChart({ questions, sectionName, onSelect }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const maxMs = Math.max(60_000, ...questions.map((q) => Math.max(q.timeMs, q.targetMs)));
  const ticks = minuteTicks(maxMs * 1.05);
  const top = ticks[ticks.length - 1];
  const y = (ms: number) => M.top + PH - (Math.min(ms, top) / top) * PH;
  const band = PW / questions.length;
  const barW = Math.min(24, band * 0.62);
  const cx = (i: number) => M.left + band * (i + 0.5);
  const labelEvery = questions.length > 24 ? 5 : questions.length > 12 ? 2 : 1;
  const slow = questions.filter((q) => pacing(q) === 'slow').length;
  const h = hover !== null ? questions[hover] : null;

  return (
    <figure className="pacing">
      <figcaption className="pacing-head">
        <span className="pacing-title">Time per question</span>
        <ul className="pacing-legend">
          <li>
            <span className="pacing-key is-muted" aria-hidden="true" /> Within 1.5× target
          </li>
          <li>
            <span className="pacing-key is-warn" aria-hidden="true" /> Over 1.5× target
          </li>
          <li>
            <span className="pacing-key is-target" aria-hidden="true" /> Target time
          </li>
        </ul>
      </figcaption>
      <div className="pacing-plot" ref={wrap} onPointerLeave={() => setHover(null)}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`${sectionName}: time per question. ${slow} of ${questions.length} questions took more than one and a half times the target time. Times are listed in the table below.`}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} className="pacing-grid" />
              <text x={M.left - 8} y={y(t) + 4} textAnchor="end" className="pacing-tick">
                {t / 60_000} min
              </text>
            </g>
          ))}
          {questions.map((q, i) => {
            const flagged = pacing(q) === 'slow';
            const x = cx(i) - barW / 2;
            return (
              <g
                key={q.id}
                className={`pacing-col ${hover === i ? 'is-hover' : ''} ${onSelect ? 'is-clickable' : ''}`}
                onPointerEnter={() => setHover(i)}
                onClick={() => onSelect?.(i)}
              >
                {/* Hit area: the full slot, not just the painted bar. */}
                <rect x={M.left + band * i} y={M.top} width={band} height={PH} className="pacing-hit" />
                <path d={column(x, y(q.timeMs), barW, M.top + PH - y(q.timeMs))} className={flagged ? 'pacing-bar is-warn' : 'pacing-bar'} />
                <line x1={x - 3} x2={x + barW + 3} y1={y(q.targetMs)} y2={y(q.targetMs)} className="pacing-target" />
                {(i + 1) % labelEvery === 0 || i === 0 ? (
                  <text x={cx(i)} y={H - 10} textAnchor="middle" className="pacing-tick">
                    {q.number}
                  </text>
                ) : null}
              </g>
            );
          })}
          <line x1={M.left} x2={W - M.right} y1={M.top + PH} y2={M.top + PH} className="pacing-axis" />
        </svg>
        {h && hover !== null && (
          <div
            className="pacing-tip"
            style={{ left: `${(cx(hover) / W) * 100}%`, top: `${(y(Math.max(h.timeMs, h.targetMs)) / H) * 100}%` }}
            role="status"
          >
            <strong>{formatDuration(h.timeMs)}</strong>
            <span>
              Question {h.number} · target {formatDuration(h.targetMs)}
            </span>
            <span>{!h.answered ? 'Not answered' : h.correct ? 'Correct' : 'Incorrect'}</span>
          </div>
        )}
      </div>
    </figure>
  );
}
