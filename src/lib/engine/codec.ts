// Test data is packed before it's published: compressed, then masked. The files then don't open as
// readable text, and search engines and simple scrapers get nothing useful from them.
//
// This is a deterrent, not security. The site has to unpack the data to show a test, so anyone
// who reads this file can unpack it too.
import type { TestPayload } from '../content/types.ts';

const SEED = 0x6d76a417;

/** XORs the bytes with a fixed pseudo-random stream. Applying it twice gives the original back. */
function mask(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  let s = (SEED ^ bytes.length) | 1;
  const out = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    out[i] = bytes[i]! ^ (s & 0xff);
  }
  return out;
}

async function pipe(bytes: Uint8Array<ArrayBuffer>, through: CompressionStream | DecompressionStream): Promise<Uint8Array<ArrayBuffer>> {
  return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(through)).arrayBuffer());
}

/** Runs at build time. */
export async function packPayload(payload: TestPayload): Promise<Uint8Array<ArrayBuffer>> {
  return mask(await pipe(new TextEncoder().encode(JSON.stringify(payload)), new CompressionStream('deflate-raw')));
}

export async function unpackPayload(bytes: Uint8Array): Promise<TestPayload> {
  if (typeof DecompressionStream === 'undefined') throw new Error('This browser is too old to load tests. Please update it.');
  const json = await pipe(mask(bytes), new DecompressionStream('deflate-raw'));
  return JSON.parse(new TextDecoder().decode(json)) as TestPayload;
}

/** Fetches and unpacks a test from /data/<exam>/<mocks|practice>/<test>.bin */
export async function fetchPayload(url: string): Promise<TestPayload> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return unpackPayload(new Uint8Array(await response.arrayBuffer()));
}
