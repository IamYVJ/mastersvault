// A short dev-only "mock" assembled from the practice sets, so the mock flow
// (section order, break, review & edit limits) can be tried before real mocks exist.
import type { ExamBundle, TestDef } from './load.ts';

export const DEMO_MOCK_ID = 'demo-mock';

export function demoMock(bundle: ExamBundle): TestDef {
  const sections = bundle.config.sections
    .map((s) => ({
      id: s.id,
      questions: bundle.practice.filter((t) => t.sections[0].id === s.id).flatMap((t) => t.sections[0].questions),
      timeMinutes: 6,
    }))
    .filter((s) => s.questions.length > 0);
  return {
    id: DEMO_MOCK_ID,
    kind: 'mock',
    file: '',
    title: 'Demo mock (dev only)',
    description: 'Every practice question arranged as a short mock with 6-minute sections.',
    sections,
  };
}
