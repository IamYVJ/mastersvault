# Roadmap

Decisions (September 2026):
- Astro static site with React islands.
- Fixed-form mocks first, adaptive mocks later.
- Disclaimer-style "no affiliation" wording, with the exam named descriptively.
- Hosted at `iamyvj.github.io/mastersvault`.
- Content under CC BY-NC-SA 4.0 and code under AGPL-3.0.

## Phase 0: Foundation ✅
- [x] Astro 7 + React scaffold, base path for GitHub Pages
- [x] Theme tokens with light and dark mode, site header and footer, disclaimer on every page
- [x] Home, exam hub, mocks and practice listings, revision placeholder, dashboard placeholder
- [x] About, disclaimer, privacy and 404 pages
- [x] GitHub Actions: validate → test → type check → build → deploy
- [ ] Create the GitHub repo, push, and enable Pages (Source: GitHub Actions)

## Phase 1: Content model ✅
- [x] `exam.yaml` format config: sections, timing, rules, topics
- [x] Zod schemas for all 8 question types, passages, source sets, mocks and practice sets
- [x] Loader with cross-reference checks: topics, passages, sources, mock sizes, mock reuse, grouping
- [x] Markdown + KaTeX compilation, with math-error and unescaped-`$` detection
- [x] `npm run validate`, `npm run coverage`, unit tests
- [x] Compiled test payloads at `/data/<exam>/<kind>/<test>.json`
- [x] Question views for all 8 formats (choice, DS, dichotomous grid, dropdowns, two-part, sortable table, SVG charts, MSR tabs)
- [x] Dev-only question bank preview
- [x] 18 sample questions and 3 sampler practice sets (drafts, awaiting review)

## Phase 2: Test engine core
- [ ] Full-screen test player: header (section, timer, question n of N, bookmark), footer (Next)
- [ ] State machine: intro → section order → instructions → section → review & edit → break → … → results
- [ ] Timestamp-based timers that survive tab sleep, auto-submit when time runs out
- [ ] Answer-to-advance and no-back rules, bookmarks, Review & Edit with a 3-change limit
- [ ] Autosave to localStorage, resume after refresh
- [ ] Practice mode: untimed option, back navigation, per-question explanations

## Phase 3: Tools and results
- [ ] On-screen calculator (DI only), whiteboard/scratchpad
- [ ] Results: unofficial scaled-score estimate, accuracy by type/topic/difficulty, timing vs. target
- [ ] Review screen with explanations and "report an issue" links
- [ ] Playwright end-to-end run of a full practice set

## Phase 4: Practice and revision
- [ ] Dashboard with attempt history, trends, export/import as JSON
- [ ] Revision notes (MDX) per topic, formula sheets, strategy guides

## Phase 5: Content build-out
- [ ] Launch: 2 full mocks (128 questions) + 3 practice sets per section (~180 questions), all reviewed
- [ ] Then 5–6 mocks

## Phase 6: Polish
- [ ] Accessibility pass (keyboard-only run of a full mock, screen-reader labels)
- [ ] SEO, social cards, optional offline mode
