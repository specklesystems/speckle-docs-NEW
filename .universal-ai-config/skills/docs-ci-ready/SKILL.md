---
name: docs-ci-ready
description: >-
  Make Speckle docs PR CI-ready. Use when fixing Docs PR checks failures (Prettier,
  markdownlint, mint validate, broken links, a11y), before opening or updating a
  docs PR, or when the user asks to make docs CI green / check:changed / format-ready.
argumentHint: '[optional: failing check name or log snippet]'
---

# Docs CI Ready

Get docs package changes green against `.github/workflows/docs-pr-checks.yml`.

Work from the **docs package root** (`speckle-docs-NEW`). Do not edit sibling workspace roots unless the user names them.

## When to run

- Before push / PR update for doc edits
- After CI fails on Format and lint, Mintlify validate, Broken links, or Accessibility
- When user says CI-ready, green checks, or pastes a Docs PR checks log

## Commands (match CI)

Phase 1 jobs are report-only (`continue-on-error`) but still must be fixed for Phase 2. Prefer changed-file scripts for format/lint (full-repo debt is large).

```bash
pnpm check                       # CI-equivalent (changed format/lint + validate + links + a11y)
pnpm check:format-lint           # Prettier + markdownlint on PR diff only
pnpm check:validate              # mint validate (full site)
pnpm check:links                 # anchors + redirects + snippets (full site)
pnpm check:a11y                  # mint a11y (full site)
```

Do **not** use `pnpm lint:md:all` / `pnpm check:all` for PR readiness — full-repo markdownlint has a large backlog. CI and `pnpm check` only lint **changed** files.

Scheduled only (not PR): `pnpm check-links:external`. Optional `mint score` needs repo var `DOCS_SITE_URL`.

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
3. **Broken links** (`pnpm check-links`) — includes redirects and Snippet links
4. **Markdownlint** on changed files — Phase 1 may still warn; fix what you touch when cheap
5. **a11y** (`pnpm check:a11y`) — fix alts on pages you touch; full-site debt is expected

Stop when `pnpm check:changed` is green (or only remaining failures are known Phase 1 debt the user accepts).

## Footguns (learned the hard way)

### Prettier + Mintlify JSX after lists

Prettier may indent a closing tag (`</Note>`, `</Tip>`, and similar) when it follows a bullet list. Mintlify then treats the close as inside the list item → **parse error**.

**Fix:** put a short normal paragraph (or other non-list prose) after the list, then the closing tag at column 0. Re-run Prettier and `pnpm valid`. Do not leave an indented close tag as the last child after bullets.

### Deep-link anchors Mintlify actually indexes

`mint broken-links --check-anchors` indexes empty fragment targets like `<div id="my-anchor" />` or `<a id="my-anchor"></a>`. It often **misses** the same id on elements that wrap visible text (`<a id="x">label</a>`, `<span id="x">…</span>`, `<h3 id="x">…</h3>`). Prefer empty `<div id="…" />` so links stay green and `mint a11y` does not flag empty `<a>` text.

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
- **Pre-commit:** Husky + `lint-staged` — Prettier write is **blocking**; markdownlint on staged files is **report-only** (`scripts/lint-md-staged.sh`, Phase 1) so large stages are not blocked by backlog MD036/MD001. Not validate/links/a11y. After clone: `pnpm install` → `prepare` → `husky`.

### markdownlint on API / MDX pages

- Do not run `pnpm lint:md:fix` on the whole tree while clearing a PR — scope to changed files
- MD036: a lone bold line like Parameters counts as a fake heading. Prefer a plain label `Parameters:` (not `#### Parameters` under every method — that causes MD022/MD024 noise)
- MD051 often means the target heading was not parsed (common: heading stuck to a closing JSX tag with no blank line). Add the blank line; do not only rewrite the fragment
- Slash in headings (`Detach/Do not detach`) yields fragments without the slash; match that slug or rename the heading
- MD049 (* vs _ emphasis) is disabled in this repo — do not mass-convert emphasis styles

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
- `pnpm check:a11y`: fixed for touched pages or left as known Phase 1 debt

Report which commands passed and any remaining intentional debt.
