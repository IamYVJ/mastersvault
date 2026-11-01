// Names and links the browser-side dashboard needs, built at compile time.
import { dataPath } from './data-path.ts';
import { getExams } from './index.ts';
import { noteHref, notesByTopic } from './revision.ts';

//
// Each exam's progress is shown on its own, since scores, sections and topics differ between exams:
// `exams` lists them, and the keys of `topics` and `sections` start with the exam's id.
export function buildCatalog(url: (path: string) => string) {
  const tests: Record<string, { title: string; href?: string; dataUrl: string }> = {};
  const topics: Record<string, { name: string; section: string; noteHref?: string }> = {};
  const exams: {
    id: string;
    name: string;
    sections: { id: string; name: string; shortName: string }[];
    links: { practice: string; mocks: string; revision: string };
  }[] = [];

  for (const exam of getExams()) {
    exams.push({
      id: exam.id,
      name: exam.config.name,
      sections: exam.config.sections.map((s) => ({ id: s.id, name: s.name, shortName: s.shortName })),
      links: { practice: url(`/${exam.id}/practice/`), mocks: url(`/${exam.id}/mocks/`), revision: url(`/${exam.id}/revision/`) },
    });
    for (const [kind, list] of [
      ['mocks', exam.mocks],
      ['practice', exam.practice],
    ] as const) {
      for (const t of list)
        tests[`${exam.id}/${kind}/${t.id}`] = {
          title: t.title,
          href: url(`/${exam.id}/${kind}/${t.id}/`),
          dataUrl: url(dataPath(exam.id, kind, t.id)),
        };
    }

    const notes = notesByTopic(exam);
    for (const s of exam.config.sections)
      for (const t of s.topics) {
        const note = notes.get(`${s.id}/${t.id}`);
        topics[`${exam.id}/${s.id}/${t.id}`] = { name: t.name, section: s.id, noteHref: note ? url(noteHref(exam.id, note)) : undefined };
      }
  }
  return { tests, topics, exams };
}
