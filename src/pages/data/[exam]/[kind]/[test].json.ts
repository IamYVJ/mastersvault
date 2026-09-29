// Compiled test payloads, fetched by the test player at /data/<exam>/<mocks|practice>/<test>.json
import type { APIRoute } from 'astro';
import { buildTestPayload, getExam, listExamIds } from '../../../../lib/content/index.ts';

export function getStaticPaths() {
  return listExamIds().flatMap((exam) => {
    const bundle = getExam(exam);
    return [
      ...bundle.mocks.map((t) => ({ params: { exam, kind: 'mocks', test: t.id } })),
      ...bundle.practice.map((t) => ({ params: { exam, kind: 'practice', test: t.id } })),
    ];
  });
}

export const GET: APIRoute = ({ params }) => {
  const bundle = getExam(params.exam!);
  const tests = params.kind === 'mocks' ? bundle.mocks : bundle.practice;
  const test = tests.find((t) => t.id === params.test)!;
  return new Response(JSON.stringify(buildTestPayload(bundle, test)), {
    headers: { 'Content-Type': 'application/json' },
  });
};
