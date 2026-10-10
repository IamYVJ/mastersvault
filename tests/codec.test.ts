import { describe, expect, it } from 'vitest';
import { buildTestPayload, getExam } from '../src/lib/content/index.ts';
import { packPayload, unpackPayload } from '../src/lib/engine/codec.ts';

const exam = getExam('gmat');
const payload = buildTestPayload(exam, exam.mocks[0]!);

describe('packed test data', () => {
  it('unpacks to exactly what was packed', async () => {
    expect(await unpackPayload(await packPayload(payload))).toEqual(payload);
  });

  it('is smaller than the JSON and not readable as text', async () => {
    const json = JSON.stringify(payload);
    const packed = await packPayload(payload);
    expect(packed.length).toBeLessThan(json.length / 2);

    const text = Buffer.from(packed).toString('latin1');
    for (const word of ['questions', 'explanation', 'answer', Object.keys(payload.questions)[0]!]) expect(text).not.toContain(word);
  });

  it('does not unpack as plain compressed data', async () => {
    const packed = await packPayload(payload);
    const inflate = new Response(new Blob([packed]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer();
    await expect(inflate).rejects.toThrow();
  });
});
