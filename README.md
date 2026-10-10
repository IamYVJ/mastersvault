# MastersVault

Free practice for graduate admissions tests: full-length mocks, section practice and revision notes, on a test screen that works like the real exam's. It's a static site. Nothing runs on a server, and a user's progress stays in their browser.

> GMAT™ is a registered trademark of the Graduate Management Admission Council (GMAC). MastersVault is an independent project and is not affiliated with, endorsed by, or sponsored by GMAC or any other test maker. All questions are original.

**Status:** the GMAT content (8 mocks, 18 practice sets, 19 revision notes) is drafted, and every answer that can be calculated is checked by script. The questions are still marked `draft` until a person has reviewed them.

## Layout

```
content/<exam>/      Questions, passages, sources, tests and notes (kept in a separate repository)
docs/CONTENT.md      How to write and check content
src/lib/content/     Loads, validates and compiles content
src/lib/engine/      Test engine: attempt state, grading, scoring, browser storage
src/components/      Question views, test player, dashboard
src/pages/           Site pages
scripts/             Content validation, coverage and the answer-check runner
tests/, e2e/         Unit tests and browser tests
```

## Content

The questions and notes aren't in this repository, and neither are the scripts that check their answers. They're kept in a separate private repository, and the build workflow checks it out into `content/` with a read-only deploy key (the `CONTENT_DEPLOY_KEY` secret). Locally, the site reads `content/` if that folder exists, and otherwise a checkout named `mastersvault-content` next to this one.

The test data published with the site is packed (compressed, then masked; see `src/lib/engine/codec.ts`), so the files don't open as readable text. That's a deterrent against casual copying and scraping, not security.

## Licences

Copyright © 2026 the MastersVault contributors.

- Code: [AGPL-3.0](LICENSE)
- Questions, passages, explanations and notes: [all rights reserved](LICENSE-CONTENT.md). They're free to use on the site for personal study, and aren't openly licensed.
- Third-party software shipped with the site (Astro, React, KaTeX, IBM Plex Mono) keeps its own licences. The built site lists them at `/licenses.txt`.
