# MastersVault

Free, open-source practice for graduate admissions tests: full-length mocks, section practice and revision notes, on a test screen that works like the real exam's. It's a static site. Nothing runs on a server, and a user's progress stays in their browser.

> GMAT™ is a registered trademark of the Graduate Management Admission Council (GMAC). MastersVault is an independent project and is not affiliated with, endorsed by, or sponsored by GMAC or any other test maker. All questions are original.

**Status:** the GMAT content (8 mocks, 18 practice sets, 19 revision notes) is drafted, and every answer that can be calculated is checked by script. The questions are still marked `draft` until a person has reviewed them.

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
