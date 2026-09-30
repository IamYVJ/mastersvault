import { describe, expect, it } from 'vitest';
import type { RenderedQuestion, TestPayload } from '../src/lib/content/types.ts';
import { type Action, type ActionInput, type Attempt, createAttempt, reduce } from '../src/lib/engine/attempt.ts';
import { BACKUP_FORMAT, isAttempt, makeBackup, mergeBackup, parseBackup } from '../src/lib/engine/backup.ts';
import { inProgress, sectionTrends, topicStats, totals } from '../src/lib/engine/progress.ts';
import { buildHistoryEntry, type HistoryEntry } from '../src/lib/engine/storage.ts';

function payload(id: string, section: string, topics: string[][]): TestPayload {
  const questions: Record<string, RenderedQuestion> = {};
  const ids = topics.map((t, i) => {
    const qid = `${id}-${i + 1}`;
    questions[qid] = {
      id: qid,
      type: 'problem-solving',
      section,
      difficulty: 3,
      topics: t,
      targetSeconds: 60,
      stem: '',
      explanation: '',
      response: { kind: 'choice', choices: ['a', 'b', 'c', 'd', 'e'], answer: 0 },
    };
    return qid;
  });
  return {
    version: 1,
    hash: 'h',
    exam: {
      id: 'gmat',
      name: 'GMAT',
      rules: {
        sectionOrder: 'fixed',
        requireAnswerToAdvance: false,
        allowBackNavigation: true,
        bookmarks: true,
        reviewAndEdit: { enabled: true, maxAnswerChanges: 3 },
        optionalBreak: null,
      },
      totalScore: { min: 205, max: 805, step: 10 },
    },
    test: { id, kind: 'practice', title: `Set ${id}` },
    sections: [{ id: section, name: section.toUpperCase(), shortName: section, timeMinutes: 10, tools: [], score: { min: 60, max: 90 }, questionIds: ids }],
    topics: {},
    questions,
    passages: {},
    sources: {},
  };
}

/** Takes a practice set, answering question i with answers[i] (0 = correct). */
function take(p: TestPayload, answers: number[], start: number, finish = true): Attempt {
  let now = start;
  let a = createAttempt(p, `gmat/practice/${p.test.id}`, now, `${p.test.id}-${start}`);
  const act = (x: ActionInput) => (a = reduce(a, { ...x, now: (now += 30_000) } as Action, p));
  act({ type: 'start', settings: { timed: true, explanations: 'end' } });
  act({ type: 'begin-section' });
  answers.forEach((v, i) => {
    act({ type: 'answer', value: v });
    if (i < answers.length - 1) act({ type: 'next' });
  });
  if (finish) {
    act({ type: 'next' });
    act({ type: 'finish-section' });
  }
  return a;
}

const quant = payload('q1', 'quant', [['algebra'], ['algebra', 'ratios'], ['ratios'], ['ratios']]);
const verbal = payload('v1', 'verbal', [['cr'], ['cr']]);
const DAY = 86_400_000;

function entry(p: TestPayload, answers: number[], start: number): HistoryEntry {
  return buildHistoryEntry(take(p, answers, start), p)!;
}

describe('progress', () => {
  const history = [entry(quant, [0, 0, 1, 1], 0), entry(verbal, [0, 1], DAY), entry(quant, [0, 0, 0, 1], 2 * DAY)];

  it('adds up totals across attempts', () => {
    expect(totals(history)).toMatchObject({ tests: 3, questions: 10, answered: 10, correct: 6, mocks: 0, latestMock: null });
  });

  it('tracks accuracy per section in time order', () => {
    const { trends } = sectionTrends([...history].reverse(), ['quant', 'verbal']);
    expect(trends.map((t) => t.sectionId)).toEqual(['quant', 'verbal']);
    expect(trends[0].points.map((p) => [p.index, p.accuracy])).toEqual([
      [0, 0.5],
      [2, 0.75],
    ]);
    expect(trends[1].points.map((p) => p.index)).toEqual([1]);
  });

  it('ranks topics weakest first, breaking ties by how many questions were seen', () => {
    const stats = topicStats(history);
    expect(stats.map((s) => [s.topic, s.correct, s.total])).toEqual([
      ['ratios', 3, 6],
      ['cr', 1, 2],
      ['algebra', 4, 4],
    ]);
    expect(stats.find((s) => s.topic === 'algebra')).toMatchObject({ total: 4, correct: 4, accuracy: 1 });
  });

  it('describes unfinished attempts', () => {
    const unfinished = take(quant, [0, 0], 5 * DAY, false);
    const [p] = inProgress([unfinished, take(verbal, [0, 0], DAY)]);
    expect(p).toMatchObject({ testKey: 'gmat/practice/q1', where: 'Question 2 of 4' });
    expect(inProgress([take(verbal, [0, 0], DAY)])).toEqual([]);
  });
});

describe('backup', () => {
  const finished = entry(quant, [0, 0, 1, 1], 0);
  const unfinished = take(verbal, [0], DAY, false);

  it('round-trips through JSON', () => {
    const text = JSON.stringify(makeBackup([finished], [unfinished], 123));
    const { backup, skipped } = parseBackup(text);
    expect(skipped).toBe(0);
    expect(backup.history).toHaveLength(1);
    expect(backup.attempts).toHaveLength(1);
    expect(isAttempt(backup.attempts[0])).toBe(true);
  });

  it('rejects files that are not backups', () => {
    expect(() => parseBackup('not json')).toThrow(/valid JSON/);
    expect(() => parseBackup('{"hello":1}')).toThrow(/backup file/);
    expect(() => parseBackup(JSON.stringify({ format: BACKUP_FORMAT, version: 2 }))).toThrow(/newer version/);
  });

  it('skips malformed entries instead of trusting them', () => {
    const broken = { ...finished, sections: [{ id: 'quant', name: 'Q', total: 'lots' }] };
    const badAttempt = { ...unfinished, phase: 'hacking' };
    const { backup, skipped } = parseBackup(JSON.stringify({ format: BACKUP_FORMAT, version: 1, history: [broken, finished], attempts: [badAttempt] }));
    expect(skipped).toBe(2);
    expect(backup.history.map((h) => h.id)).toEqual([finished.id]);
    expect(backup.attempts).toEqual([]);
  });

  it('merges history by id and never overwrites an unfinished local attempt', () => {
    const other = entry(verbal, [1, 1], 3 * DAY);
    const localUnfinished = take(verbal, [1], 4 * DAY, false);
    const merged = mergeBackup({ history: [finished], attempts: [localUnfinished] }, makeBackup([finished, other], [unfinished], 0));
    expect(merged.addedHistory).toBe(1);
    expect(merged.history.map((h) => h.id)).toEqual([other.id, finished.id]);
    expect(merged.restoredAttempts).toBe(0);
    expect(merged.keptLocalAttempts).toBe(1);

    const fresh = mergeBackup({ history: [], attempts: [] }, makeBackup([], [unfinished], 0));
    expect(fresh.attempts.map((a) => a.id)).toEqual([unfinished.id]);
  });
});
