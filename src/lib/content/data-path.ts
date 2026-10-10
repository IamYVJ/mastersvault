// Address of a test's packed data file (see src/lib/engine/codec.ts). Build-time only.
//
// The key in the file name is new on every deploy: the build workflow sets DATA_KEY to a random
// value, which is never stored in the repository. Local builds use a fixed key.
const fromEnv = (process.env.DATA_KEY ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

export const DATA_KEY = fromEnv || 'local';

export function dataPath(exam: string, kind: 'mocks' | 'practice', test: string): string {
  return `/data/${exam}/${kind}/${test}.${DATA_KEY}.bin`;
}
