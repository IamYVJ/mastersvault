// Dev only: payload for the demo mock.
import type { APIRoute } from 'astro';
import { buildTestPayload, getExam, listExamIds } from '../../../lib/content/index.ts';
import { demoMock } from '../../../lib/content/demo.ts';

export function getStaticPaths() {
  return import.meta.env.DEV ? listExamIds().map((exam) => ({ params: { exam } })) : [];
}

export const GET: APIRoute = ({ params }) => {
  const bundle = getExam(params.exam!);
  return new Response(JSON.stringify(buildTestPayload(bundle, demoMock(bundle))), {
    headers: { 'Content-Type': 'application/json' },
  });
};
