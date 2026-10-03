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

## Phase 2: Test engine core ✅
- [x] Full-screen test player: header (section, timer with hide toggle, question n of N, bookmark), footer (exit, back/next)
- [x] State machine: setup → section order → instructions → section → review & edit → break → … → results (`src/lib/engine/attempt.ts`)
- [x] Timestamp-based timers that survive tab sleep; 5-minute warning; section ends automatically when time runs out
- [x] Answer-to-advance and no-back rules, bookmarks, Review & Edit with a 3-change limit, one optional break after section 1 or 2
- [x] Autosave to localStorage, resume after refresh or closing (the timer pauses while away), stale attempts discarded when a test's answer keys change
- [x] Practice mode: timed or untimed, back navigation, skip, explanations after each question or at the end
- [x] Basic results: raw score per section, time used, per-question outcome and time, full review with explanations
- [x] Finished attempts saved to a local history (`mv:history`) for the dashboard
- [x] Dev-only demo mock at `/mastersvault/preview/gmat/demo-mock/take/` to try the mock flow before real mocks exist

## Phase 3: Tools and results ✅
- [x] On-screen calculator for sections that allow it (memory, √, %, 1/x, keyboard input), in a movable panel (`src/lib/engine/calculator.ts`)
- [x] Whiteboard (pen, eraser, undo, clear) in every section; tools keep their contents for the whole section
- [x] Unofficial score estimates for mocks: section scores with a likely range and a total, from a difficulty-weighted ability estimate (`src/lib/engine/scoring.ts`)
- [x] Results: pacing chart (time per question vs. target), accuracy by question type, difficulty and topic, slow/rushed flags
- [x] Playwright end-to-end tests against the production build: full practice run, resume after reload, calculator and whiteboard. They run in CI.

## Phase 4: Dashboard and revision ✅
- [x] Dashboard: unfinished attempts with Resume, summary tiles, accuracy-by-section trend chart, weakest topics with links to their notes, full history
- [x] Reopen any past result with the full review (`/dashboard/attempt/?id=…`)
- [x] Export, import and delete progress; imports are validated field by field and never overwrite an unfinished attempt
- [x] Revision notes as Markdown + KaTeX in `content/<exam>/revision/` (plain Markdown instead of MDX, matching the question format), validated like questions
- [x] 11 notes: test-day strategy, Quant formula sheet, percents, number properties, rates and work, statistics, CR and RC strategy, Data Sufficiency, tables/graphs/sources, Two-Part Analysis (drafts, awaiting review)
- [x] Note pages with contents, topic tags, related practice sets and previous/next links; the revision index shows which topics have notes

## Phase 5: Content build-out (in progress)
- [x] Mock 1 drafted: 64 original questions
  - Quant: 21 PS covering all 14 topics
  - Verbal: 10 CR covering every question type, plus 13 RC on 4 new passages
  - Data Insights: 7 DS, 1 MSR set of 3, 3 TA, 3 GI, 4 TPA
  - Every computable answer was re-derived by an independent brute-force script
- [x] Mock 2 drafted: 64 more original questions
  - Same structure as Mock 1, with new scenarios and 4 new passages (population ecology, congestion pricing, shipping containers, serialized novels)
  - All computable answers verified the same way, and the DS checker also confirms no two statements contradict each other
- [ ] Review Mocks 1 and 2 and mark their questions `reviewed`
- [x] 3 practice sets per section: 126 more original questions, none of them in a mock or in another set
  - Quant: arithmetic and number properties, algebra, and word problems/statistics/probability (15 each, easier to harder)
  - Verbal: two critical reasoning sets (15 each, covering all 8 question types) and a reading comprehension set (4 new passages, 14 questions)
  - Data Insights: data sufficiency (15), tables and graphs (5 tables, 5 graphs), and multi-source plus two-part (2 new source sets, one with a chart tab, and 6 two-part questions)
  - Every computable answer was checked by brute-force scripts, including all 15 DS keys
  - Practice sets have an `order` field, and the samplers are listed first
- [ ] Review the practice sets and mark their questions `reviewed`
- [x] Mocks 3 and 4 drafted: 128 more original questions
  - Same structure, difficulty mix and answer-letter balance as Mocks 1 and 2
  - 8 new passages: plate tectonics, airline overbooking, the Hawthorne effect, tempera and oil paint, coral bleaching, too many choices, Carnegie libraries, sign languages
  - 2 new multi-source sets: solar panels for a school district, and a customer-service training plan
  - All computable answers verified. The checks caught two Data Sufficiency questions whose statements contradicted each other, and both were fixed
- [ ] Review Mocks 3 and 4 and mark their questions `reviewed`
- [ ] Notes for the remaining topics (linear equations, inequalities, functions and sequences, most Data Insights topics)
- [ ] Then 5–6 mocks (4 drafted)

## Phase 6: Polish
- [x] Charts are drawn at their container's width, so labels stay readable in narrow multi-source tabs and on phones
- [x] Long test titles are truncated in the player's top bar instead of pushing the tools onto a second row
- [x] Table cells with a typographic minus (−2) sort as numbers
- [ ] Accessibility pass (keyboard-only run of a full mock, screen-reader labels)
- [ ] SEO, social cards, optional offline mode
