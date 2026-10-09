// The screens between questions: setup, section order, section instructions and breaks.
import { useState } from 'react';
import { DS_CHOICES } from '../../lib/content/labels.ts';
import { breakRemaining, currentSection, type Settings } from '../../lib/engine/attempt.ts';
import { formatDuration } from '../../lib/engine/results.ts';
import type { PlayerProps } from './context.ts';
import { ExitIcon } from './icons.tsx';
import Shell from './Shell.tsx';

const minutes = (ms: number) => Math.round(ms / 60_000);
const toolNames: Record<string, string> = { calculator: 'on-screen calculator', whiteboard: 'whiteboard' };

function ExitButton({ requestExit, label = 'Save and exit' }: { requestExit: () => void; label?: string }) {
  return (
    <button type="button" className="player-bar-btn" onClick={requestExit}>
      <ExitIcon />
      <span>{label}</span>
    </button>
  );
}

function RulesList({ rules, payload }: Pick<PlayerProps, 'rules' | 'payload'>) {
  const multi = payload.sections.length > 1;
  return (
    <ul className="player-rules">
      {rules.timed ? (
        <li>{multi ? 'Each section has its own timer.' : 'The set is timed.'} When time runs out, the section ends and unanswered questions count as incorrect.</li>
      ) : (
        <li>The set is untimed, but the time you spend on each question is recorded.</li>
      )}
      {rules.requireAnswer && <li>You must answer each question before moving to the next.</li>}
      {!rules.allowBack && <li>You can't go back to earlier questions, but you can bookmark questions to revisit.</li>}
      {rules.allowBack && <li>You can move back and forth between questions and skip any question.</li>}
      {rules.review && rules.maxChanges !== null && (
        <li>
          If time remains after the last question, you can review your answers and change up to {rules.maxChanges} of them.
        </li>
      )}
      {rules.review && rules.maxChanges === null && <li>Before you submit, you can review every question and change any answer.</li>}
      {rules.optionalBreak && (
        <li>
          You can take one optional {rules.optionalBreak.minutes}-minute break after section{' '}
          {rules.optionalBreak.allowedAfterSection.join(' or ')}.
        </li>
      )}
      {rules.explanations === 'each' && <li>After you check each answer, the explanation is shown and the answer is locked.</li>}
      <li>Progress is saved in this browser. If you close the page, the timer pauses until you come back.</li>
    </ul>
  );
}

// ------------------------------------------------------------------- setup

export function SetupScreen({ payload, rules, act, requestExit, exitLabel }: PlayerProps & { exitLabel: string }) {
  const isMock = payload.test.kind === 'mock';
  const [settings, setSettings] = useState<Settings>({ timed: true, explanations: 'end' });
  const shown = isMock ? rules : { ...rules, timed: settings.timed, explanations: settings.explanations };
  const totalMin = payload.sections.reduce((n, s) => n + s.timeMinutes, 0);
  const totalQ = payload.sections.reduce((n, s) => n + s.questionIds.length, 0);

  return (
    <Shell
      title={payload.test.title}
      screen="Set up"
      footerLeft={<ExitButton requestExit={requestExit} label={exitLabel} />}
      footerRight={
        <button type="button" className="player-primary" onClick={() => act({ type: 'start', settings })}>
          {isMock ? 'Start test' : 'Start'}
        </button>
      }
    >
      <div className="player-panel">
        <p className="player-eyebrow">{isMock ? 'Mock test' : 'Practice set'}</p>
        <h1>{payload.test.title}</h1>
        {payload.test.description && <p className="player-lead">{payload.test.description}</p>}

        <table className="player-table">
          <thead>
            <tr>
              <th scope="col">Section</th>
              <th scope="col" className="num">
                Questions
              </th>
              <th scope="col" className="num">
                Time
              </th>
            </tr>
          </thead>
          <tbody>
            {payload.sections.map((s) => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td className="num">{s.questionIds.length}</td>
                <td className="num">{shown.timed ? `${s.timeMinutes} min` : 'Untimed'}</td>
              </tr>
            ))}
          </tbody>
          {payload.sections.length > 1 && (
            <tfoot>
              <tr>
                <th scope="row">Total</th>
                <td className="num">{totalQ}</td>
                <td className="num">{totalMin} min</td>
              </tr>
            </tfoot>
          )}
        </table>

        {!isMock && (
          <div className="player-options">
            <fieldset>
              <legend>Timing</legend>
              <label className={`player-option ${settings.timed ? 'is-on' : ''}`}>
                <input type="radio" name="timed" checked={settings.timed} onChange={() => setSettings({ ...settings, timed: true })} />
                <span>
                  <strong>Timed</strong>
                  <span>{totalMin} minutes, at exam pace</span>
                </span>
              </label>
              <label className={`player-option ${!settings.timed ? 'is-on' : ''}`}>
                <input type="radio" name="timed" checked={!settings.timed} onChange={() => setSettings({ ...settings, timed: false })} />
                <span>
                  <strong>Untimed</strong>
                  <span>Take as long as you need</span>
                </span>
              </label>
            </fieldset>
            <fieldset>
              <legend>Explanations</legend>
              <label className={`player-option ${settings.explanations === 'end' ? 'is-on' : ''}`}>
                <input
                  type="radio"
                  name="explanations"
                  checked={settings.explanations === 'end'}
                  onChange={() => setSettings({ ...settings, explanations: 'end' })}
                />
                <span>
                  <strong>At the end</strong>
                  <span>Like the real test</span>
                </span>
              </label>
              <label className={`player-option ${settings.explanations === 'each' ? 'is-on' : ''}`}>
                <input
                  type="radio"
                  name="explanations"
                  checked={settings.explanations === 'each'}
                  onChange={() => setSettings({ ...settings, explanations: 'each' })}
                />
                <span>
                  <strong>After each question</strong>
                  <span>Check your answer as you go</span>
                </span>
              </label>
            </fieldset>
          </div>
        )}

        <h2>How it works</h2>
        <RulesList rules={shown} payload={payload} />
        {isMock && <p className="player-small-screen">This test is designed for a laptop or desktop screen.</p>}
      </div>
    </Shell>
  );
}

// ------------------------------------------------------------ section order

function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items];
  return items.flatMap((item, i) => permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [item, ...rest]));
}

export function OrderScreen({ payload, attempt, act, requestExit }: PlayerProps) {
  const orders = permutations(attempt.order);
  const [choice, setChoice] = useState(0);
  const name = (id: string) => payload.sections.find((s) => s.id === id)!.name;

  return (
    <Shell
      title={payload.test.title}
      screen="Section order"
      footerLeft={<ExitButton requestExit={requestExit} />}
      footerRight={
        <button type="button" className="player-primary" onClick={() => act({ type: 'choose-order', order: orders[choice] })}>
          Continue
        </button>
      }
    >
      <div className="player-panel">
        <h1>Choose your section order</h1>
        <p className="player-lead">Pick the order you want to take the sections in. You can't change it once the test begins.</p>
        <fieldset className="player-orders">
          <legend className="visually-hidden">Section order</legend>
          {orders.map((order, i) => (
            <label key={order.join()} className={`player-option ${choice === i ? 'is-on' : ''}`}>
              <input
                type="radio"
                name="order"
                aria-label={order.map(name).join(', then ')}
                checked={choice === i}
                onChange={() => setChoice(i)}
              />
              <span className="player-order">
                {order.map((id, j) => (
                  <span key={id}>
                    <span className="player-order-num">{j + 1}</span> {name(id)}
                  </span>
                ))}
              </span>
            </label>
          ))}
        </fieldset>
      </div>
    </Shell>
  );
}

// ------------------------------------------------------- section intro

export function SectionIntroScreen({ payload, attempt, rules, act, requestExit }: PlayerProps) {
  const sec = currentSection(attempt)!;
  const meta = payload.sections.find((s) => s.id === sec.id)!;
  const multi = attempt.order.length > 1;
  const types = new Set(sec.questionIds.map((id) => payload.questions[id].type));

  return (
    <Shell
      title={payload.test.title}
      subtitle={multi ? `Section ${attempt.current + 1} of ${attempt.order.length}` : undefined}
      screen={`${meta.name} instructions`}
      footerLeft={<ExitButton requestExit={requestExit} />}
      footerRight={
        <button type="button" className="player-primary" onClick={() => act({ type: 'begin-section' })}>
          Begin section
        </button>
      }
    >
      <div className="player-panel">
        {multi && (
          <p className="player-eyebrow">
            Section {attempt.current + 1} of {attempt.order.length}
          </p>
        )}
        <h1>{meta.name}</h1>
        <p className="player-lead">
          {sec.questionIds.length} questions
          {sec.limitMs !== null ? ` · ${minutes(sec.limitMs)} minutes` : ' · untimed'}
          {meta.tools.length > 0 && ` · ${meta.tools.map((t) => toolNames[t] ?? t).join(' and ')} available from the top bar`}
        </p>
        <p>The timer starts when you select <strong>Begin section</strong>.</p>

        {types.has('data-sufficiency') && (
          <section className="player-instructions">
            <h2>Data Sufficiency</h2>
            <p>
              Each question is followed by two statements. Decide whether the statements give enough information to answer
              the question, using the data in the statements plus common knowledge (such as the number of days in a week).
              The answer choices are always the same:
            </p>
            <ol type="A">
              {DS_CHOICES.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ol>
            <p className="player-note">
              Numbers are real numbers. Figures aren't necessarily drawn to scale unless stated.
            </p>
          </section>
        )}
        {types.has('multi-source-reasoning') && (
          <section className="player-instructions">
            <h2>Multi-Source Reasoning</h2>
            <p>Sources appear in tabs on the left. Select a tab to read it. Several questions may use the same sources.</p>
          </section>
        )}
        {types.has('table-analysis') && (
          <section className="player-instructions">
            <h2>Table Analysis</h2>
            <p>Sort the table by any column using the <strong>Sort by</strong> menu or the column headings.</p>
          </section>
        )}
        {types.has('reading-comprehension') && (
          <section className="player-instructions">
            <h2>Reading Comprehension</h2>
            <p>The passage stays on the left while you answer the questions about it on the right.</p>
          </section>
        )}
        {!multi && <RulesList rules={rules} payload={payload} />}
      </div>
    </Shell>
  );
}

// ------------------------------------------------------------------- breaks

export function BreakOfferScreen({ payload, attempt, rules, act, requestExit }: PlayerProps) {
  const next = payload.sections.find((s) => s.id === attempt.order[attempt.current + 1])!;
  return (
    <Shell
      title={payload.test.title}
      screen="Optional break"
      footerLeft={<ExitButton requestExit={requestExit} />}
      footerRight={
        <>
          <button type="button" className="player-secondary" onClick={() => act({ type: 'skip-break' })}>
            Skip break
          </button>
          <button type="button" className="player-primary" onClick={() => act({ type: 'take-break' })}>
            Take a {rules.optionalBreak!.minutes}-minute break
          </button>
        </>
      }
    >
      <div className="player-panel">
        <h1>Optional break</h1>
        <p className="player-lead">
          You've finished section {attempt.current + 1}. You can take one {rules.optionalBreak!.minutes}-minute break during this
          test{rules.optionalBreak!.allowedAfterSection.length > 1 && attempt.current + 1 < Math.max(...rules.optionalBreak!.allowedAfterSection)
            ? ', either now or after the next section'
            : ''}
          .
        </p>
        <p>
          Next section: <strong>{next.name}</strong>
        </p>
      </div>
    </Shell>
  );
}

export function BreakScreen({ payload, attempt, act, requestExit }: PlayerProps) {
  const next = payload.sections.find((s) => s.id === attempt.order[attempt.current + 1])!;
  const left = breakRemaining(attempt, attempt.lastTick);
  return (
    <Shell
      title={payload.test.title}
      subtitle="Break"
      screen="Break"
      timer={{ ms: left, countdown: true, label: 'Break time remaining' }}
      footerLeft={<ExitButton requestExit={requestExit} />}
      footerRight={
        <button type="button" className="player-primary" onClick={() => act({ type: 'end-break' })}>
          End break and continue
        </button>
      }
    >
      <div className="player-panel player-break">
        <p className="player-eyebrow">Break</p>
        <p className="player-break-clock">{formatDuration(left)}</p>
        <p className="player-lead">
          Stretch, get some water and rest your eyes. When the break ends, you'll move on to <strong>{next.name}</strong>.
        </p>
      </div>
    </Shell>
  );
}
