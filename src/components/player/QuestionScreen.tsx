// One question on screen, during the section or while editing from review.
import QuestionView from '../questions/QuestionView.tsx';
import { activeQuestionId, canEdit, changesLeft, currentSection, sectionElapsed, sectionRemaining } from '../../lib/engine/attempt.ts';
import { isComplete } from '../../lib/engine/grading.ts';
import { reportIssueUrl } from '../../lib/site.ts';
import type { PlayerProps } from './context.ts';
import { ChevronLeft, ChevronRight, ExitIcon, ListIcon } from './icons.tsx';
import Shell, { type TimerInfo } from './Shell.tsx';

export function sectionTimer(props: Pick<PlayerProps, 'attempt'>): TimerInfo | undefined {
  const sec = currentSection(props.attempt);
  if (!sec) return undefined;
  const remaining = sectionRemaining(sec, props.attempt.lastTick);
  return remaining === null
    ? { ms: sectionElapsed(sec, props.attempt.lastTick), countdown: false }
    : { ms: remaining, countdown: true };
}

export default function QuestionScreen(props: PlayerProps) {
  const { payload, attempt, rules, act, requestExit } = props;
  const sec = currentSection(attempt)!;
  const qid = activeQuestionId(attempt)!;
  const question = payload.questions[qid];
  const index = sec.questionIds.indexOf(qid);
  const total = sec.questionIds.length;
  const response = sec.responses[qid] ?? null;
  const complete = isComplete(question.response, response);
  const editable = canEdit(attempt, rules);
  const checked = sec.checked.includes(qid);
  const inReview = attempt.phase === 'review';
  const meta = payload.sections.find((s) => s.id === sec.id)!;
  const passage = question.stimulus?.kind === 'passage' ? payload.passages[question.stimulus.id] : undefined;
  const sources = question.stimulus?.kind === 'sources' ? payload.sources[question.stimulus.id] : undefined;
  const left = changesLeft(attempt, rules);
  const isLast = index === total - 1;

  let primary;
  if (inReview) {
    primary = (
      <button type="button" className="player-primary" onClick={() => act({ type: 'review-close' })}>
        <ListIcon /> Back to review
      </button>
    );
  } else if (rules.explanations === 'each' && complete && !checked) {
    primary = (
      <button type="button" className="player-primary" onClick={() => act({ type: 'check' })}>
        Check answer
      </button>
    );
  } else {
    const blocked = rules.requireAnswer && !complete;
    primary = (
      <button
        type="button"
        className="player-primary"
        disabled={blocked}
        title={blocked ? 'Answer the question to continue' : undefined}
        onClick={() => act({ type: 'next' })}
      >
        {isLast ? (rules.review ? 'Review answers' : 'Finish section') : 'Next'} <ChevronRight />
      </button>
    );
  }

  return (
    <Shell
      title={payload.test.title}
      subtitle={meta.name}
      timer={sectionTimer(props)}
      tools={props.tools}
      counter={`Question ${index + 1} of ${total}`}
      bookmark={rules.bookmarks ? { on: sec.bookmarks.includes(qid), toggle: () => act({ type: 'toggle-bookmark' }) } : undefined}
      wide={question.stimulus?.kind === 'passage' || question.stimulus?.kind === 'sources'}
      footerLeft={
        <>
          <button type="button" className="player-bar-btn" onClick={requestExit}>
            <ExitIcon />
            <span>Save and exit</span>
          </button>
          {!inReview && rules.allowBack && (
            <button type="button" className="player-bar-btn" onClick={() => act({ type: 'open-review' })}>
              <ListIcon />
              <span>All questions</span>
            </button>
          )}
        </>
      }
      footerRight={
        <>
          {!inReview && rules.allowBack && index > 0 && (
            <button type="button" className="player-secondary" onClick={() => act({ type: 'back' })}>
              <ChevronLeft /> Back
            </button>
          )}
          {!inReview && rules.explanations === 'each' && !checked && !complete && (
            <span className="player-hint">Choose an answer, or skip with Next</span>
          )}
          {!inReview && rules.requireAnswer && !complete && <span className="player-hint">Answer to continue</span>}
          {primary}
        </>
      }
    >
      {inReview && left !== null && (
        <div className={`player-banner ${editable ? '' : 'is-locked'}`} role="status">
          {editable
            ? `Review & Edit: you can change ${left === 1 ? '1 more answer' : `${left} more answers`}${sec.edited.includes(qid) ? ' (this one already counts as changed)' : ''}.`
            : `You've used all ${rules.maxChanges} answer changes for this section, so this answer can't be changed.`}
        </div>
      )}
      <div key={qid} className="player-question">
        <h1 className="visually-hidden">
          Question {index + 1} of {total}
        </h1>
        <QuestionView
          question={question}
          passage={passage}
          sources={sources}
          response={response}
          onChange={editable ? (value) => act({ type: 'answer', value }) : undefined}
          reveal={checked}
          explanationFooter={
            <p className="player-report">
              <a href={reportIssueUrl(qid, payload.test.title)} target="_blank" rel="noopener">
                Report an issue with this question
              </a>
            </p>
          }
        />
      </div>
    </Shell>
  );
}
