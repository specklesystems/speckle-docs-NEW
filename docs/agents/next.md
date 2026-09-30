# 2026.9 pages (`next/`)

Applies to every page under `next/`. The reader-facing naming rules (no "Speckle Next", `2026.9` never `v2026.9`, "Current" is only the selector label) are in `AGENTS.md` and apply here too.

- 2026.9 is a Mintlify **version** (`navigation.versions`: `navigation.json` holds **Current**, `navigation.next.json` holds **2026.9**, the default). It is not a top-level dropdown: never add a 2026.9 item next to User Guides / Developers / IT Administrators.
- Every page under `next/` sets `contextual.options: []`, imports the incremental banner (`snippets/next-preview-banner.mdx`) and carries the 2026.9 frontmatter defined in `FRONTMATTER_SCHEMAS.md`.
- Do **not** set `noindex: true`: 2026.9 is a public version. Do not call it a preview in reader-facing copy.
- **Current** stays the complete corpus for topics without a 2026.9 page. The banner may say "switch to Current" because it names the selector; body copy may not.
- `next/` is additive and sparse. Do not clone or port a main-docs page into `next/` as a starting point.
- A missing `next/` page is expected. Do not backfill "for completeness"; gap analysis is a later, explicit pass.
