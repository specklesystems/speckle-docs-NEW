---
name: docs-page-review
description: >-
  Review a docs page against the Speckle authoring rules before a human
  reviews it. Use after writing, revising, or rewriting any docs page,
  before opening or updating a docs PR, when the user asks for a tone or
  style pass, or when addressing docs review comments. Run it before
  docs-ci-ready: CI green is not review-ready.
argumentHint: '[page path(s); defaults to pages changed on this branch]'
---

# Docs page review

Self-review a page the way the human reviewer will: walk every element
against the checklist and fix what it catches, so the PR review finds
substance instead of tone.

## Scope

- Review the **whole page**, not the diff. A clever heading that predates
  your edit is still your finding.
- **Fix findings in place** and report each fix with its checklist row.
  Exception: when the user asked only for a review, report the findings
  and leave the page unchanged.

## Steps

1. Resolve the pages: $ARGUMENTS, else every `.mdx` changed on this
   branch (`git diff main --name-only -- '*.mdx'`).
2. Read each page top to bottom.
3. Walk the checklist: for each row, inspect **every instance** of the
   element it names on the page (every heading, every aside, every Step,
   every FAQ). Record hits per row.
4. Fix each hit in place, or list it in report-only mode.
5. Report per page: each fix with its checklist row; rows with zero hits
   say so.
6. Run the `docs-ci-ready` skill: the review changed content, so
   formatting and validation need a fresh pass.

Done when every row has been applied to every instance on every page and
zero hits remain.

## Checklist

Each row names the element, the target to write toward, and hits from the
human review that created this list (docs-NEW#313).

| Element | Target | Hits seen in review |
| --- | --- | --- |
| Headings | Task or user-facing change, plain: "Finish the objects migration", "Previous web frontend removed", "No other infrastructure" | "Chart defaults that flip on", "Nothing else", "Looking ahead: 2026.9 is a one-way door" |
| Intro | Consequence first, mechanics second: what the reader risks or gains, then how the release does it | Opened with "flips eight Helm chart defaults on" |
| Asides | One idea per Tip/Note/Warning; recovery steps, alternate config, and load caveats each get their own aside | One Warning mixing the skip rule, the viewer symptom, and recovery |
| Steps | Prose only inside `<Step>`; code and commands move to a fenced block or aside adjacent to the Steps | `openssl rand` block inside a Step |
| FAQ | Edge cases only; delete any item that restates the body | Skip-release and additive-migration FAQs repeated the page |
| Vocabulary | Plain verbs and phrases: "enable", "complete", "required", "Contact Speckle support"; keep terms that name real chart keys, API fields, or UI labels (`lane` in `bundle_migration.<lane>` stays) | "flip on", "out of the box", "fully drain", "operational centerpiece", "one-way door", "ladder / rung" |
| Enterprise gate | Its own Note with the [License Key](/developers/server/deployment/enterprise-license#license-key) link, separate from any unlisted-page Note | Enterprise and unlisted merged into one Note |
| Internals | Concurrency, memory, retries, and format detail sit in a Tip, off the core flow | Load profile inline in the main procedure |

## Keep the checklist alive

When you address human review comments on a docs PR, match each comment
against the rows above. A recurring class with no row gets exactly one new
row, target phrased first, added to this skill's template at
`<%= skillTemplatePath('docs-page-review') %>` and regenerated with
`pnpm uac generate`, riding the same PR the comments came from.
