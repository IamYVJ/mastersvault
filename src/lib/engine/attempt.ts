// The test engine: one attempt at a test, advanced by a pure reducer.
//
// Flow:  setup → order? → section-intro → question… → review? → break-offer? → break? → section-intro … → results
//
// Time is tracked with timestamps passed in on every action (never Date.now()
// inside the reducer), so it is deterministic and survives background-tab
// throttling. Time while the page is closed is not counted: on resume, clocks
// stop at the last saved tick and restart when the test taker continues.
import type { ResponseValue, TestPayload } from '../content/types.ts';
import { isComplete } from './grading.ts';

export interface Settings {
  timed: boolean;
  /** Practice only: reveal the answer after each question, or only at the end. */
  explanations: 'end' | 'each';
}

export interface Rules {
  timed: boolean;
  explanations: 'end' | 'each';
  sectionOrder: 'fixed' | 'choose';
  requireAnswer: boolean;
  allowBack: boolean;
  bookmarks: boolean;
  review: boolean;
  /** Answer changes allowed during review; null = unlimited. */
  maxChanges: number | null;
  optionalBreak: { minutes: number; allowedAfterSection: number[] } | null;
}

export type Phase = 'setup' | 'order' | 'section-intro' | 'question' | 'review' | 'break-offer' | 'break' | 'results';
export type Alert = { kind: 'time-up'; section: string } | { kind: 'five-minutes' } | { kind: 'resumed' } | null;

export interface SectionState {
  id: string;
  questionIds: string[];
  limitMs: number | null;
  elapsedMs: number;
  runningSince: number | null;
  status: 'pending' | 'active' | 'done';
  endedBy?: 'time' | 'submit';
  index: number;
  furthest: number;
  responses: Record<string, ResponseValue>;
  bookmarks: string[];
  /** Practice "each" mode: questions whose answer has been revealed (and locked). */
  checked: string[];
  /** Questions whose answer was changed during review & edit. */
  edited: string[];
  timeMs: Record<string, number>;
  questionSince: number | null;
  warned: boolean;
}

export interface Attempt {
  version: 1;
  id: string;
  testKey: string;
  hash: string;
  kind: 'mock' | 'practice';
  title: string;
  settings: Settings;
  createdAt: number;
  lastTick: number;
  phase: Phase;
  order: string[];
  current: number;
  sections: Record<string, SectionState>;
  /** In the review phase: the question opened for editing, if any. */
  reviewOpen: number | null;
  breakTaken: boolean;
  breakClock: { limitMs: number; elapsedMs: number; runningSince: number | null } | null;
  alert: Alert;
  finishedAt: number | null;
  recorded: boolean;
}

export type Action =
  | { type: 'start'; now: number; settings: Settings }
  | { type: 'choose-order'; now: number; order: string[] }
  | { type: 'begin-section'; now: number }
  | { type: 'answer'; now: number; value: ResponseValue }
  | { type: 'check'; now: number }
  | { type: 'next'; now: number }
  | { type: 'back'; now: number }
  | { type: 'goto'; now: number; index: number }
  | { type: 'toggle-bookmark'; now: number }
  | { type: 'open-review'; now: number }
  | { type: 'review-open'; now: number; index: number }
  | { type: 'review-close'; now: number }
  | { type: 'finish-section'; now: number }
  | { type: 'take-break'; now: number }
  | { type: 'skip-break'; now: number }
  | { type: 'end-break'; now: number }
  | { type: 'tick'; now: number }
  | { type: 'resume'; now: number }
  | { type: 'dismiss-alert'; now: number }
  | { type: 'mark-recorded'; now: number };

/** An action without its timestamp; the player adds `now` when dispatching. */
export type ActionInput = { [K in Action['type']]: Omit<Extract<Action, { type: K }>, 'now'> }[Action['type']];

export const FIVE_MINUTES = 5 * 60_000;

export function rulesFor(payload: TestPayload, settings: Settings): Rules {
  const r = payload.exam.rules;
  if (payload.test.kind === 'mock') {
    return {
      timed: true,
      explanations: 'end',
      sectionOrder: payload.sections.length > 1 ? r.sectionOrder : 'fixed',
      requireAnswer: r.requireAnswerToAdvance,
      allowBack: r.allowBackNavigation,
      bookmarks: r.bookmarks,
      review: r.reviewAndEdit.enabled,
      maxChanges: r.reviewAndEdit.enabled ? r.reviewAndEdit.maxAnswerChanges : 0,
      optionalBreak: r.optionalBreak,
    };
  }
  // Practice sets keep the look of the exam but relax its navigation rules.
  return {
    timed: settings.timed,
    explanations: settings.explanations,
    sectionOrder: 'fixed',
    requireAnswer: false,
    allowBack: true,
    bookmarks: true,
    review: true,
    maxChanges: null,
    optionalBreak: null,
  };
}

export function createAttempt(payload: TestPayload, testKey: string, now: number, id = randomId()): Attempt {
  const sections: Record<string, SectionState> = {};
  for (const s of payload.sections) {
    sections[s.id] = {
      id: s.id,
      questionIds: s.questionIds,
      limitMs: s.timeMinutes * 60_000,
      elapsedMs: 0,
      runningSince: null,
      status: 'pending',
      index: 0,
      furthest: 0,
      responses: {},
      bookmarks: [],
      checked: [],
      edited: [],
      timeMs: {},
      questionSince: null,
      warned: false,
    };
  }
  return {
    version: 1,
    id,
    testKey,
    hash: payload.hash,
    kind: payload.test.kind,
    title: payload.test.title,
    settings: { timed: true, explanations: 'end' },
    createdAt: now,
    lastTick: now,
    phase: 'setup',
    order: payload.sections.map((s) => s.id),
    current: 0,
    sections,
    reviewOpen: null,
    breakTaken: false,
    breakClock: null,
    alert: null,
    finishedAt: null,
    recorded: false,
  };
}

// ------------------------------------------------------------------ queries

export const currentSection = (a: Attempt): SectionState | undefined => a.sections[a.order[a.current]];

/** The question currently on screen, if any. */
export function activeQuestionId(a: Attempt): string | null {
  const sec = currentSection(a);
  if (!sec || sec.status !== 'active') return null;
  if (a.phase === 'question') return sec.questionIds[sec.index] ?? null;
  if (a.phase === 'review' && a.reviewOpen !== null) return sec.questionIds[a.reviewOpen] ?? null;
  return null;
}

export function sectionElapsed(sec: SectionState, now: number): number {
  return sec.elapsedMs + (sec.runningSince !== null ? Math.max(0, now - sec.runningSince) : 0);
}

export function sectionRemaining(sec: SectionState, now: number): number | null {
  return sec.limitMs === null ? null : Math.max(0, sec.limitMs - sectionElapsed(sec, now));
}

export function breakRemaining(a: Attempt, now: number): number {
  const b = a.breakClock;
  if (!b) return 0;
  const elapsed = b.elapsedMs + (b.runningSince !== null ? Math.max(0, now - b.runningSince) : 0);
  return Math.max(0, b.limitMs - elapsed);
}

/** Can the answer to the active question be changed right now? */
export function canEdit(a: Attempt, rules: Rules): boolean {
  const sec = currentSection(a);
  const qid = activeQuestionId(a);
  if (!sec || !qid || sec.checked.includes(qid)) return false;
  if (a.phase === 'review' && rules.maxChanges !== null && !sec.edited.includes(qid))
    return sec.edited.length < rules.maxChanges;
  return true;
}

/** Changes left in review & edit for the current section; null = unlimited. */
export function changesLeft(a: Attempt, rules: Rules): number | null {
  const sec = currentSection(a);
  if (rules.maxChanges === null || !sec) return null;
  return Math.max(0, rules.maxChanges - sec.edited.length);
}

export function isTimerRunning(a: Attempt): boolean {
  return (a.phase === 'question' || a.phase === 'review' || a.phase === 'break') && a.finishedAt === null;
}

// ------------------------------------------------------------------ reducer

export function reduce(state: Attempt, action: Action, payload: TestPayload): Attempt {
  const a = structuredClone(state);
  const now = action.now;
  const rules = rulesFor(payload, a.settings);

  if (action.type === 'resume') {
    // Count time up to the last saved tick, then hold the clocks until the
    // test taker dismisses the "welcome back" message.
    settle(a, a.lastTick);
    if (isTimerRunning(a)) {
      pauseClocks(a);
      a.alert = { kind: 'resumed' };
    }
    a.lastTick = now;
    return a;
  }

  settle(a, now);
  const sec = currentSection(a);
  const spec = (qid: string) => payload.questions[qid].response;

  switch (action.type) {
    case 'start': {
      if (a.phase !== 'setup') break;
      a.settings = action.settings;
      const r = rulesFor(payload, a.settings);
      for (const s of payload.sections) a.sections[s.id].limitMs = r.timed ? s.timeMinutes * 60_000 : null;
      a.phase = r.sectionOrder === 'choose' ? 'order' : 'section-intro';
      break;
    }
    case 'choose-order': {
      if (a.phase !== 'order') break;
      const valid = action.order.length === a.order.length && a.order.every((id) => action.order.includes(id));
      if (!valid) break;
      a.order = [...action.order];
      a.phase = 'section-intro';
      break;
    }
    case 'begin-section': {
      if (a.phase !== 'section-intro' || !sec) break;
      sec.status = 'active';
      sec.runningSince = now;
      a.phase = 'question';
      break;
    }
    case 'answer': {
      const qid = activeQuestionId(a);
      if (!sec || !qid || !canEdit(a, rules)) break;
      if (a.phase === 'review' && rules.maxChanges !== null && !sec.edited.includes(qid)) sec.edited.push(qid);
      sec.responses[qid] = action.value;
      break;
    }
    case 'check': {
      const qid = activeQuestionId(a);
      if (!sec || !qid || rules.explanations !== 'each') break;
      if (!isComplete(spec(qid), sec.responses[qid] ?? null)) break;
      if (!sec.checked.includes(qid)) sec.checked.push(qid);
      break;
    }
    case 'next': {
      if (a.phase !== 'question' || !sec) break;
      const qid = sec.questionIds[sec.index];
      if (rules.requireAnswer && !isComplete(spec(qid), sec.responses[qid] ?? null)) break;
      if (sec.index < sec.questionIds.length - 1) {
        sec.index += 1;
        sec.furthest = Math.max(sec.furthest, sec.index);
      } else if (rules.review) {
        a.phase = 'review';
        a.reviewOpen = null;
      } else {
        finishSection(a, rules, now, 'submit');
      }
      break;
    }
    case 'back': {
      if (a.phase !== 'question' || !sec || !rules.allowBack || sec.index === 0) break;
      sec.index -= 1;
      break;
    }
    case 'goto': {
      if (!sec || !rules.allowBack || (a.phase !== 'question' && a.phase !== 'review')) break;
      if (action.index < 0 || action.index >= sec.questionIds.length) break;
      a.phase = 'question';
      a.reviewOpen = null;
      sec.index = action.index;
      sec.furthest = Math.max(sec.furthest, sec.index);
      break;
    }
    case 'toggle-bookmark': {
      const qid = activeQuestionId(a);
      if (!sec || !qid || !rules.bookmarks) break;
      sec.bookmarks = sec.bookmarks.includes(qid) ? sec.bookmarks.filter((b) => b !== qid) : [...sec.bookmarks, qid];
      break;
    }
    case 'open-review': {
      // Practice only: jump to the review list at any point.
      if (a.phase !== 'question' || !rules.allowBack) break;
      a.phase = 'review';
      a.reviewOpen = null;
      break;
    }
    case 'review-open': {
      if (a.phase !== 'review' || !sec) break;
      if (action.index < 0 || action.index >= sec.questionIds.length) break;
      a.reviewOpen = action.index;
      break;
    }
    case 'review-close': {
      if (a.phase === 'review') a.reviewOpen = null;
      break;
    }
    case 'finish-section': {
      if ((a.phase !== 'review' && a.phase !== 'question') || !sec) break;
      if (a.phase === 'question' && !rules.allowBack) break;
      finishSection(a, rules, now, 'submit');
      break;
    }
    case 'take-break': {
      if (a.phase !== 'break-offer' || !rules.optionalBreak) break;
      a.breakTaken = true;
      a.breakClock = { limitMs: rules.optionalBreak.minutes * 60_000, elapsedMs: 0, runningSince: now };
      a.phase = 'break';
      break;
    }
    case 'skip-break':
    case 'end-break': {
      if (a.phase !== 'break-offer' && a.phase !== 'break') break;
      endBreak(a);
      break;
    }
    case 'tick': {
      if (a.phase === 'break' && breakRemaining(a, now) === 0) {
        endBreak(a);
        break;
      }
      if (!sec || sec.status !== 'active' || sec.limitMs === null) break;
      const remaining = sectionRemaining(sec, now)!;
      if (remaining === 0) {
        sec.elapsedMs = sec.limitMs;
        a.alert = { kind: 'time-up', section: sec.id };
        finishSection(a, rules, now, 'time');
      } else if (remaining <= FIVE_MINUTES && !sec.warned && sec.limitMs > FIVE_MINUTES) {
        sec.warned = true;
        a.alert = { kind: 'five-minutes' };
      }
      break;
    }
    case 'dismiss-alert':
      if (a.alert?.kind === 'resumed') {
        if (sec?.status === 'active') sec.runningSince = now;
        if (a.phase === 'break' && a.breakClock) a.breakClock.runningSince = now;
      }
      a.alert = null;
      break;
    case 'mark-recorded':
      a.recorded = true;
      break;
  }

  // Whichever question is on screen now starts accruing time.
  const s = currentSection(a);
  if (s) s.questionSince = activeQuestionId(a) && s.runningSince !== null ? now : null;
  return a;
}

// ------------------------------------------------------------------ helpers

/** Adds time elapsed since the last action to the running clocks. */
function settle(a: Attempt, now: number) {
  const sec = currentSection(a);
  const qid = activeQuestionId(a);
  if (sec) {
    if (sec.runningSince !== null) {
      sec.elapsedMs += Math.max(0, now - sec.runningSince);
      sec.runningSince = now;
    }
    if (sec.questionSince !== null && qid) {
      sec.timeMs[qid] = (sec.timeMs[qid] ?? 0) + Math.max(0, now - sec.questionSince);
      sec.questionSince = now;
    }
  }
  if (a.breakClock?.runningSince != null) {
    a.breakClock.elapsedMs += Math.max(0, now - a.breakClock.runningSince);
    a.breakClock.runningSince = now;
  }
  a.lastTick = now;
}

function pauseClocks(a: Attempt) {
  for (const sec of Object.values(a.sections)) {
    sec.runningSince = null;
    sec.questionSince = null;
  }
  if (a.breakClock) a.breakClock.runningSince = null;
}

function finishSection(a: Attempt, rules: Rules, now: number, endedBy: 'time' | 'submit') {
  const sec = currentSection(a)!;
  sec.status = 'done';
  sec.endedBy = endedBy;
  sec.runningSince = null;
  sec.questionSince = null;
  a.reviewOpen = null;
  const completed = a.current + 1;
  if (completed >= a.order.length) {
    a.phase = 'results';
    a.finishedAt = now;
  } else if (rules.optionalBreak && !a.breakTaken && rules.optionalBreak.allowedAfterSection.includes(completed)) {
    a.phase = 'break-offer';
  } else {
    a.current += 1;
    a.phase = 'section-intro';
  }
}

function endBreak(a: Attempt) {
  if (a.breakClock) a.breakClock.runningSince = null;
  a.current += 1;
  a.phase = 'section-intro';
}

function randomId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
