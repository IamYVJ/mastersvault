// Root of the full-screen test player. Loads the compiled test, restores or
// starts an attempt, keeps the clock ticking and saves after every change.
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import type { Tool } from '../../lib/content/schema.ts';
import type { TestPayload } from '../../lib/content/types.ts';
import {
  type Action,
  type ActionInput,
  type Attempt,
  createAttempt,
  currentSection,
  isTimerRunning,
  reduce,
  rulesFor,
} from '../../lib/engine/attempt.ts';
import { fetchPayload } from '../../lib/engine/codec.ts';
import { clearAttempt, loadAttempt, recordAttempt, saveAttempt } from '../../lib/engine/storage.ts';
import Calculator from './Calculator.tsx';
import type { PlayerProps, ToolBar } from './context.ts';
import FloatingPanel from './FloatingPanel.tsx';
import Modal from './Modal.tsx';
import QuestionScreen from './QuestionScreen.tsx';
import ResultsScreen from './ResultsScreen.tsx';
import ReviewScreen from './ReviewScreen.tsx';
import { BreakOfferScreen, BreakScreen, OrderScreen, SectionIntroScreen, SetupScreen } from './Screens.tsx';
import Whiteboard from './Whiteboard.tsx';

interface Props {
  payloadUrl: string;
  testKey: string;
  /** The test's landing page. */
  exitUrl: string;
}

export default function TestPlayer({ payloadUrl, testKey, exitUrl }: Props) {
  const [payload, setPayload] = useState<TestPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPayload(payloadUrl)
      .then(setPayload)
      .catch((e: Error) => setError(e.message));
  }, [payloadUrl]);

  if (error)
    return (
      <div className="player-message">
        <h1>The test couldn't be loaded</h1>
        <p>Check your connection and try again. ({error})</p>
        <p>
          <a className="btn" href={exitUrl}>
            Back
          </a>
        </p>
      </div>
    );
  if (!payload)
    return (
      <div className="player-message" aria-busy="true">
        <p>Loading test…</p>
      </div>
    );
  return <Player payload={payload} testKey={testKey} exitUrl={exitUrl} />;
}

function initialize(payload: TestPayload, testKey: string): { attempt: Attempt; notice: 'updated' | null } {
  const now = Date.now();
  const params = new URLSearchParams(location.search);
  if (params.has('new')) {
    clearAttempt(testKey);
    history.replaceState(null, '', location.pathname);
  }
  const saved = loadAttempt(testKey);
  if (saved && saved.hash === payload.hash && saved.phase !== 'setup')
    return { attempt: reduce(saved, { type: 'resume', now }, payload), notice: null };
  const updated = !!saved && saved.hash !== payload.hash && saved.phase !== 'setup' && saved.phase !== 'results';
  return { attempt: createAttempt(payload, testKey, now), notice: updated ? 'updated' : null };
}

function Player({ payload, testKey, exitUrl }: { payload: TestPayload; testKey: string; exitUrl: string }) {
  const [init] = useState(() => initialize(payload, testKey));
  const [notice, setNotice] = useState(init.notice);
  const [attempt, dispatch] = useReducer((s: Attempt, a: Action) => reduce(s, a, payload), init.attempt);
  const [exiting, setExiting] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const latest = useRef(attempt);
  latest.current = attempt;

  const act = useCallback((a: ActionInput) => dispatch({ ...a, now: Date.now() } as Action), []);
  const rules = rulesFor(payload, attempt.settings);

  // Save after every change.
  useEffect(() => {
    if (!saveAttempt(attempt)) setSaveFailed(true);
  }, [attempt]);

  // Add finished attempts to the history once.
  useEffect(() => {
    if (attempt.phase === 'results' && !attempt.recorded) {
      recordAttempt(attempt, payload);
      act({ type: 'mark-recorded' });
    }
  }, [attempt, payload, act]);

  // Tick once a second while a clock is running.
  const running = isTimerRunning(attempt);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => act({ type: 'tick' }), 1000);
    return () => clearInterval(id);
  }, [running, act]);

  // Save on hide/close, and treat time away (closed or in the back/forward cache) as paused.
  useEffect(() => {
    const flush = () => saveAttempt(reduce(latest.current, { type: 'tick', now: Date.now() }, payload));
    const onVisibility = () => (document.visibilityState === 'hidden' ? flush() : act({ type: 'tick' }));
    const onShow = (e: PageTransitionEvent) => e.persisted && act({ type: 'resume' });
    window.addEventListener('pagehide', flush);
    window.addEventListener('pageshow', onShow);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('pageshow', onShow);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [payload, act]);

  // Keep the page title useful when the tab is in the background.
  useEffect(() => {
    document.title = `${attempt.phase === 'results' ? 'Results' : attempt.title} · MastersVault`;
  }, [attempt.phase, attempt.title]);

  const requestExit = useCallback(() => setExiting(true), []);
  const exitNow = () => {
    saveAttempt(reduce(latest.current, { type: 'tick', now: Date.now() }, payload));
    location.assign(exitUrl);
  };
  const retake = () => {
    clearAttempt(testKey);
    location.assign(`${location.pathname}?new`);
  };

  // Tools belong to the section on screen; they close (and reset) when the section changes.
  const sec = currentSection(attempt);
  const inSection = (attempt.phase === 'question' || attempt.phase === 'review') && sec?.status === 'active';
  const available: Tool[] = inSection && sec ? (payload.sections.find((s) => s.id === sec.id)?.tools ?? []) : [];
  const [openTools, setOpenTools] = useState<Tool[]>([]);
  useEffect(() => setOpenTools([]), [sec?.id, inSection]);
  const toggleTool = useCallback((t: Tool) => setOpenTools((o) => (o.includes(t) ? o.filter((x) => x !== t) : [...o, t])), []);
  const tools: ToolBar = { available, open: openTools, toggle: toggleTool };

  const props: PlayerProps = { payload, attempt, rules, act, requestExit, tools };

  let screen;
  switch (attempt.phase) {
    case 'setup':
      screen = <SetupScreen {...props} exitLabel="Back" />;
      break;
    case 'order':
      screen = <OrderScreen {...props} />;
      break;
    case 'section-intro':
      screen = <SectionIntroScreen {...props} />;
      break;
    case 'question':
      screen = <QuestionScreen {...props} />;
      break;
    case 'review':
      screen = attempt.reviewOpen !== null ? <QuestionScreen {...props} /> : <ReviewScreen {...props} />;
      break;
    case 'break-offer':
      screen = <BreakOfferScreen {...props} />;
      break;
    case 'break':
      screen = <BreakScreen {...props} />;
      break;
    case 'results':
      screen = <ResultsScreen payload={payload} attempt={attempt} exitUrl={exitUrl} primary={{ label: 'Take it again', onClick: retake }} />;
      break;
  }

  const dismiss = () => act({ type: 'dismiss-alert' });
  const timedOut = attempt.alert?.kind === 'time-up' ? attempt.alert.section : null;

  return (
    <>
      {screen}

      {available.includes('calculator') && (
        <FloatingPanel
          key={'calculator-' + sec!.id}
          id="calculator"
          title="Calculator"
          width={300}
          hidden={!openTools.includes('calculator')}
          onClose={() => toggleTool('calculator')}
        >
          <Calculator />
        </FloatingPanel>
      )}
      {available.includes('whiteboard') && (
        <FloatingPanel
          key={'whiteboard-' + sec!.id}
          id="whiteboard"
          title="Whiteboard"
          width={620}
          side="left"
          hidden={!openTools.includes('whiteboard')}
          onClose={() => toggleTool('whiteboard')}
        >
          <Whiteboard />
        </FloatingPanel>
      )}

      {attempt.alert?.kind === 'time-up' && (
        <Modal title="Time's up" actions={<button type="button" className="player-primary" onClick={dismiss}>Continue</button>}>
          <p>
            Time has run out for <strong>{payload.sections.find((s) => s.id === timedOut)?.name ?? 'this section'}</strong>. Your answers so far have been
            saved, and any unanswered questions count as incorrect.
          </p>
        </Modal>
      )}
      {attempt.alert?.kind === 'five-minutes' && (
        <Modal title="5 minutes left" onClose={dismiss} actions={<button type="button" className="player-primary" onClick={dismiss}>OK</button>}>
          <p>You have 5 minutes left in this section.</p>
        </Modal>
      )}
      {attempt.alert?.kind === 'resumed' && (
        <Modal title="Welcome back" onClose={dismiss} actions={<button type="button" className="player-primary" onClick={dismiss}>Continue</button>}>
          <p>Your test was paused while you were away. The timer starts again when you continue.</p>
        </Modal>
      )}
      {notice === 'updated' && (
        <Modal
          title="This test has changed"
          onClose={() => setNotice(null)}
          actions={<button type="button" className="player-primary" onClick={() => setNotice(null)}>Start fresh</button>}
        >
          <p>The questions in this test were updated since you started it, so your unfinished attempt couldn't be restored.</p>
        </Modal>
      )}
      {exiting && (
        <Modal
          title="Save and exit?"
          onClose={() => setExiting(false)}
          actions={
            <>
              <button type="button" className="player-secondary" onClick={() => setExiting(false)}>
                Keep going
              </button>
              <button type="button" className="player-primary" onClick={exitNow}>
                Save and exit
              </button>
            </>
          }
        >
          <p>
            {attempt.phase === 'setup'
              ? 'You haven’t started yet.'
              : 'Your progress is saved in this browser. The timer pauses until you come back to this test on this device.'}
          </p>
        </Modal>
      )}
      {saveFailed && (
        <div className="player-toast" role="status">
          This browser isn't letting the site save your progress (private mode or blocked storage). You can keep going, but
          closing the page will lose it.
          <button type="button" className="player-link-btn" onClick={() => setSaveFailed(false)}>
            Dismiss
          </button>
        </div>
      )}
    </>
  );
}
