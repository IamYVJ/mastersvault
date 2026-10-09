# MastersVault

Free, open-source practice for graduate admissions tests: full-length mocks, section practice and revision notes, on a test screen that works like the real exam's. It's a static site. Nothing runs on a server, and a user's progress stays in their browser.

> GMAT™ is a registered trademark of the Graduate Management Admission Council (GMAC). MastersVault is an independent project and is not affiliated with, endorsed by, or sponsored by GMAC or any other test maker. All questions are original.

**Status:** the GMAT content (6 mocks, 12 practice sets, 19 revision notes) is drafted, and every answer that can be calculated is checked by script. The questions are still marked `draft` until a person has reviewed them.

## Running it

Requires Node 22.18 or later (see `.node-version`).

```bash
npm install
npm run dev          # http://localhost:4321/mastersvault/
```

| Command | What it does |
|---|---|
| `npm run dev` | Dev server. It also serves a question bank preview at `/mastersvault/preview/`, for reviewing content. |
| `npm run build` | Production build to `dist/`. |
| `npm run validate` | Checks all content: schemas, references, mock composition, math rendering. |
| `npm run verify` | Recomputes every calculable answer by brute force and compares it with the answer key. |
| `npm run coverage` | Question counts by section, type, difficulty and topic. |
| `npm test` | Unit tests. |
| `npm run test:e2e` | Builds the site and runs the browser tests (full test runs, accessibility, keyboard, offline). Run `npx playwright install chromium` once first, or set `PW_CHANNEL=chrome` to use an installed browser. |
| `npm run check` | Type check. |

## Layout

```
content/<exam>/      Questions, passages, sources, tests and notes, as Markdown and YAML
docs/CONTENT.md      How to write and check content
src/lib/content/     Loads, validates and compiles content
src/lib/engine/      Test engine: attempt state, grading, scoring, browser storage
src/components/      Question views, test player, dashboard
src/pages/           Site pages
scripts/             Content validation, coverage and answer checks
tests/, e2e/         Unit tests and browser tests
```

## Licences

Copyright © 2026 the MastersVault contributors.

- Code: [AGPL-3.0](LICENSE)
- Questions, passages, explanations and notes in `content/`: [CC BY-NC-SA 4.0](content/LICENSE.md)
- Third-party software shipped with the site (Astro, React, KaTeX, IBM Plex Mono) keeps its own licences. The built site lists them at `/licenses.txt`.
