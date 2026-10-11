---
name: sync-object-model-docs
description: >-
  Object-model doc drift: sync next/developers/object-model/* and
  building-integrations/publish.mdx with the stack. Use when asked to update
  or stale-check the 2026.9 object-model docs, or to document a new relation.
argument-hint: '[optional: concept name, e.g. relations, SGEO, ingestion]'
---

# Sync object-model docs with the stack

Every fact on these pages has one of two sources:

- **Diffable**: relation and node-kind names in the `rel_types` and
  `node_kinds` tables of `speckle-bundle-spec/spec/bundle-spec.sql`, renamed
  terms in `atlas/glossary.md`. Trust the diff over your reading of the page.
- **Read from source**: everything else (Version, Ingestion, the bundle's
  `meta` row, SGEO) is a conclusion drawn from sibling-repo source, and
  `known-sources.md` in this folder is the registry of where each came
  from. Read the concept's section there before reading any source: the
  fact, and the page, may already exist.

The scripts read sibling checkouts through the speckle-atlas root
(`$ATLAS_ROOT`, default `..`) and write nothing outside this repo. The
relations and freshness checks read `origin/main`, not the checked-out
branch: fetch the sibling first.

Given a concept as argument, run only the step that owns it (relations →
step 1, a term → step 2, anything else → step 3).

## 1. Relations

```bash
pnpm check:bundle-spec               # the spec at origin/main (needs the duckdb CLI)
pnpm check:bundle-spec --ref 1.4.1   # the spec at a release tag or branch
```

The first line names the `schema_version` checked and whether that spec is
released. Document released relations only: when it says unreleased, re-run
with `--ref` at the latest tag. Exit 1 lists relations **undocumented** on
`relations.mdx` and names on the page that are **stale**. Draft every listed
row or removal with [`relations.md`](relations.md). Done when the check
exits 0.

## 2. Terminology

```bash
pnpm report:object-model-terms
```

Lists every `next/` prose line using a legacy glossary term. For each hit
under `object-model/` or in `publish.mdx`: fix it when the legacy term
stands in for the 2026.9 concept; leave it when it names what the reader
migrates from ("historically called the commit object"). Done when every
such hit is fixed or classified as a comparison.

## 3. Concepts read from source

```bash
pnpm check:object-model-freshness
```

Exit 1 lists pinned sources whose content moved since `verifiedAt`. A moved
source means the conclusion needs re-checking, not that the page is wrong.
For each STALE entry:

1. Read the concept's section in `known-sources.md`.
2. Read `atlas/glossary.md` for the canonical terms involved.
3. Read the current source in the owning repos: `speckle-bundle-spec` for
   format and shape, `speckle-sharp-sdk` and `specklepy` for the SDK
   surface, `speckle-server-internal` for the GraphQL/REST contract. A
   claim made for "the SDKs" holds only when both .NET and Python source
   agree.
4. Draft the page change in reader vocabulary (translate implementer names;
   source comments are background) and show it before writing.
5. Re-pin the entry in `scripts/object-model-freshness-manifest.json`
   (every source path, its current sha256 from `git show origin/main:<path>`,
   today's `verifiedAt`) and record what you found in `known-sources.md`.
   Both, always: the manifest is unreadable without the prose, the prose is
   never re-checked without the manifest.

Done when the check exits 0 and every moved source has a re-verified
conclusion on the page.

## Before finishing

- Run [`docs-page-review`](../docs-page-review/SKILL.md) on each edited
  page, then [`docs-ci-ready`](../docs-ci-ready/SKILL.md).
- In the PR description, record the speckle-bundle-spec `schema_version`
  and commit the relations were checked against (the check's first line) and
  which sources were re-verified.
