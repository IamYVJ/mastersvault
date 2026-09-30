// Results after the last section: an unofficial score estimate (mocks), raw
// scores, pacing, accuracy breakdowns and a review of every question.
import { useMemo, useState } from 'react';
import QuestionView from '../questions/QuestionView.tsx';
import { TYPE_LABELS } from '../../lib/content/labels.ts';
import { formatDuration, summarize, type SectionResult } from '../../lib/engine/results.ts';
import { breakdowns, pacing, scoreEstimates, type BreakdownRow, type Estimate } from '../../lib/engine/scoring.ts';
import { reportIssueUrl } from '../../lib/site.ts';
import type { TestPayload } from '../../lib/content/types.ts';
import type { Attempt } from '../../lib/engine/attempt.ts';
import { BookmarkIcon, CheckIcon, ChevronLeft, ChevronRight, ClockIcon, CrossIcon, ExitIcon, ListIcon } from './icons.tsx';
import PacingChart from './PacingChart.tsx';
import Shell from './Shell.tsx';

const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);
const range = (e: Estimate) => (e.low === e.high ? `${e.score}` : `${e.low}–${e.high}`);

function Outcome({ answered, correct }: { answered: boolean; correct: boolean }) {
  if (!answered)
    return (
      <span className="player-outcome is-skipped">
        <span aria-hidden="true">—</span> Not answered
      </span>
    );
  return correct ? (
    <span className="player-outcome is-correct">
      <CheckIcon /> Correct
    </span>
  ) : (
    <span className="player-outcome is-wrong">
      <CrossIcon /> Incorrect
    </span>
  );
}

interface Props {
  payload: TestPayload;
  attempt: Attempt;
  exitUrl: string;
  exitLabel?: string;
  /** The main button in the bottom bar, e.g. "Take it again". */
  primary?: { label: string; onClick?: () => void; href?: string };
}

export default function ResultsScreen({ payload, attempt, exitUrl, exitLabel = 'Exit', primary }: Props) {
  const results = useMemo(() => summarize(attempt, payload), [attempt, payload]);
  const estimates = useMemo(() => scoreEstimates(payload, results), [payload, results]);
  const [open, setOpen] = useState<{ section: number; index: number } | null>(null);
  const total = results.reduce((n, s) => n + s.total, 0);
  const correct = results.reduce((n, s) => n + s.correct, 0);

  if (open) return <ReviewQuestion payload={payload} results={results} open={open} setOpen={setOpen} />;

  return (
    <Shell
      title={payload.test.title}
      subtitle="Results"
      footerLeft={
        <a className="player-bar-btn" href={exitUrl}>
          <ExitIcon />
          <span>{exitLabel}</span>
        </a>
      }
      footerRight={
        primary &&
        (primary.href ? (
          <a className="player-primary" href={primary.href}>
            {primary.label}
          </a>
        ) : (
          <button type="button" className="player-primary" onClick={primary.onClick}>
            {primary.label}
          </button>
        ))
      }
    >
      <div className="player-panel is-wide">
        <p className="player-eyebrow">Results</p>
        <h1>{payload.test.title}</h1>

        {estimates ? (
          <div className="player-hero">
            <p className="player-hero-label">Estimated total score</p>
            <p className="player-hero-value">{estimates.total.score}</p>
            <p className="player-hero-note">
              Likely range {range(estimates.total)} · unofficial estimate · {correct} of {total} correct ({pct(correct, total)}%)
            </p>
          </div>
        ) : (
          <p className="player-lead">
            {correct} of {total} correct ({pct(correct, total)}%). Select any question to see the explanation.
          </p>
        )}

        <div className="player-score-cards">
          {results.map((s, i) => (
            <SectionCard key={s.id} s={s} estimate={estimates?.sections[i]} />
          ))}
        </div>

        {estimates && (
          <details className="player-estimate-note">
            <summary>How are these scores estimated?</summary>
            <p>
              The estimate uses how many questions you answered correctly and how hard they were, based on MastersVault's own
              difficulty ratings. Unanswered questions count as incorrect. The real exam adapts to you as you go and uses its
              own scoring, so treat this as a rough guide. It isn't a prediction of your official score.
            </p>
          </details>
        )}

        {results.map((s, si) => (
          <SectionDetail key={s.id} s={s} topics={payload.topics} onOpen={(index) => setOpen({ section: si, index })} />
        ))}
      </div>
    </Shell>
  );
}

function SectionCard({ s, estimate }: { s: SectionResult; estimate?: Estimate }) {
  return (
    <div className="player-score-card">
      <h3>{s.name}</h3>
      {estimate ? (
        <p className="player-score">
          <strong>{estimate.score}</strong>
          <span> estimated · range {range(estimate)}</span>
        </p>
      ) : (
        <p className="player-score">
          <strong>{s.correct}</strong>
          <span> / {s.total} correct</span>
        </p>
      )}
      <div className="player-meter" role="img" aria-label={`${pct(s.correct, s.total)}% correct`}>
        <span style={{ width: `${pct(s.correct, s.total)}%` }} />
      </div>
      <dl>
        <div>
          <dt>Correct</dt>
          <dd>
            {s.correct} of {s.total} ({pct(s.correct, s.total)}%)
          </dd>
        </div>
        <div>
          <dt>Answered</dt>
          <dd>
            {s.answered} of {s.total}
          </dd>
        </div>
        <div>
          <dt>Time used</dt>
          <dd>
            {formatDuration(s.timeMs)}
            {s.limitMs !== null && ` of ${formatDuration(s.limitMs)}`}
          </dd>
        </div>
      </dl>
      {s.endedBy === 'time' && <p className="player-warn">Time ran out in this section.</p>}
    </div>
  );
}

function BreakdownTable({ title, rows }: { title: string; rows: BreakdownRow[] }) {
  return (
    <div className="player-breakdown">
      <h4>{title}</h4>
      <table className="player-table">
        <thead>
          <tr>
            <th scope="col">{title.replace(/^By /, '').replace(/^\w/, (c) => c.toUpperCase())}</th>
            <th scope="col" className="num">
              Correct
            </th>
            <th scope="col">
              <span className="visually-hidden">Accuracy</span>
            </th>
            <th scope="col" className="num">
              Avg time
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const p = pct(r.correct, r.total);
            const avg = r.timeMs / r.total;
            const target = r.targetMs / r.total;
            return (
              <tr key={r.key}>
                <td>{r.label}</td>
                <td className="num">
                  {r.correct}/{r.total}
                </td>
                <td className="player-breakdown-meter">
                  <div className="player-meter is-small" role="img" aria-label={`${p}% correct`}>
                    <span style={{ width: `${p}%` }} />
                  </div>
                </td>
                <td className={`num ${avg > target * 1.5 ? 'is-slow' : ''}`} title={`Target ${formatDuration(target)}`}>
                  {formatDuration(avg)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SectionDetail({ s, topics, onOpen }: { s: SectionResult; topics: Record<string, string>; onOpen: (index: number) => void }) {
  const b = useMemo(() => breakdowns(s.questions, topics, TYPE_LABELS), [s, topics]);
  const types = new Set(s.questions.map((q) => q.type));
  return (
    <section className="player-result-section">
      <h2>{s.name}</h2>
      <PacingChart questions={s.questions} sectionName={s.name} onSelect={onOpen} />

      <div className="player-breakdowns">
        {types.size > 1 && <BreakdownTable title="By question type" rows={b.byType} />}
        <BreakdownTable title="By difficulty" rows={b.byDifficulty} />
        <BreakdownTable title="By topic" rows={b.byTopic} />
      </div>

      <h3 className="player-result-sub">Questions</h3>
      <div className="player-table-scroll">
        <table className="player-table player-results-table">
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Type</th>
              <th scope="col">Result</th>
              <th scope="col" className="num">
                Time
              </th>
              <th scope="col" className="num">
                Target
              </th>
              <th scope="col">
                <span className="visually-hidden">Flags</span>
              </th>
              <th scope="col">
                <span className="visually-hidden">Review</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {s.questions.map((r, i) => {
              const flag = pacing(r);
              return (
                <tr key={r.id}>
                  <td>{r.number}</td>
                  <td>{TYPE_LABELS[r.type]}</td>
                  <td>
                    <Outcome answered={r.answered} correct={r.correct} />
                  </td>
                  <td className={`num ${flag === 'slow' ? 'is-slow' : ''}`}>{formatDuration(r.timeMs)}</td>
                  <td className="num muted">{formatDuration(r.targetMs)}</td>
                  <td className="player-flags">
                    {flag === 'slow' && (
                      <span className="player-flag is-slow">
                        <ClockIcon /> Slow
                      </span>
                    )}
                    {flag === 'rushed' && <span className="player-flag">Rushed</span>}
                    {r.bookmarked && (
                      <span className="player-flag">
                        <BookmarkIcon filled /> <span className="visually-hidden">Bookmarked</span>
                      </span>
                    )}
                  </td>
                  <td className="num">
                    <button type="button" className="player-link-btn" onClick={() => onOpen(i)}>
                      Review
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ReviewQuestion({
  payload,
  results,
  open,
  setOpen,
}: {
  payload: TestPayload;
  results: SectionResult[];
  open: { section: number; index: number };
  setOpen: (o: { section: number; index: number } | null) => void;
}) {
  const section = results[open.section];
  const r = section.questions[open.index];
  const q = payload.questions[r.id];
  const stimulus = q.stimulus;
  const go = (d: number) => {
    const index = open.index + d;
    if (index >= 0 && index < section.questions.length) setOpen({ ...open, index });
  };
  return (
    <Shell
      title={payload.test.title}
      subtitle={`${section.name} · Review`}
      counter={`Question ${r.number} of ${section.total}`}
      wide={stimulus?.kind === 'passage' || stimulus?.kind === 'sources'}
      footerLeft={
        <button type="button" className="player-bar-btn" onClick={() => setOpen(null)}>
          <ListIcon />
          <span>All results</span>
        </button>
      }
      footerRight={
        <>
          <button type="button" className="player-secondary" disabled={open.index === 0} onClick={() => go(-1)}>
            <ChevronLeft /> Previous
          </button>
          <button type="button" className="player-primary" disabled={open.index === section.total - 1} onClick={() => go(1)}>
            Next <ChevronRight />
          </button>
        </>
      }
    >
      <div className="player-result-meta">
        <Outcome answered={r.answered} correct={r.correct} />
        <span>{TYPE_LABELS[r.type]}</span>
        <span>Difficulty {r.difficulty} of 5</span>
        <span>
          Time {formatDuration(r.timeMs)} (target {formatDuration(r.targetMs)})
        </span>
        {r.bookmarked && (
          <span>
            <BookmarkIcon filled /> Bookmarked
          </span>
        )}
      </div>
      <div key={r.id} className="player-question">
        <QuestionView
          question={q}
          passage={stimulus?.kind === 'passage' ? payload.passages[stimulus.id] : undefined}
          sources={stimulus?.kind === 'sources' ? payload.sources[stimulus.id] : undefined}
          response={r.response}
          reveal
          explanationFooter={
            <p className="player-report">
              <a href={reportIssueUrl(r.id, payload.test.title)} target="_blank" rel="noopener">
                Report an issue with this question
              </a>
            </p>
          }
        />
      </div>
    </Shell>
  );
}
