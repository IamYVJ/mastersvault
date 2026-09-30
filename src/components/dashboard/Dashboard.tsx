// The progress dashboard. Everything comes from this browser's storage; the
// page only passes in a catalog of test and topic names and links.
import './dashboard.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { makeBackup, mergeBackup, parseBackup } from '../../lib/engine/backup.ts';
import { inProgress, sectionTrends, topicStats, totals, type InProgress } from '../../lib/engine/progress.ts';
import { formatDuration } from '../../lib/engine/results.ts';
import { clearAllData, listAttempts, loadHistory, saveAttempt, saveHistory, type HistoryEntry } from '../../lib/engine/storage.ts';
import type { Attempt } from '../../lib/engine/attempt.ts';
import TrendChart from './TrendChart.tsx';

export interface Catalog {
  tests: Record<string, { title: string; href?: string }>;
  topics: Record<string, { name: string; section: string; noteHref?: string }>;
  sections: { id: string; name: string; shortName: string }[];
  links: { practice: string; mocks: string; revision: string; attempt: string };
}

const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);
const when = (t: number) => new Date(t).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
const hoursMinutes = (ms: number) => {
  const m = Math.round(ms / 60_000);
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`;
};

export default function Dashboard({ catalog }: { catalog: Catalog }) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(() => {
    setHistory(loadHistory());
    setAttempts(listAttempts());
    setLoaded(true);
  }, []);
  useEffect(refresh, [refresh]);

  const sum = useMemo(() => totals(history), [history]);
  const unfinished = useMemo(() => inProgress(attempts), [attempts]);
  const order = catalog.sections.map((s) => s.id);
  const { trends, attempts: ordered } = useMemo(() => sectionTrends(history, order), [history, order.join()]);
  const focus = useMemo(() => topicStats(history).filter((t) => t.accuracy < 1).slice(0, 6), [history]);

  if (!loaded) return <p className="muted">Loading your progress…</p>;

  const empty = !history.length && !unfinished.length;
  const showTrend = trends.some((t) => t.points.length > 1);

  return (
    <div className="dash">
      {empty && (
        <div className="notice">
          <p>
            <strong>No tests taken yet.</strong> Your results will appear here as you practise. They're stored only in this
            browser.
          </p>
          <p style={{ margin: 0 }}>
            Start with a <a href={catalog.links.practice}>practice set</a> or read the <a href={catalog.links.revision}>revision notes</a>.
          </p>
        </div>
      )}

      {unfinished.length > 0 && <Unfinished items={unfinished} catalog={catalog} />}

      {history.length > 0 && (
        <>
          <section className="dash-section" aria-labelledby="dash-summary">
            <h2 id="dash-summary" className="visually-hidden">
              Summary
            </h2>
            <div className="dash-tiles">
              <Tile label="Tests completed" value={String(sum.tests)} note={`${sum.mocks} mock${sum.mocks === 1 ? '' : 's'}`} />
              <Tile label="Questions answered" value={sum.answered.toLocaleString()} note={`of ${sum.questions.toLocaleString()} seen`} />
              <Tile label="Accuracy" value={`${pct(sum.correct, sum.questions)}%`} note={`${sum.correct.toLocaleString()} correct`} />
              <Tile label="Time practising" value={hoursMinutes(sum.timeMs)} note="across all sections" />
              {sum.latestMock?.estimate && (
                <Tile
                  label="Latest mock estimate"
                  value={String(sum.latestMock.estimate.total.score)}
                  note={`range ${sum.latestMock.estimate.total.low}–${sum.latestMock.estimate.total.high} · unofficial`}
                />
              )}
            </div>
          </section>

          {showTrend && (
            <section className="dash-section">
              <TrendChart
                trends={trends}
                sectionOrder={order}
                shortNames={Object.fromEntries(catalog.sections.map((s) => [s.id, s.shortName]))}
                attempts={ordered}
              />
            </section>
          )}

          <section className="dash-section">
            <h2>Where to focus</h2>
            {focus.length ? (
              <FocusTable rows={focus} catalog={catalog} />
            ) : (
              <p className="muted">Answer at least two questions on a topic to see how you're doing on it.</p>
            )}
          </section>

          <section className="dash-section">
            <h2>History</h2>
            <HistoryTable history={history} catalog={catalog} />
          </section>
        </>
      )}

      <DataTools history={history} attempts={attempts} onChange={refresh} />
    </div>
  );
}

function Tile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="dash-tile">
      <p className="dash-tile-label">{label}</p>
      <p className="dash-tile-value">{value}</p>
      {note && <p className="dash-tile-note">{note}</p>}
    </div>
  );
}

function Unfinished({ items, catalog }: { items: InProgress[]; catalog: Catalog }) {
  return (
    <section className="dash-section">
      <h2>Unfinished</h2>
      <div className="grid">
        {items.map((i) => {
          const href = catalog.tests[i.testKey]?.href;
          return (
            <div className="card dash-resume" key={i.testKey}>
              <span className="badge">{i.kind === 'mock' ? 'Mock' : 'Practice'}</span>
              <h3>{i.title}</h3>
              <p className="muted small">
                {i.where ? `${i.where} · ` : ''}started {when(i.startedAt)}
              </p>
              {href && (
                <a className="btn btn-primary" href={`${href}take/`}>
                  Resume
                </a>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function FocusTable({ rows, catalog }: { rows: ReturnType<typeof topicStats>; catalog: Catalog }) {
  const sectionName = (id: string) => catalog.sections.find((s) => s.id === id)?.name ?? id;
  return (
    <div className="table-wrap">
      <table className="data dash-focus">
        <thead>
          <tr>
            <th scope="col">Topic</th>
            <th scope="col" className="num">
              Correct
            </th>
            <th scope="col">
              <span className="visually-hidden">Accuracy</span>
            </th>
            <th scope="col" className="num">
              Avg time
            </th>
            <th scope="col">
              <span className="visually-hidden">Revise</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const info = catalog.topics[`${r.section}/${r.topic}`];
            return (
              <tr key={`${r.section}/${r.topic}`}>
                <td>
                  {info?.name ?? r.topic}
                  <div className="muted small">{sectionName(r.section)}</div>
                </td>
                <td className="num">
                  {r.correct}/{r.total} ({pct(r.correct, r.total)}%)
                </td>
                <td className="dash-meter-cell">
                  <div className="dash-meter" role="img" aria-label={`${pct(r.correct, r.total)}% correct`}>
                    <span style={{ width: `${pct(r.correct, r.total)}%` }} />
                  </div>
                </td>
                <td className={`num ${r.avgTimeMs > r.avgTargetMs * 1.5 ? 'is-slow' : ''}`}>{formatDuration(r.avgTimeMs)}</td>
                <td className="num">{info?.noteHref && <a href={info.noteHref}>Revise</a>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function HistoryTable({ history, catalog }: { history: HistoryEntry[]; catalog: Catalog }) {
  return (
    <div className="table-wrap">
      <table className="data">
        <thead>
          <tr>
            <th scope="col">Finished</th>
            <th scope="col">Test</th>
            <th scope="col">Result</th>
            <th scope="col" className="num">
              Time
            </th>
            <th scope="col">
              <span className="visually-hidden">Review</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {history.map((h) => {
            const correct = h.sections.reduce((n, s) => n + s.correct, 0);
            const total = h.sections.reduce((n, s) => n + s.total, 0);
            const time = h.sections.reduce((n, s) => n + s.timeMs, 0);
            const href = catalog.tests[h.testKey]?.href;
            return (
              <tr key={h.id}>
                <td>{when(h.finishedAt)}</td>
                <td>
                  {href ? <a href={href}>{h.title}</a> : h.title}
                  <div className="muted small">
                    {h.kind === 'mock' ? 'Mock' : 'Practice'}
                    {h.kind === 'practice' && !h.settings.timed ? ' · untimed' : ''}
                  </div>
                </td>
                <td>
                  {h.estimate && <strong>Est. {h.estimate.total.score} · </strong>}
                  {correct}/{total} ({pct(correct, total)}%)
                </td>
                <td className="num">{formatDuration(time)}</td>
                <td className="num">
                  <a href={`${catalog.links.attempt}?id=${encodeURIComponent(h.id)}`}>Review</a>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DataTools({ history, attempts, onChange }: { history: HistoryEntry[]; attempts: Attempt[]; onChange: () => void }) {
  const file = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const exportData = () => {
    const backup = makeBackup(history, attempts, Date.now());
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `mastersvault-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setMessage({ kind: 'ok', text: `Exported ${history.length} finished and ${attempts.length} saved attempts.` });
  };

  const importData = async (f: File) => {
    try {
      if (f.size > 20_000_000) throw new Error('That file is too large to be a MastersVault backup.');
      const { backup, skipped } = parseBackup(await f.text());
      const merged = mergeBackup({ history, attempts }, backup);
      if (!saveHistory(merged.history)) throw new Error("This browser isn't letting the site save data.");
      merged.attempts.forEach(saveAttempt);
      const parts = [`Added ${merged.addedHistory} finished ${merged.addedHistory === 1 ? 'test' : 'tests'}`];
      if (merged.restoredAttempts) parts.push(`restored ${merged.restoredAttempts} saved ${merged.restoredAttempts === 1 ? 'attempt' : 'attempts'}`);
      if (merged.keptLocalAttempts) parts.push(`kept ${merged.keptLocalAttempts} unfinished ${merged.keptLocalAttempts === 1 ? 'attempt' : 'attempts'} already in this browser`);
      if (skipped) parts.push(`skipped ${skipped} damaged ${skipped === 1 ? 'entry' : 'entries'}`);
      setMessage({ kind: 'ok', text: `${parts.join(', ')}.` });
      onChange();
    } catch (e) {
      setMessage({ kind: 'error', text: e instanceof Error ? e.message : 'The file could not be imported.' });
    }
  };

  return (
    <section className="dash-section dash-data">
      <h2>Your data</h2>
      <p className="muted">
        Progress is saved only in this browser. Export it to keep a backup or to move it to another device, then import
        it there.
      </p>
      <div className="dash-actions">
        <button type="button" className="btn" onClick={exportData} disabled={!history.length && !attempts.length}>
          Export progress
        </button>
        <button type="button" className="btn" onClick={() => file.current?.click()}>
          Import a backup
        </button>
        <input
          ref={file}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) void importData(f);
          }}
        />
        {!confirmClear ? (
          <button type="button" className="btn dash-danger" onClick={() => setConfirmClear(true)} disabled={!history.length && !attempts.length}>
            Delete all progress
          </button>
        ) : (
          <span className="dash-confirm" role="alert">
            Delete every result and saved attempt from this browser? This can't be undone.
            <button
              type="button"
              className="btn dash-danger"
              onClick={() => {
                clearAllData();
                setConfirmClear(false);
                setMessage({ kind: 'ok', text: 'All progress was deleted from this browser.' });
                onChange();
              }}
            >
              Delete
            </button>
            <button type="button" className="btn" onClick={() => setConfirmClear(false)}>
              Cancel
            </button>
          </span>
        )}
      </div>
      {message && (
        <p className={`dash-message ${message.kind === 'error' ? 'is-error' : ''}`} role="status">
          {message.text}
        </p>
      )}
    </section>
  );
}
