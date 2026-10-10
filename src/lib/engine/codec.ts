// Test data is packed before it's published: compressed, then masked. The files then don't open as
// readable text, and search engines and simple scrapers get nothing useful from them.
//
// The mask depends on a key that is part of each file's name (<test>.<key>.bin). The build workflow
// picks a new key on every deploy, so the files and their addresses change each time.
//
// This is a deterrent, not security. The site has to unpack the data to show a test, so anyone
// who reads this file can unpack it too.
import type { TestPayload } from '../content/types.ts';

/** Turns a key into the starting state of the mask. */
function seedFrom(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 0x01000193);
  return h;
}

/** XORs the bytes with a pseudo-random stream. Applying it twice with the same key gives the original back. */
function mask(bytes: Uint8Array, key: string): Uint8Array<ArrayBuffer> {
  let s = (seedFrom(key) ^ bytes.length) | 1;
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
export async function packPayload(payload: TestPayload, key: string): Promise<Uint8Array<ArrayBuffer>> {
  return mask(await pipe(new TextEncoder().encode(JSON.stringify(payload)), new CompressionStream('deflate-raw')), key);
}

export async function unpackPayload(bytes: Uint8Array, key: string): Promise<TestPayload> {
  if (typeof DecompressionStream === 'undefined') throw new Error('This browser is too old to load tests. Please update it.');
  const json = await pipe(mask(bytes, key), new DecompressionStream('deflate-raw'));
  return JSON.parse(new TextDecoder().decode(json)) as TestPayload;
}

/** The address was for an earlier version of the site: the page is out of date and needs reloading. */
export class OutdatedPageError extends Error {}

/** Fetches and unpacks a test from /data/<exam>/<mocks|practice>/<test>.<key>.bin */
export async function fetchPayload(url: string): Promise<TestPayload> {
  const key = /\.([a-z0-9]+)\.bin$/.exec(new URL(url, location.href).pathname)?.[1];
  if (!key) throw new Error('Unexpected test data address');
  const response = await fetch(url);
  if (response.status === 404) throw new OutdatedPageError('The site was updated while this page was open. Reload the page to continue.');
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return unpackPayload(new Uint8Array(await response.arrayBuffer()), key);
}
