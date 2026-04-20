<!-- markdownlint-disable MD013 -->

# Spanish (`es`) translation workflow (draft)

This repo currently ships **English-only** navigation via `navigation.dropdowns` in
`docs.json`. Mintlify multi-language sites use **`navigation.languages`**, where each
entry has a `language` code and a **full navigation tree** for that locale. See
[Mintlify internationalization](https://www.mintlify.com/docs/guides/internationalization).

## Secrets (GitHub Actions)

Create a repository secret:

| Name                             | Value                                      |
| -------------------------------- | ------------------------------------------ |
| `GOOGLE_CLOUD_TRANSLATE_API_KEY` | Translation API v2 key (GCP, with billing) |

Enable **Cloud Translation API** on the GCP project. This workflow uses the official
[Translate v2 REST endpoint](https://cloud.google.com/translate/docs/reference/rest/v2/translate),
not unofficial scrapers.

## Run the workflow (GitHub Actions)

### When a PR merges into `main`

The workflow **Translate docs to Spanish (draft)** also runs on `pull_request` `closed`
when the PR was **merged** and the base branch is **`main`**. It:

1. Checks out the **merge commit**.
2. Lists paths **added** in that merge only (`git diff --diff-filter=A` against the
   merge commit’s **first parent**). That matches **new** `.mdx` files for both normal
   and **squash** merges.
3. Ignores paths under `es/` and non-`.mdx` files.
4. If there is at least one new English page, runs the translate script and opens a
   follow-up PR from branch `i18n/es-auto-pr-<number>`.

If the merge only changed existing files or has no new English MDX, the job skips
translation and does not open a PR.

To use a different default branch, change the `base.ref == 'main'` condition in
`.github/workflows/translate-docs-es.yml`.

### Manual run

1. Add at least one translated file under `es/` (same path as English, e.g.
   `es/beta/new-frontend-beta.mdx`), or run the workflow with a pilot path so the PR is
   not empty.
2. **Actions → Translate docs to Spanish (draft) → Run workflow**
3. Pass **paths** as space-separated Mint paths **without** `.mdx`, e.g.
   `beta/new-frontend-beta quickstart/welcome`.

Local equivalent:

```bash
export GOOGLE_CLOUD_TRANSLATE_API_KEY="…"
node scripts/translate-mdx-to-es.mjs beta/new-frontend-beta
```

With pnpm, pass page paths **without** a `--` separator (pnpm forwards `--` to the script):

```bash
pnpm translate:es beta/new-frontend-beta
```

The script also loads **repo-root `.env`** into `process.env` for keys that are not
already set, so the variable name in `.env` must be exactly
`GOOGLE_CLOUD_TRANSLATE_API_KEY`.

Machine output is a **draft**; review for Latin American Spanish, glossary terms, and
broken MDX.

### Do-not-translate terms (`scripts/do-not-translate-terms.json`)

The translate script replaces each listed phrase with a placeholder before calling the
API, then restores the **original English** after translation. Longer phrases win over
shorter ones (for example **Tekla Structures** before **Tekla**). Edit the JSON
**`terms`** array to add product names, stack tokens, or other strings that should stay
in English in body copy, frontmatter, `title` / `alt` attributes, and `<code>` blocks.

### Snippets (`snippets/**/*.mdx`)

Shared Mint snippets live under **`snippets/`** (English). Spanish copies live under
**`snippets/es/`** with the **same path after `es/`** (for example `snippets/versions.mdx`
→ `snippets/es/versions.mdx`). Imports in Spanish pages use absolute paths
**`/snippets/es/...`**. Translate with the same script:

```bash
pnpm translate:es snippets/versions snippets/connectors/setup
```

After adding or updating Spanish snippets, normalize imports in **`es/**/*.mdx`** (only
**`.mdx`**; keep **`/snippets/components/*.jsx`** on **`/snippets/components/...`**):

```bash
pnpm docs:rewrite-es-snippet-imports -- --write
```

Single-tag wrappers such as `<Info>` are not always fully machine-translated; spot-check
**`snippets/es/versions.mdx`** and similar, then use the **`post-translation-docs-es`**
skill if needed.

For assistant-led **post-translation normalisation** (corrective Spanish edit, same
meaning, product tone, MDX structure preserved), use the **`post-translation-docs-es`**
skill template in **`.universal-ai-config/skills/post-translation-docs-es/`** (run
`pnpm uac generate` so Cursor/Claude pick up the skill).

## Hoist `docs.json` to `navigation.languages`

Repo scripts (run from repo root):

| Command | Purpose |
| ------- | ------- |
| `pnpm docs:hoist-languages` | Replace `navigation.dropdowns` with `navigation.languages` (`en` + `es`), prefixing every MDX page id in the Spanish tree with `es/`. |
| `pnpm docs:ensure-es-stubs` | For each `es/…` page in Spanish navigation, copy the English `….mdx` to `es/….mdx` when missing (placeholder until translated). |
| `pnpm docs:reindent-accordions -- --write` | Normalise markdown-heavy bodies inside `<AccordionGroup>` / `<Accordion>` and `<Steps>` / `<Step>` in `es/**/*.mdx` (fixes MDX parse errors when list markers sit too far left). Dry-run: omit `--write`. |
| `pnpm docs:rewrite-es-snippet-imports -- --write` | In `es/**/*.mdx`, set snippet imports to **`/snippets/es/….mdx`** (from `../snippets/` or `/snippets/` English paths). Does **not** rewrite `.jsx` imports. |

After hoisting, run `pnpm docs:ensure-es-stubs` once so Mintlify validation does not report hundreds of missing `es/` files.

### Target shape

- **English** stays the default (first `languages` entry, or `default: true` on `en`).
- English page paths stay as today (`quickstart/welcome`, no `en/` prefix), matching
  [Mintlify’s file layout](https://www.mintlify.com/docs/guides/internationalization).
- **Spanish** second entry: `language`: `es`, same `dropdowns` / `tabs` / `groups`
  nesting as English, but every **MDX page** string gains an `es/` prefix (e.g.
  `es/quickstart/welcome`).

### What not to prefix

Some `pages` entries are not MDX routes, for example OpenAPI operation labels like
`"POST /graphql"`. Leave those unchanged in both languages unless you maintain
separate OpenAPI copies per locale.

### Migration steps (outline)

1. Duplicate the current `navigation` object into a variable or file fragment: call it
   `navEn`.
2. Build `navEs` by deep-cloning `navEn` and transforming every `pages` array
   (including nested `group.pages`) so each string `foo/bar` becomes `es/foo/bar`,
   **except** strings you classify as non-MDX (OpenAPI lines, bare URLs if any).
3. Replace top-level `"navigation": { "dropdowns": … }` with:

```json
{
  "navigation": {
    "languages": [
      {
        "language": "en",
        "dropdowns": []
      },
      {
        "language": "es",
        "dropdowns": []
      }
    ]
  }
}
```

Then:

- Paste `navEn` into the first `dropdowns`, `navEs` into the second.
- Optional: per-locale `navbar` / `footer` inside each language object for translated
  labels (Mintlify supports this on `languages` entries).
- Until every English page exists under `es/`, either omit untranslated pages from the
  Spanish tree or keep a small **pilot** Spanish section to avoid broken links.

## Order of operations

1. Pilot `es/` content and verify build.
2. Hoist `docs.json` to `navigation.languages` with a **subset** of Spanish pages if
   needed.
3. Expand `es/` coverage and duplicate nav paths incrementally.
