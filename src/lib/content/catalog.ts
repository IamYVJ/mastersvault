// Names and links the browser-side dashboard needs, built at compile time.
import { dataPath } from './data-path.ts';
import { getExams } from './index.ts';
import { noteHref, notesByTopic } from './revision.ts';

export function buildCatalog(url: (path: string) => string) {
  const tests: Record<string, { title: string; href?: string; dataUrl: string }> = {};
  const topics: Record<string, { name: string; section: string; noteHref?: string }> = {};
  const sections: { id: string; name: string; shortName: string }[] = [];

  for (const exam of getExams()) {
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
    for (const s of exam.config.sections) {
      if (!sections.some((x) => x.id === s.id)) sections.push({ id: s.id, name: s.name, shortName: s.shortName });
      for (const t of s.topics) {
        const note = notes.get(`${s.id}/${t.id}`);
        topics[`${s.id}/${t.id}`] = { name: t.name, section: s.id, noteHref: note ? url(noteHref(exam.id, note)) : undefined };
      }
    }
  }
  return { tests, topics, sections };
}
