---
name: translate-docs-es
description: Machine-translate Speckle Mintlify docs to Spanish (es) using repo
  scripts, env setup, and navigation stubs. Use when adding or updating Spanish
  MDX or i18n layout.
argumentHint: "[optional — space-separated Mint page paths without .mdx]"
---

<!-- markdownlint-disable MD013 -->

# Translate Speckle Docs to Spanish (es)

This workflow applies to **this repository** (Mintlify `docs.json`, English MDX at
repo-relative paths, Spanish under `es/`).

## When to Use

- User asks to translate one or more English pages to `es/…`.
- User adds a new English `.mdx` page and needs a matching `es/` file and nav
  awareness.
- User needs a reminder of env vars, `pnpm` commands, or the GitHub Action
  behaviour.

## Source of Truth

Read **`.github/TRANSLATE_ES.md`** for secrets, Mintlify `navigation.languages` rules,
and troubleshooting. Do not duplicate long policy here; link or summarise in one
line.

## Prerequisites

1. **Repository root** — run all commands from the docs repo root (where
   `package.json` and `docs.json` live).
2. **API key** — `GOOGLE_CLOUD_TRANSLATE_API_KEY` in repo-root `.env` (local) or
   environment (CI). The translate script loads `.env` for keys that are not
   already set.
3. **GCP** — Cloud Translation API enabled on the Google Cloud project tied to that
   key.

## Commands (local)

Always use **page paths without** the `.mdx` suffix. Paths mirror Mintlify ids (for
example `quickstart/welcome`, `beta/new-frontend-beta`).

### Translate to `es/`

```bash
pnpm translate:es path/to/page another/page
```

Do **not** pass a bare `--` between `pnpm translate:es` and the paths (pnpm forwards
`--` to Node and breaks path parsing).

### Hoist navigation to `languages` (en + es)

Run only if navigation is not already hoisted; the script refuses when `languages`
already exists.

```bash
pnpm docs:hoist-languages
```

### Stub missing `es/*.mdx` from nav

Copies English MDX into missing `es/` paths for every Spanish nav entry. Run after
hoist or when nav gains new `es/` entries.

```bash
pnpm docs:ensure-es-stubs
```

### Validate

```bash
pnpm valid
```

## Agent Workflow

1. If the user passed **$ARGUMENTS**, split on whitespace into Mint paths (drop
   empty tokens and a lone `--`). If no paths, ask which pages to translate or infer
   from recently edited English `.mdx` files (never treat `es/` sources as English).
2. Confirm **`scripts/translate-mdx-to-es.mjs`** exists. If `docs.json` still uses only
   `navigation.dropdowns` and the user wants Spanish in the site switcher, explain
   that **`pnpm docs:hoist-languages`** must run once first, then
   **`pnpm docs:ensure-es-stubs`**, then translate.
3. Run **`pnpm translate:es …`** for the requested paths. Treat output as **draft**:
   Latin American review, glossary, and MDX or Mint components may still need edits.
   For a structured **post-MT editorial pass** (natural Spanish, terminology, MDX-safe
   copy), use the **`post-translation-docs-es`** skill on English + `es/` pairs.
4. If **`docs.json`** gained new English `pages` entries, remind the user to add the
   matching **`es/…`** entries in the **Spanish** `navigation.languages` tree and to
   translate **dropdown** and **group** labels where appropriate (English nav can stay
   English).
5. Suggest **`pnpm valid`** after substantive MDX or `docs.json` edits. If translated
   pages use list-heavy **`<Steps>` / `<AccordionGroup>`** bodies, suggest
   **`pnpm docs:reindent-accordions -- --write …`** on the same paths.
6. Mention **`.github/workflows/translate-docs-es.yml`**: manual dispatch for explicit
   paths; merged PRs into **`main`** can open a follow-up PR for **newly added**
   English `.mdx` files only (see workflow and `TRANSLATE_ES.md`).

## Guardrails

- Output is **machine translation**, not legal or brand-final copy.
- **`icon`**, **`href`**, and **`cols`** on Mint components must stay machine-stable; the
  script protects `CardGroup` / `Steps` / `AccordionGroup` from the plain-text pass
  and sanitizes common mistranslated prop names on `Card` / `Step` attrs.
- JSX **`title`** and **`alt`** values must stay valid (the script uses HTML entities
  for quotes in attributes). If the API corrupts tag names, the script includes
  post-fixes; unusual Mint components may still need hand fixes.
- **`scripts/do-not-translate-terms.json`** lists English phrases preserved through MT
  (product names, stack terms); extend **`terms`** when navigation or copy should keep
  English (longest matches apply first).
- Do **not** commit or print the contents of **`.env`**.

## Related Files

- `scripts/translate-mdx-to-es.mjs` — MDX body and Mint blocks (`Step`, `Accordion`,
  `Card`, `Note`, etc.).
- `scripts/do-not-translate-terms.json` — glossary of English strings kept through MT.
- `scripts/reindent-accordion-mdx.mjs` — normalise `<Step>` / `<Accordion>` bodies after
  MT (`pnpm docs:reindent-accordions`).
- `scripts/rewrite-es-snippet-imports.mjs` — use **`/snippets/es/…`** for localized
  snippet imports in Spanish pages (`pnpm docs:rewrite-es-snippet-imports`).
- `scripts/hoist-navigation-languages.mjs` — builds `navigation.languages` with `es/`
  page prefixes.
- `scripts/ensure-es-stubs-from-nav.mjs` — copies English MDX into missing `es/`
  paths for nav parity.
