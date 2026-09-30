// Reopens a finished attempt from the history with the full results screen.
import { useEffect, useState } from 'react';
import type { TestPayload } from '../../lib/content/types.ts';
import { loadHistory, type HistoryEntry } from '../../lib/engine/storage.ts';
import ResultsScreen from '../player/ResultsScreen.tsx';

interface Props {
  dashboardUrl: string;
  /** testKey → where to fetch the compiled test and the test's landing page. */
  tests: Record<string, { dataUrl: string; href?: string }>;
}

type State =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'error'; entry: HistoryEntry; message: string }
  | { status: 'ready'; entry: HistoryEntry; payload: TestPayload };

export default function AttemptViewer({ dashboardUrl, tests }: Props) {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    const id = new URLSearchParams(location.search).get('id');
    const entry = loadHistory().find((h) => h.id === id);
    if (!entry) return setState({ status: 'missing' });
    const test = tests[entry.testKey];
    if (!test) return setState({ status: 'error', entry, message: 'This test is no longer on the site.' });
    fetch(test.dataUrl)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<TestPayload>;
      })
      .then((payload) => {
        const questionIds = Object.values(entry.attempt.sections).flatMap((s) => s.questionIds);
        if (questionIds.some((q) => !payload.questions[q]))
          return setState({ status: 'error', entry, message: 'This test has changed since you took it, so the full review is no longer available.' });
        setState({ status: 'ready', entry, payload });
      })
      .catch(() => setState({ status: 'error', entry, message: "The test couldn't be loaded. Check your connection and try again." }));
  }, [tests]);

  if (state.status === 'loading') return <p className="player-message">Loading results…</p>;
  if (state.status === 'missing')
    return (
      <div className="player-message">
        <h1>Result not found</h1>
        <p>This result isn't saved in this browser.</p>
        <p>
          <a className="btn" href={dashboardUrl}>
            Back to the dashboard
          </a>
        </p>
      </div>
    );
  if (state.status === 'error') {
    const { entry } = state;
    return (
      <div className="player-message">
        <h1>{entry.title}</h1>
        <p>{state.message}</p>
        <ul className="viewer-summary">
          {entry.sections.map((s) => (
            <li key={s.id}>
              {s.name}: {s.correct} of {s.total} correct
            </li>
          ))}
        </ul>
        <p>
          <a className="btn" href={dashboardUrl}>
            Back to the dashboard
          </a>
        </p>
      </div>
    );
  }

  const href = tests[state.entry.testKey]?.href;
  return (
    <ResultsScreen
      payload={state.payload}
      attempt={state.entry.attempt}
      exitUrl={dashboardUrl}
      exitLabel="Dashboard"
      primary={href ? { label: 'Go to this test', href } : undefined}
    />
  );
}
