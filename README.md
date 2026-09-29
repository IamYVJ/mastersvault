# MastersVault

Free, open-source practice for graduate admissions tests. It has full-length mocks, section practice and revision notes, all on a test screen that works like the real exam's. It's a static site hosted on GitHub Pages.

> GMAT™ is a registered trademark of the Graduate Management Admission Council (GMAC). MastersVault is an independent project and is not affiliated with, endorsed by, or sponsored by GMAC or any other test maker. All questions are original.

## Quick start

Requires Node 22.18+ (Node 24 recommended; see `.node-version`).

```bash
npm install
npm run dev          # http://localhost:4321/mastersvault/
```

| Command | What it does |
|---|---|
| `npm run dev` | Dev server. The question bank preview is at `/mastersvault/preview/` (dev only). |
| `npm run validate` | Checks all content: schemas, references, mock composition, math rendering. |
| `npm run coverage` | Question counts by section, type, difficulty and topic, plus unused questions. |
| `npm test` | Unit tests (grading, content loader, validation rules). |
| `npm run check` | TypeScript and Astro type check. |
| `npm run build` | Production build to `dist/`. |

## How it's organised

```
content/<exam>/          Questions, passages, sources and tests. See docs/CONTENT.md.
src/lib/content/         Loads, validates and compiles content (shared with scripts/)
src/lib/engine/          Response grading (the test engine will live here)
src/components/questions React views for all eight question formats
src/pages/               Site pages. /data/<exam>/<kind>/<test>.json holds compiled test payloads.
scripts/                 validate-content.ts, coverage.ts (run directly by Node)
docs/                    Content authoring guide and roadmap
```

Content is plain Markdown and YAML in git. At build time it's validated and compiled to HTML, with KaTeX for math. Each test becomes a JSON payload that the in-browser test player loads. Nothing runs on a server, and user progress stays in the browser.

## Deploying

`.github/workflows/deploy.yml` validates, tests, type-checks and builds on every push and pull request. Pushes to `main` also deploy to GitHub Pages. One-time setup:

1. Push this repo to GitHub as `IamYVJ/mastersvault`.
2. In **Settings → Pages**, set **Source** to **GitHub Actions**.

The site is served at `https://iamyvj.github.io/mastersvault/`. For a custom domain, change `site` and `base` in `astro.config.mjs`.

## Licences

- Code: [AGPL-3.0](LICENSE)
- Questions, passages, explanations and notes in `content/`: [CC BY-NC-SA 4.0](content/LICENSE.md)
