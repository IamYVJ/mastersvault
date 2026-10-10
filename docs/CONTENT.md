# Writing content

All exam content lives in `content/<exam>/` as Markdown and YAML files. The content is kept in its own repository: clone it into `content/`, or next to this project as `mastersvault-content`. `npm run validate` checks everything, and the build fails if anything is broken. `npm run dev` then `/mastersvault/preview/` shows every question with its answer, and the page reloads when you save.

```
content/gmat/
  exam.yaml                       sections, timing, rules, topic list
  questions/<section>/<id>.md     one question per file
  passages/<id>.md                Reading Comprehension passages
  sources/<id>.yaml               Multi-Source Reasoning tab sets
  tests/mocks/<id>.yaml           full-length mocks
  tests/practice/<id>.yaml        section practice sets
  revision/<section>/<slug>.md    revision notes (revision/general/ for whole-exam notes)
```

## Ground rules

1. **Every question is original.** Don't copy, adapt or paraphrase official questions (official guides, official practice exams) or other prep providers' material. `origin: original` is required, and it's your assertion that this is true.
2. **One defensible answer.** Every wrong choice must be clearly wrong for a reason you can state in the explanation.
3. **Explain every choice** for verbal questions, and give the method plus any trap for quant and DI.
4. New questions start as `status: draft`. A second person solves each one cold, then checks the answer and explanation, and only then sets `status: reviewed`.

## Question files

The file name is the question id and must start with the type prefix: `ps-`, `cr-`, `rc-`, `ds-`, `msr-`, `ta-`, `gi-` or `tpa-`, followed by a number (`ps-0042.md`). The folder is the section id from `exam.yaml`.

Every question has YAML front matter, then the **stem**, then a `## Explanation` heading, then the explanation:

```markdown
---
type: problem-solving
difficulty: 3              # 1 (easiest) to 5 (hardest)
topics: [percents]         # ids from the section's topics in exam.yaml
targetSeconds: 120         # optional; expected solve time, default 120
origin: original
status: draft              # draft | reviewed
notes: Optional reviewer notes (never shown on the site)
choices: ["90%", "92%", "95%", "98%", "100%"]
answer: A
---

The question stem, in Markdown.

## Explanation

The worked solution, in Markdown.
```

### Type-specific fields

**Problem Solving** (`problem-solving`) and **Critical Reasoning** (`critical-reasoning`): exactly five `choices` and an `answer` letter from A to E. For CR, put the argument and the question prompt in the stem.

**Reading Comprehension** (`reading-comprehension`): the same as above, plus `passage: rc-p001`, which points to `passages/rc-p001.md`. The passage file has front matter (`title`, `status`) and the passage text as its body. Questions that share a passage must sit next to each other in a test.

**Data Sufficiency** (`data-sufficiency`): the stem is the question. Add two `statements` and an `answer` from A to E. The five standard answer choices are added automatically.

```yaml
statements:
  - "$n$ is divisible by 3."
  - "$n^2$ is divisible by 4."
answer: C
```

**Multi-Source Reasoning** (`multi-source-reasoning`): `source: msr-s001` points to `sources/msr-s001.yaml`. Set `format: mcq` (with `choices` and `answer`) or `format: dichotomous` (with `labels` and `statements`, as in Table Analysis below). A source set has one to three tabs, and each has a `title` and a Markdown `body` (GFM tables are allowed), an optional `chart`, or both.

**Table Analysis** (`table-analysis`): a sortable table plus statements, each answered with one of two labels.

```yaml
table:
  caption: Sales by product line
  columns:
    - { label: Product line }                              # text column
    - { label: "Revenue ($ thousands)", type: number }     # sorts numerically
    - { label: Return rate, type: number, suffix: "%" }    # prefix/suffix only affect display
  rows:
    - [Apparel, "1,890", 8.5]                              # commas are fine in number cells
labels: ["True", "False"]        # or ["Yes", "No"], ["Consistent", "Inconsistent"], ...
statements:
  - { text: "Statement one.", answer: "True" }
```

**Graphics Interpretation** (`graphics-interpretation`): a `chart` plus one to three statements. Each statement contains exactly one `___` blank, which becomes a drop-down. Options are plain text, and the answer must match one option exactly.

```yaml
chart:
  kind: bar                 # bar | line | scatter
  title: Subscribers by plan
  categories: [Jan, Feb, Mar]
  x: { label: Month }
  y: { label: Subscribers (thousands), min: 0, max: 70, step: 5, suffix: "" }
  series:
    - { name: Basic, values: [40, 45, 45] }
    - { name: Premium, values: [25, 25, 30] }
# scatter charts use points instead: series: [{ name: A, points: [[1, 2], [3, 4]] }]
statements:
  - text: The number of Basic subscribers increased by ___ .
    options: ["20%", "50%"]
    answer: "50%"
```

Charts deliberately show no data labels. Set `y.step` so that every value a question depends on can be read off a gridline.

**Two-Part Analysis** (`two-part-analysis`): two column headings, a shared list of options, and one answer per column (both can be the same option).

```yaml
columns: ["Fixed fee (\\$)", "Charge per guest (\\$)"]
options: ["40", "50", "57.5", "600", "700", "1,000"]
answer: ["700", "40"]
```

## Math, money and YAML gotchas

- **Math** uses KaTeX: `$x^2$` inline and `$$ ... $$` for display. Use `{,}` for thousands separators inside math: `$48{,}000$`.
- **Dollar amounts** must be escaped as `\$48,000`, or the renderer will treat the text between two dollar signs as math. The validator warns when it spots this.
- **Never put `\$` inside math.** It ends the math early. Write `$54{,}000 \times 0.14 = 7{,}560$, so \$7,560`.
- **YAML quoting:** backslashes are escape characters inside `"double quotes"`, so `"\frac"` breaks. For values containing LaTeX or `\$`, use `'single quotes'` (or plain unquoted text): `- '$\frac{10}{3}$'`, `- '\$6,360'`.
- **Numbers** are kept exactly as written. `1.50` stays `1.50`, but quote anything that could be misread, such as `"007"`. Chart values must be plain numbers without commas.

## Tests

**Mock** (`tests/mocks/01.yaml`): every section, with exactly the number of questions `exam.yaml` requires, in delivery order.

```yaml
title: Mock Test 1
description: Optional one-liner.
sections:
  quant: [ps-0001, ps-0002, ...]          # 21
  verbal: [cr-0001, rc-0001, rc-0002, ...] # 23
  data-insights: [ds-0001, ...]            # 20
```

A question may appear in only one mock. Reusing a mock question in a practice set produces a warning, because the test taker will have seen it.

**Practice set** (`tests/practice/quant-algebra-01.yaml`): one section, any number of questions. `timeMinutes` is optional and defaults to the section's pace (for example, 45 min / 21 questions). `order` sets the position in the section's list (lowest first, default 100).

```yaml
title: Algebra set 1
section: quant
timeMinutes: 20
order: 2
questions: [ps-0003, ps-0007, ...]
```

### The mock recipe

Mocks 1–8 all follow the same recipe, so that scores are comparable from one mock to the next. A new mock should match it.

| Section | Questions | Difficulty 1 | 2 | 3 | 4 | 5 |
|---|---|---:|---:|---:|---:|---:|
| Quant (21) | 21 Problem Solving, with every one of the 14 topics at least once | 2 | 4–5 | 7–8 | 5 | 2 |
| Verbal (23) | 10 Critical Reasoning + 13 Reading Comprehension | 0 | 4 | 8–9 | 8–9 | 2 |
| Data Insights (20) | 7 Data Sufficiency, 3 Multi-Source, 3 Table, 3 Graphics, 4 Two-Part | 0 | 1 | 9–10 | 7–8 | 2 |

- **Quant:** start with easier questions and end with harder ones, but don't sort strictly by difficulty.
- **Verbal:** the 10 Critical Reasoning questions cover all 8 argument tasks (two tasks appear twice). The 13 Reading Comprehension questions sit on 4 new passages, three with 3 questions and one with 4. Alternate blocks: one to three Critical Reasoning questions, then a passage.
- **Data Insights:** the 3 Multi-Source questions share one new source set and sit together in positions 7–9. One of the 4 Two-Part questions is verbal (logic), not numerical. The usual order of types is DS, TA, GI, DS, TPA, DS, MSR ×3, GI, DS, TPA, TA, DS, TPA, GI, DS, TA, TPA, DS.
- **Answer letters:** in Quant and Verbal each of A–E is the answer 4 or 5 times. Across the Data Sufficiency and multiple-choice Multi-Source questions, no letter is the answer more than 3 times.
- **No reuse:** every question, passage and source set in a mock is new, and appears in no other mock or practice set.

Check a finished mock with `npm run verify -- --balance`, which prints each section's answer-letter and difficulty counts, and run `npm run coverage` to find topic gaps and unused questions. The answer checks that `npm run verify` runs are kept with the content, in `<exam>/verify/`; add a check there for every new question whose answer can be calculated.

### Practice set levels

Besides the samplers and the topic sets, each section has a **Foundation** set (difficulty 1–2, for building accuracy before speed) and a **Challenge** set (difficulty 4–5). Their questions aren't used in any mock.

## Revision notes

A note is a Markdown file in `revision/<section>/` (or `revision/general/` for advice about the whole exam). The file name becomes the URL: `revision/quant/percents.md` is served at `/gmat/revision/quant/percents/`.

```markdown
---
title: Percents
summary: One sentence shown on the revision index and in search results.
kind: topic                    # topic | formulas | strategy
topics: [percents]             # topic ids from exam.yaml (required for kind: topic)
questionTypes: []              # e.g. [data-sufficiency] for a strategy guide
order: 10                      # position within the section, lowest first
status: draft                  # draft | reviewed
---

## First heading

Body in Markdown, with the same maths, money and YAML rules as questions.
```

- **Topics and question types link things together.** The revision index links each topic to its note, the dashboard's "Where to focus" table links weak topics to their notes, and each note lists the practice sets with matching questions.
- Use `##` headings. Notes with three or more of them get an "On this page" contents list.
- A `> **Tip:** …` blockquote renders as a highlighted callout.
- `npm run coverage` shows which topics still have no note.

## Review checklist

- [ ] Solved it cold, without looking at the answer, and got the keyed answer
- [ ] Exactly one defensible answer, and each distractor is wrong for a nameable reason
- [ ] The stem is unambiguous: units stated, "integer" or "positive" where needed
- [ ] The explanation shows the method, and the verbal explanations cover every choice
- [ ] Difficulty and topics are accurate
- [ ] Renders correctly in the preview, in light and dark mode
- [ ] Original, and not modelled closely on any published question
