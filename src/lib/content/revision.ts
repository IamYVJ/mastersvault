// Build-time helpers for revision notes: ordering, links between notes,
// topics and practice sets.
import { GENERAL_NOTES, type ExamBundle, type Note, type TestDef } from './load.ts';

export const KIND_LABELS = { topic: 'Topic note', formulas: 'Formula sheet', strategy: 'Strategy guide' } as const;

export const noteHref = (examId: string, note: Note) => `/${examId}/revision/${note.folder}/${note.slug}/`;

export function sortedNotes(bundle: ExamBundle, folder?: string): Note[] {
  return [...bundle.notes.values()]
    .filter((n) => folder === undefined || n.folder === folder)
    .sort((a, b) => a.data.order - b.data.order || a.data.title.localeCompare(b.data.title));
}

/** The best note for each "section/topic" key: a topic note if there is one, otherwise a strategy guide. */
export function notesByTopic(bundle: ExamBundle): Map<string, Note> {
  const map = new Map<string, Note>();
  const rank = { topic: 0, strategy: 1, formulas: 2 } as const;
  for (const note of sortedNotes(bundle)) {
    if (note.folder === GENERAL_NOTES) continue;
    for (const topic of note.data.topics) {
      const key = `${note.folder}/${topic}`;
      const current = map.get(key);
      if (!current || rank[note.data.kind] < rank[current.data.kind]) map.set(key, note);
    }
  }
  return map;
}

/** Practice sets with questions on the note's topics or question types, most relevant first. */
export function practiceFor(bundle: ExamBundle, note: Note): { test: TestDef; matches: number }[] {
  const topics = new Set(note.data.topics);
  const types = new Set(note.data.questionTypes);
  if (!topics.size && !types.size) return [];
  return bundle.practice
    .map((test) => {
      const matches = test.sections
        .flatMap((s) => s.questions)
        .map((id) => bundle.questions.get(id)!)
        .filter((q) => q.section === note.folder && (types.has(q.data.type) || q.data.topics.some((t) => topics.has(t)))).length;
      return { test, matches };
    })
    .filter((x) => x.matches > 0)
    .sort((a, b) => b.matches - a.matches);
}
