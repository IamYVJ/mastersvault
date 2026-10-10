import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const worker = fs.readFileSync('src/service-worker.js', 'utf8').replace(/\/\/[^\n]*/g, '');

describe('service worker', () => {
  // A beacon answered from the cache records nothing, and a cached count would never change.
  it('does not route or save the page-view counter', () => {
    expect(worker).not.toMatch(/gc\.zgo\.at|goatcounter/);
    expect(worker).toContain('url.origin !== self.location.origin');
  });
});
