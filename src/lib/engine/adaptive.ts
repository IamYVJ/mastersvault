// Chooses the questions of an adaptive section as the test goes.
//
// A section's plan is a list of slots: a single question of a given type, or a block of questions
// that share a Reading Comprehension passage or a Multi-Source Reasoning source set. Each time a slot
// comes up, the engine estimates the test taker's ability from the answers so far, with the same
// model as the score estimate (scoring.ts), and fills the slot from the unused part of the pool:
//
//  - the target difficulty is θ + 3 on the 1–5 scale (an untried test taker gets difficulty 3);
//  - a single question is the one whose difficulty is closest to the target, preferring one that
//    brings a topic the section hasn't shown yet;
//  - a block is the passage or source set whose questions' average difficulty is closest, and all
//    its questions are served together, in the order the pool lists them;
//  - near-ties are broken by a random number seeded from the attempt, so different attempts see
//    different questions but replaying an attempt always gives the same ones.
//
// Unanswered questions count as incorrect. Changing an answer in review & edit changes the score,
// but not which questions were served, as on the real exam.
import type { AdaptivePlan, AdaptiveSlot, ResponseValue, TestPayload } from '../content/types.ts';
import { isCorrect } from './grading.ts';
import { estimateAbility } from './scoring.ts';

/** How much a topic the section has already shown counts against a question, in difficulty levels. */
const SEEN_TOPIC_PENALTY = 0.25;
/** The largest random nudge, in difficulty levels: enough to vary near-ties, never a whole level. */
const JITTER = 0.15;

/** The number of questions a test taker answers in a section. */
export function sectionLength(payload: TestPayload, sectionId: string): number {
  const s = payload.sections.find((x) => x.id === sectionId)!;
  return s.adaptive?.length ?? s.questionIds.length;
}

const slotSize = (slot: AdaptiveSlot) => (slot.kind === 'single' ? 1 : slot.size);

/** The index of the slot to fill after `served` questions, or null once the plan is complete. */
export function nextSlot(plan: AdaptivePlan, served: number): number | null {
  let filled = 0;
  for (let i = 0; i < plan.slots.length; i++) {
    if (filled === served) return i;
    filled += slotSize(plan.slots[i]);
  }
  return null;
}

export const targetDifficulty = (theta: number) => Math.max(1, Math.min(5, theta + 3));

/** The ability estimate behind the next choice. */
export function abilitySoFar(payload: TestPayload, served: string[], responses: Record<string, ResponseValue>) {
  return estimateAbility(
    served.map((id) => {
      const q = payload.questions[id];
      return { difficulty: q.difficulty, correct: isCorrect(q.response, responses[id] ?? null) };
    }),
  );
}

/**
 * The question, or block of questions, to serve next, or [] once the section's plan is complete.
 * `seed` identifies the attempt and section (see seedFor).
 */
export function nextQuestions(
  payload: TestPayload,
  plan: AdaptivePlan,
  served: string[],
  responses: Record<string, ResponseValue>,
  seed: number,
): string[] {
  const index = nextSlot(plan, served.length);
  if (index === null) return [];
  const slot = plan.slots[index];
  const qs = payload.questions;
  const used = new Set(served);
  const target = targetDifficulty(abilitySoFar(payload, served, responses).theta);
  const random = mulberry32(seed + served.length * 7919);

  if (slot.kind === 'single') {
    const seenTopics = new Set(served.flatMap((id) => qs[id].topics));
    let best: { id: string; score: number } | null = null;
    for (const id of plan.pool) {
      const q = qs[id];
      if (used.has(id) || q.type !== slot.type || q.stimulus?.kind === 'passage' || q.stimulus?.kind === 'sources') continue;
      const fresh = q.topics.some((t) => !seenTopics.has(t));
      const score = Math.abs(q.difficulty - target) + (fresh ? 0 : SEEN_TOPIC_PENALTY) + random() * JITTER;
      if (!best || score < best.score) best = { id, score };
    }
    return best ? [best.id] : [];
  }

  // Blocks: every pool question that shares a passage (or source set), in pool order.
  const blocks = new Map<string, string[]>();
  for (const id of plan.pool) {
    const st = qs[id].stimulus;
    if (st?.kind !== slot.stimulus) continue;
    blocks.set(st.id, [...(blocks.get(st.id) ?? []), id]);
  }
  let best: { ids: string[]; score: number } | null = null;
  for (const ids of blocks.values()) {
    if (ids.length !== slot.size || ids.some((id) => used.has(id))) continue;
    const mean = ids.reduce((n, id) => n + qs[id].difficulty, 0) / ids.length;
    const score = Math.abs(mean - target) + random() * JITTER;
    if (!best || score < best.score) best = { ids, score };
  }
  return best ? best.ids : [];
}

/** A number that identifies an attempt's section, for seeding its choices. */
export function seedFor(attemptId: string, sectionId: string): number {
  let h = 2166136261;
  for (const c of `${attemptId}:${sectionId}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Dev server only (`?pool` on the take page): the same test with every pool question served
 * in pool order, so that each one can be checked on screen. Its hash differs, so its saved attempt
 * never mixes with a real one.
 */
export function servePoolInOrder(payload: TestPayload): TestPayload {
  return {
    ...payload,
    hash: `${payload.hash}-pool`,
    test: { ...payload.test, adaptive: undefined },
    sections: payload.sections.map((s) => (s.adaptive ? { ...s, questionIds: [...s.adaptive.pool], adaptive: undefined } : s)),
  };
}
