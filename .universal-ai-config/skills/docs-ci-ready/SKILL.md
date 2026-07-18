---
name: docs-ci-ready
description: >-
  Make Speckle docs PR CI-ready. Use when fixing Docs PR checks failures (Prettier,
  markdownlint, mint validate, broken links), before opening or updating a docs PR,
  or when the user asks to make docs CI green / check:changed / format-ready.
argumentHint: '[optional: failing check name or log snippet]'
---

# Docs CI Ready

Get docs package changes green against `.github/workflows/docs-pr-checks.yml`.

Work from the **docs package root** (`speckle-docs-NEW`). Do not edit sibling workspace roots unless the user names them.

## When to run

- Before push / PR update for doc edits
- After CI fails on Format and lint, Mintlify validate, or Broken links
- When user says CI-ready, green checks, or pastes a Docs PR checks log

## Commands (match CI)

Phase 1 jobs are report-only (`continue-on-error`) but still must be fixed for Phase 2. Prefer changed-file scripts for format/lint (full-repo debt is large).

```bash
pnpm check:format-lint:changed   # Prettier + markdownlint on PR diff
pnpm check:validate              # mint validate (full site)
pnpm check:links                 # mint broken-links --check-anchors (full site)
pnpm check:changed               # all three
```

Optional base range (same idea as CI `DIFF_RANGE`):

```bash
pnpm format:check:changed BASE...HEAD
pnpm lint:md:changed BASE...HEAD
```

Fix format:

```bash
pnpm format
# or: pnpm exec prettier --write path/to/file.mdx
```

## Fix order

1. **Validate** (`pnpm valid`) — parse / OpenAPI / nav errors block everything else meaningfully
2. **Prettier** — then re-run validate (format can break MDX; see footguns)
3. **Broken links** (`pnpm check-links`)
4. **Markdownlint** on changed files — Phase 1 may still warn; fix what you touch when cheap

Stop when `pnpm check:changed` is green (or only remaining failures are known Phase 1 markdownlint debt the user accepts).

## Footguns (learned the hard way)

### Prettier + Mintlify JSX after lists

Prettier may indent a closing tag (`</Note>`, `</Tip>`, and similar) when it follows a bullet list. Mintlify then treats the close as inside the list item → **parse error**.

**Fix:** put a short normal paragraph (or other non-list prose) after the list, then the closing tag at column 0. Re-run Prettier and `pnpm valid`. Do not leave an indented close tag as the last child after bullets.

### Broken links in `.universal-ai-config`

UAC templates are not docs pages. Keep them out of the link checker via `.mintignore`:

```text
**/.universal-ai-config/**
```

Inside UAC markdown, do **not** use Markdown links to sibling instruction files. Prefer plain path mentions in backticks (same pattern as SDK persona notes). Mint resolves relative `.md` links as site routes and reports them broken.

### Mintlify validate

- OpenAPI: invalid fields on media types fail validate (keep schemas Mint-compatible)
- Snippet JSX: Mintlify pre-injects React hooks; avoid unused `react` imports; match export style the MDX import expects (named vs default)
- Nav in `docs.json` must point at real pages

### Format / lint scope

- CI format/lint = **changed files only** (`scripts/format-check-changed.sh`, `scripts/lint-md-changed.sh`)
- Do not try to Prettier/markdownlint the whole repo unless the user asks (hundreds of findings)

### Workflow / tooling notes

- Node **22** in CI; `packageManager` in `package.json` pins pnpm — do not also set `version` on `pnpm/action-setup` (hash conflict)
- Checkout needs full history for changed-file diffs (`fetch-depth: 0` in the workflow)

## After UAC template edits

If you change `.universal-ai-config/` templates:

```bash
pnpm uac generate
```

Commit generated outputs only if this repo tracks them. Never hand-edit generated `.cursor/` / `.claude/` / Copilot files as the source of truth.

## Done criteria

- `pnpm check:validate` succeeds
- `pnpm check:links` succeeds
- `pnpm format:check:changed` succeeds for the PR range
- markdownlint on changed files: fixed or explicitly left as known Phase 1 debt

Report which commands passed and any remaining intentional debt.
