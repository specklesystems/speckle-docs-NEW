---
name: sync-bundle-spec-docs
description: >-
  Keep next/developers/object-model/relations.mdx (and future object-model
  pages) aligned with speckle-bundle-spec's generated relation and node-kind
  catalog. Use when speckle-bundle-spec's spec/bundle-spec.sql has changed,
  when asked to update the 2026.9 relations or object-model docs, or to
  check whether those pages are stale against the spec.
argumentHint: '[optional: path to speckle-bundle-spec checkout]'
---

# Sync object-model docs with speckle-bundle-spec

`next/developers/object-model/relations.mdx` hand-documents the live relation
catalog from speckle-bundle-spec's `spec/bundle-spec.sql`, grouped into
sections (Containment and grouping / Connectivity / Materials and appearance /
Instancing) with editorial "Replaces in the Current model" / "When you use it"
prose that has no source in the spec — someone decided that framing by hand.
Nothing enforces that the two stay in sync: the spec can add, retire, or
rename a relation and this page never finds out. That's the same
misalignment problem speckle-bundle-spec's own codegen exists to kill in the
SDKs, just relocated to prose (see `atlas/specs/` if a cross-repo write-up
exists for this).

This skill is the maintenance loop for that page. It does **not** regenerate
the page mechanically — the categorization and "why you'd use this" framing
is real editorial judgment (see `<%= instructionPath('docs-authoring') %>`). It
finds what drifted and drafts the fix in this repo's voice, for a human to
approve.

## Scope boundary

This skill only ever writes to `speckle-docs-NEW`. It never edits anything in
`speckle-bundle-spec` — that repo is the source of truth (root `CLAUDE.md`),
and this is a one-directional read: spec → docs draft.

## 1. Run the mechanical diff

speckle-bundle-spec is a sibling checkout at the atlas root
(`../speckle-bundle-spec` relative to this repo, or the path passed as
`$ARGUMENTS`).

```bash
node scripts/check-bundle-spec-relations.mjs
```

By default this regenerates `speckle-bundle-spec/generated/docs-data.json`
first (`npm run generate` over there — requires the `duckdb` CLI on PATH,
`brew install duckdb`) so drift can't be masked by a stale file. If `duckdb`
isn't available, re-run with `--no-generate` to check whatever was last
generated, or `--bundle-spec <path>` if the sibling checkout is elsewhere.

It only compares relation **names** — every live relation in
`docs-data.json` against every backtick-quoted name in a table row on
`relations.mdx`. It reports two kinds of drift and nothing else:

- **Undocumented**: live in the spec, named nowhere on the page.
- **Stale**: named on the page, no longer in the live set (retired, renamed,
  or a typo).

If that repo isn't checked out next to this one, ask the user for its path
rather than guessing or skipping the sync.

If it reports nothing, stop here — there's nothing to draft.

## 2. Draft additions (undocumented relations)

For each undocumented relation, do not paste `docs-data.json`'s `description`
or `why` field onto the page — that prose is written for spec engineers
reading `bundle-spec.sql`, not for the "user-first, purpose-first, plain
language" reader this repo's docs-authoring rule asks for. Use it only as
background for writing the row yourself.

1. Decide which existing `###` section it belongs to (Containment and
   grouping / Connectivity / Materials and appearance / Instancing), or
   whether it needs a new section. Look at what the relation actually
   connects and why a reader would reach for it — not just its id order in
   the spec.
2. Match that section's existing column shape **exactly**. The four
   sections do not share one schema today (Containment has a "Replaces" and
   a "When you use it" column; Connectivity collapses both into one
   "Meaning" column; Materials and Instancing have only "Replaces"). Don't
   unify them just because the source data is now uniform — that's a
   separate, deliberate editorial call, not a side effect of adding a row.
3. Translate the JSON's `src`/`dst` (raw node namespaces: `object`, `node`,
   `geometry`) into the reader-facing vocabulary the page already uses for
   that kind of endpoint (`grouping container`, `level`, `instance
   placement`, `assembly object`, etc.) — never paste `object → geometry`
   verbatim if the surrounding rows in that section use friendlier terms.
4. Show the drafted row(s) to the user before writing, per this repo's
   existing convention (see the document-dev-speckle-feature skill). Table
   changes here are editorial, not mechanical — get it approved.

## 3. Draft removals (stale relations)

Do not just delete the row. A relation can go stale because it was renamed,
folded into another relation, or genuinely retired — each needs different
handling:

- **Retired with a replacement** (the existing pattern: `IN_NETWORK` /
  `IN_SPACE` collapsed into `IN_SYSTEM`): add or extend a
  `<Accordion title="Why don't I see X on new data?">` entry in the FAQ,
  same shape as the existing one, pointing at the replacement — then remove
  the row from its table. A reader who saw the old name in an older viewer
  build needs the "where did it go" answer, not silence.
- **Renamed**: update the row in place rather than deleting + adding, so
  the section's ordering and framing stay stable.
- **Genuinely gone with nothing replacing it**: confirm with the user before
  removing — check whether it's worth a one-line FAQ note anyway.

## 4. Node kinds (overview.mdx)

`next/developers/object-model/overview.mdx` has no node-kind table yet —
only prose examples ("a level, material, or grouping container"). There's
nothing to mechanically diff there today. When drafting or reviewing that
page, cross-check its prose examples against `docsData.nodeKinds[].name`
so the examples don't cite a retired or renamed kind, but don't add a table
speculatively — that's a separate, deliberate scope decision (see
`<%= instructionPath('docs-authoring') %>`: "`next/` is additive and sparse.
Do not ... backfill 'for completeness.'").

## 5. Apply this repo's standing rules

Any new or edited content on these pages still has to follow the rest of
this repo's authoring rules, in particular:

- `<%= instructionPath('docs-authoring') %>`'s `next/` section: `docs_version:
  '2026.9'`, `product_generation: next`, `contextual.options: []`,
  `<NextPreviewBanner />`, never write "Speckle Next" in reader-facing text,
  never set `noindex: true`.
- `<%= instructionPath('docs-faqs') %>`: atomic Q/A, 1–3 sentences, one edge
  case.
- Mintlify components only (`<Note>`, `<AccordionGroup>`/`<Accordion>`),
  matching what the page already uses.

## 6. Before finishing

- Re-run `node scripts/check-bundle-spec-relations.mjs` — it should report
  no drift.
- Run the standard doc checks before opening a PR: see the docs-ci-ready
  skill (`pnpm check`).
- In the PR description, note the speckle-bundle-spec `schemaVersion` this
  sync was done against (the check script prints it) — that's the version
  these pages are now current with.
