# Writing content

All exam content lives in `content/<exam>/` as Markdown and YAML files. `npm run validate` checks everything, and the build fails if anything is broken. `npm run dev` then `/mastersvault/preview/` shows every question with its answer, and the page reloads when you save.

```
content/gmat/
  exam.yaml                       sections, timing, rules, topic list
  questions/<section>/<id>.md     one question per file
  passages/<id>.md                Reading Comprehension passages
  sources/<id>.yaml               Multi-Source Reasoning tab sets
  tests/mocks/<id>.yaml           full-length mocks
  tests/practice/<id>.yaml        section practice sets
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

**Practice set** (`tests/practice/quant-algebra-01.yaml`): one section, any number of questions. `timeMinutes` is optional and defaults to the section's pace (for example, 45 min / 21 questions).

```yaml
title: Algebra set 1
section: quant
timeMinutes: 20
questions: [ps-0003, ps-0007, ...]
```

**Building a mock:** mix difficulty roughly evenly across 2–4, with a few 1s and 5s. Spread topics, and put Reading Comprehension passages at varied points in the Verbal section. Run `npm run coverage` to find gaps and unused questions.

## Review checklist

- [ ] Solved it cold, without looking at the answer, and got the keyed answer
- [ ] Exactly one defensible answer, and each distractor is wrong for a nameable reason
- [ ] The stem is unambiguous: units stated, "integer" or "positive" where needed
- [ ] The explanation shows the method, and the verbal explanations cover every choice
- [ ] Difficulty and topics are accurate
- [ ] Renders correctly in the preview, in light and dark mode
- [ ] Original, and not modelled closely on any published question
