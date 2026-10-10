// Compiled test payloads, fetched by the test player at /data/<exam>/<mocks|practice>/<test>.<key>.bin
// They're packed (see src/lib/engine/codec.ts), so the published files aren't readable as text.
import type { APIRoute } from 'astro';
import { buildTestPayload, getExam, listExamIds } from '../../../../lib/content/index.ts';
import { DATA_KEY } from '../../../../lib/content/data-path.ts';
import { packPayload } from '../../../../lib/engine/codec.ts';

export function getStaticPaths() {
  return listExamIds().flatMap((exam) => {
    const bundle = getExam(exam);
    return (['mocks', 'practice'] as const).flatMap((kind) =>
      bundle[kind].map((t) => ({ params: { exam, kind, test: `${t.id}.${DATA_KEY}` }, props: { id: t.id } })),
    );
  });
}

export const GET: APIRoute = async ({ params, props }) => {
  const bundle = getExam(params.exam!);
  const tests = params.kind === 'mocks' ? bundle.mocks : bundle.practice;
  const test = tests.find((t) => t.id === props.id)!;
  return new Response(await packPayload(buildTestPayload(bundle, test), DATA_KEY), {
    headers: { 'Content-Type': 'application/octet-stream' },
  });
};
