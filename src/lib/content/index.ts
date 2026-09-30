// Entry point for Astro pages and scripts.
import path from 'node:path';
import { CONTENT_ROOT, listExamIds, loadExam, type ExamBundle, type Issue } from './load.ts';
import { renderDocument } from './markdown.ts';
import { renderPassage, renderQuestion, renderSourceSet } from './payload.ts';

export { GENERAL_NOTES, listExamIds, type ExamBundle, type Issue, type Note } from './load.ts';
export { renderDocument, type Heading } from './markdown.ts';
export { buildTestPayload, renderQuestion, renderPassage, renderSourceSet } from './payload.ts';

const cache = new Map<string, ExamBundle>();
// In dev, content is re-read on every request so edits show up on refresh.
const useCache = process.env.NODE_ENV === 'production';

/** Loads an exam for page rendering. Throws if the content has errors. */
export function getExam(examId: string): ExamBundle {
  const cached = useCache && cache.get(examId);
  if (cached) return cached;
  const { bundle, issues } = loadExam(examId);
  const errors = issues.filter((i) => i.level === 'error');
  if (!bundle || errors.length) {
    throw new Error(
      `Content errors in content/${examId} (run "npm run validate" for details):\n` +
        errors.map((e) => `  ${e.file}: ${e.message}`).join('\n'),
    );
  }
  cache.set(examId, bundle);
  return bundle;
}

export function getExams(): ExamBundle[] {
  return listExamIds().map(getExam);
}

/** Full check used by `npm run validate`: schema, references, and rendering of every piece of Markdown. */
export function checkContent(root = CONTENT_ROOT): { exams: ExamBundle[]; issues: Issue[] } {
  const exams: ExamBundle[] = [];
  const issues: Issue[] = [];
  const ids = listExamIds(root);
  if (!ids.length) issues.push({ level: 'error', file: 'content', message: 'no exams found (expected content/<exam>/exam.yaml)' });
  for (const id of ids) {
    const { bundle, issues: found } = loadExam(id, root);
    issues.push(...found);
    if (!bundle) continue;
    exams.push(bundle);
    const rel = (file: string) => path.relative(process.cwd(), file).split(path.sep).join('/');
    const report = (file: string, problems: string[]) =>
      problems.forEach((message) =>
        issues.push({ level: /escape dollar/.test(message) ? 'warning' : 'error', file: rel(file), message }),
      );
    // Only render files that passed validation; broken data can't be rendered safely.
    const broken = new Set(found.filter((i) => i.level === 'error').map((i) => i.file));
    const ok = (file: string) => !broken.has(rel(file));
    for (const q of bundle.questions.values()) if (ok(q.file)) report(q.file, renderQuestion(q).problems);
    for (const p of bundle.passages.values()) if (ok(p.file)) report(p.file, renderPassage(bundle, p.id).problems);
    for (const s of bundle.sources.values()) if (ok(s.file)) report(s.file, renderSourceSet(bundle, s.id).problems);
    for (const n of bundle.notes.values()) if (ok(n.file)) report(n.file, renderDocument(n.body).problems);
  }
  return { exams, issues };
}
