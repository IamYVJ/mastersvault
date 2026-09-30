// End-of-section review: every question's status, bookmarks, and (in mocks)
// how many answer changes are left.
import { useState } from 'react';
import { changesLeft, currentSection } from '../../lib/engine/attempt.ts';
import { isComplete } from '../../lib/engine/grading.ts';
import type { PlayerProps } from './context.ts';
import { BookmarkIcon, ExitIcon } from './icons.tsx';
import Modal from './Modal.tsx';
import { sectionTimer } from './QuestionScreen.tsx';
import Shell from './Shell.tsx';

export default function ReviewScreen(props: PlayerProps) {
  const { payload, attempt, rules, act, requestExit } = props;
  const sec = currentSection(attempt)!;
  const meta = payload.sections.find((s) => s.id === sec.id)!;
  const [onlyBookmarked, setOnlyBookmarked] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const left = changesLeft(attempt, rules);
  const isMock = payload.test.kind === 'mock';
  const lastSection = attempt.current === attempt.order.length - 1;

  const rows = sec.questionIds.map((qid, i) => {
    const response = sec.responses[qid] ?? null;
    return {
      qid,
      i,
      answered: isComplete(payload.questions[qid].response, response),
      bookmarked: sec.bookmarks.includes(qid),
      edited: sec.edited.includes(qid),
      checked: sec.checked.includes(qid),
    };
  });
  const unanswered = rows.filter((r) => !r.answered).length;
  const shown = onlyBookmarked ? rows.filter((r) => r.bookmarked) : rows;
  const open = (i: number) => act(rules.allowBack ? { type: 'goto', index: i } : { type: 'review-open', index: i });
  const finishLabel = isMock ? 'Finish section' : 'Submit';

  return (
    <Shell
      title={payload.test.title}
      subtitle={meta.name}
      timer={sectionTimer(props)}
      tools={props.tools}
      counter={isMock ? 'Review & Edit' : 'Review'}
      footerLeft={
        <button type="button" className="player-bar-btn" onClick={requestExit}>
          <ExitIcon />
          <span>Save and exit</span>
        </button>
      }
      footerRight={
        <button type="button" className="player-primary" onClick={() => setConfirming(true)}>
          {finishLabel}
        </button>
      }
    >
      <div className="player-panel is-wide">
        <h1>{isMock ? 'Review & Edit' : 'Review your answers'}</h1>
        <p className="player-lead">
          {isMock
            ? left !== null && left > 0
              ? `Open any question to check it. You can change up to ${left} more ${left === 1 ? 'answer' : 'answers'} before the section ends.`
              : `You've used all ${rules.maxChanges} answer changes. You can still open questions to look at them.`
            : 'Open any question to change your answer, then submit when you are ready.'}{' '}
          {sec.limitMs !== null && 'The section timer is still running.'}
        </p>

        <div className="player-review-tools">
          <label>
            <input type="checkbox" checked={onlyBookmarked} onChange={(e) => setOnlyBookmarked(e.target.checked)} /> Show
            bookmarked only ({rows.filter((r) => r.bookmarked).length})
          </label>
          {!isMock && unanswered > 0 && <span className="player-warn">{unanswered} unanswered</span>}
        </div>

        <table className="player-table player-review-table">
          <thead>
            <tr>
              <th scope="col">Question</th>
              <th scope="col">Status</th>
              <th scope="col">
                <span className="visually-hidden">Bookmarked</span>
              </th>
              <th scope="col">
                <span className="visually-hidden">Open</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.qid} className={r.answered ? '' : 'is-unanswered'}>
                <td>Question {r.i + 1}</td>
                <td>
                  {r.answered ? 'Answered' : 'Not answered'}
                  {r.edited && <span className="badge">changed</span>}
                  {r.checked && <span className="badge">checked</span>}
                </td>
                <td className="player-review-flag">{r.bookmarked && <BookmarkIcon filled />}</td>
                <td className="num">
                  <button type="button" className="player-link-btn" onClick={() => open(r.i)}>
                    Open
                  </button>
                </td>
              </tr>
            ))}
            {!shown.length && (
              <tr>
                <td colSpan={4} className="player-empty">
                  No bookmarked questions.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {confirming && (
        <Modal
          title={isMock ? 'Finish this section?' : 'Submit your answers?'}
          onClose={() => setConfirming(false)}
          actions={
            <>
              <button type="button" className="player-secondary" onClick={() => setConfirming(false)}>
                Keep reviewing
              </button>
              <button type="button" className="player-primary" onClick={() => act({ type: 'finish-section' })}>
                {finishLabel}
              </button>
            </>
          }
        >
          <p>
            {isMock
              ? lastSection
                ? "This is the last section. After you finish it, you'll see your results."
                : "You won't be able to return to this section."
              : unanswered > 0
                ? `You have ${unanswered} unanswered ${unanswered === 1 ? 'question' : 'questions'}. They'll count as incorrect.`
                : "You'll see your results and the explanations next."}
          </p>
        </Modal>
      )}
    </Shell>
  );
}
