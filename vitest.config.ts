import { defineConfig } from 'vitest/config';

// Unit tests only; end-to-end tests in e2e/ run with Playwright.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // Checking all the content takes longer than the 5 s default.
    testTimeout: 300_000,
  },
});
