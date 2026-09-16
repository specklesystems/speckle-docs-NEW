---
name: sync-object-model-docs
description: >-
  Keep the next/developers/object-model pages (and next/developers/building-
  integrations/publish.mdx) current against whatever in the stack is
  authoritative for each fact: speckle-bundle-spec's generated catalog for
  relations and node kinds, and atlas/glossary.md plus direct source in
  speckle-sharp-sdk, specklepy, and speckle-server-internal for concepts with
  no generated artifact (Version, Ingestion, the bundle's meta row, SGEO).
  Use when any of those repos changes, when asked to update 2026.9 object-
  model docs, or to check whether those pages are stale.
argumentHint: '[optional: path to the sibling checkout to check, or a concept name]'
---

# Sync object-model docs with the stack

`next/developers/object-model/*` and `next/developers/building-
integrations/publish.mdx` describe the 2026.9 bundle format and publish
flow. Some of what they say comes from a spec-generated catalog and can be
diffed exactly; most of it is a conclusion a person or agent drew from
reading source across several repos, with nothing that re-checks it when
that source moves. This skill is the maintenance loop for both cases.

**Read `known-sources.md` in this skill's directory first.** It's the
running map of which repo owns the ground truth for each concept these
pages cover, and which pages already exist — the single most useful thing
this skill does is stop you from re-deriving a fact (or re-drafting a page)
that's already known and already written. It already lists what replaced
the Commit object (see the false start avoided below).

## Scope boundary

This skill only ever writes to `speckle-docs-NEW`. It never edits
`speckle-bundle-spec`, `speckle-sharp-sdk`, `specklepy`, or
`speckle-server-internal` — those repos are sources of truth (root
`CLAUDE.md`), read from, never written to, by this skill.

## Two tiers of sourcing

**Tier A — a generated catalog exists.** Relations and node kinds come from
speckle-bundle-spec's `generated/docs-data.json`. Diff mechanically; never
hand-judge whether a name is still live.

**Tier B — no generated catalog.** Everything else on these pages (Version/
Ingestion/`meta`, SGEO, future additions) is a conclusion drawn from reading
`atlas/glossary.md` plus the owning repos' actual source. There's no exact
name-set to diff, so the mechanical check here is narrower: has the source
a past conclusion depended on changed at all. That doesn't replace judgment,
it triggers it at the right time instead of never.

## Tier A: relations

```bash
node scripts/check-bundle-spec-relations.mjs
```

By default this regenerates `speckle-bundle-spec/generated/docs-data.json`
first (`npm run generate` over there — requires the `duckdb` CLI on PATH,
`brew install duckdb`). If unavailable, `--no-generate` checks the last
generated file; `--bundle-spec <path>` points at a non-default sibling
checkout.

It compares relation **names** only — every live relation in
`docs-data.json` against every backtick-quoted name in a table row on
`relations.mdx` — and reports:

- **Undocumented**: live in the spec, named nowhere on the page.
- **Stale**: named on the page, no longer live (retired, renamed, or a
  typo).

If it reports nothing, there's nothing to draft for relations.

### Drafting additions

Do not paste `docs-data.json`'s `description`/`why` onto the page — that
prose is written for spec engineers, not the "user-first, purpose-first,
plain language" reader `<%= instructionPath('docs-authoring') %>` asks for.
Use it only as background.

1. Decide which existing `###` section it belongs to (Containment and
   grouping / Connectivity / Materials and appearance / Instancing), or
   whether it needs a new one. Judge by what the relation connects, not its
   id order in the spec.
2. Match that section's existing column shape **exactly** — the four
   sections don't share one schema today (Containment has "Replaces" and
   "When you use it"; Connectivity collapses both into "Meaning"; Materials
   and Instancing have only "Replaces"). Don't unify them as a side effect
   of adding a row; that's a separate, deliberate call.
3. Translate the JSON's raw `src`/`dst` (`object`, `node`, `geometry`) into
   the page's reader-facing vocabulary for that endpoint (`grouping
   container`, `level`, `instance placement`, etc.).
4. Show the drafted row(s) before writing, per this repo's existing
   convention (see the document-dev-speckle-feature skill).

### Drafting removals

Don't just delete the row:

- **Retired with a replacement** (the `IN_NETWORK`/`IN_SPACE` →
  `IN_SYSTEM` pattern): add or extend a `<Accordion title="Why don't I see
  X on new data?">` FAQ entry pointing at the replacement, then remove the
  row.
- **Renamed**: update in place, don't delete-and-re-add.
- **Genuinely gone**: confirm with the user before removing.

### Node kinds

`overview.mdx` has no node-kind table — only prose examples. Cross-check
those examples against `docsData.nodeKinds[].name` so they don't cite a
retired or renamed kind, but don't add a table speculatively (`next/` is
additive and sparse — `<%= instructionPath('docs-authoring') %>`).

## Tier A: terminology

```bash
node scripts/check-object-model-terms.mjs
```

Parses `atlas/glossary.md`'s `**term** (was: *legacy*)` rows and flags any
`next/*.mdx` page using a legacy term in prose (code spans excluded).
Informational, not blocking — a legacy term named for reader comparison
("historically called the commit object") is correct, not a hit to fix.
Judge each one; don't bulk-replace.

## Tier B: concepts with no generated catalog

```bash
node scripts/check-object-model-freshness.mjs
```

Re-hashes every source file pinned in `scripts/object-model-freshness-
manifest.json` (in sibling checkouts) and reports which changed since the
manifest entry's `verifiedAt`. A changed source is not proof the docs are
wrong — it's a prompt to re-run the research pass below and confirm.

### The research pass

1. Check `known-sources.md` first — the concept's sources, and whether a
   page already exists, may already be recorded. (Skipping this step is
   how you end up drafting a page that's already written — see the note
   below.)
2. Read `atlas/glossary.md` for canonical terms and renames relevant to the
   concept.
3. Read the actual current implementation in the owning repo(s) —
   typically `speckle-bundle-spec` for format/shape, `speckle-sharp-sdk` +
   `specklepy` for the SDK surface, `speckle-server-internal` for the
   GraphQL/REST contract.
4. Confirm the fact holds across every SDK the docs claim it for (.NET and
   Python at minimum) before writing anything — don't generalize from one
   language's source.
5. Draft the change to the actual page, in this repo's voice (see the
   relations rules above for the general discipline: translate implementer
   vocabulary into reader vocabulary, don't paste source comments as prose).
   Show it before writing.
6. **Always update `scripts/object-model-freshness-manifest.json`** with
   the source paths + current sha256 + today's date, and **always update
   `known-sources.md`** with what you found in prose. Do both — the
   manifest without the prose is unreadable hashes later; the prose
   without the manifest never gets mechanically re-checked.

### A concrete false start, so it isn't repeated

"What replaced the Commit object" was worked through as if it needed a new
page. It doesn't: `next/developers/object-model/version-metadata.mdx` and
`next/developers/building-integrations/publish.mdx` already cover it in
full, in more depth than the research pass initially reproduced (REST
error codes, the `version_created` event). The freshness manifest now
tracks both pages' SDK/spec-side claims — but the pages' server-side
claims (error codes, GraphQL mutation shapes, the event name) are **not**
independently verified against `speckle-server-internal` yet. That's a
known, recorded gap in `known-sources.md`, not a silent one.

## Apply this repo's standing rules

Any content change on these pages still follows:

- `<%= instructionPath('docs-authoring') %>`'s `next/` section:
  `docs_version: '2026.9'`, `product_generation: next`, `contextual.options:
  []`, `<NextPreviewBanner />`, never "Speckle Next" in reader-facing text,
  never `noindex: true`.
- `<%= instructionPath('docs-faqs') %>`: atomic Q/A, 1–3 sentences, one
  edge case.
- Mintlify components only, matching what the page already uses.

## Before finishing

- Re-run whichever of the three scripts above are relevant — they should
  report no drift.
- Run the standard doc checks: see the docs-ci-ready skill (`pnpm check`).
- In the PR description, note what was checked (relations against which
  speckle-bundle-spec `schemaVersion`; which Tier B sources were
  re-verified) — that's the record of what these pages are now current
  with.
