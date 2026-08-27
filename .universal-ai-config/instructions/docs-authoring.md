---
description: Speckle docs authoring — user-first approach, Mintlify components, connector structure
alwaysApply: true
---

# Speckle Docs Authoring

This project uses **universal-ai-config** for canonical doc rules. Generated instructions (e.g. docs-general, docs-steps, docs-faqs, docs-asides, docs-titles-nav-seo) are the source of truth. For contributor setup (Mintlify, devcontainer, publishing), see **README.md**.

## Approach to Users

- **User-first, purpose-first**: frame topics by the action (publish, load, share, view), not the plumbing (connectors, integrations).
- **Day-0 success**: shortest path to a visible win; minimal decisions; show outcomes.
- **Brevity with depth**: core pages stay concise; depth lives in FAQs, Best practices, and Tips.
- **Visual clarity**: use screenshots or short clips when they reduce cognitive load; add captions when the image carries meaning.
- **Plain language**: approachable, precise, no jargon; imperative steps.
- **Honest guardrails**: call out limitations, known issues, version differences.
- **Connectors are a subset**: everyone uses the web app; not everyone uses connectors.
- **Developer docs: scripts first**: default SDK/API examples for citizen developers and AEC hackers (standalone scripts, notebooks, small automations). Connector and add-in development is secondary — see **Developer Docs Audience Hierarchy** in `docs-persona-audience.md`.

## Global Authoring Rules

- **Mintlify only**: prefer Mint components over raw HTML/Markdown.
- **Tone**: approachable, precise; short, imperative sentences.
- **Structure**: task-first; show outcomes; keep pages brief.
- **Visuals**: include only when they clarify; add captions or callouts if needed.
- **Extras**: add a compact FAQ, Best practices, and 1–3 Tips where appropriate.
- **Tutorials**: keep tutorials separate; if a flow needs more than 3–5 steps, link out.
- **Cross-link and naming**: cross-link related pages; name sections by user intent.

## Speckle Next (`next/`)

- **Hard rule:** Speckle Next is an internal codename for **2026.9**, one of several. Never write "Speckle Next" (or other internal codenames) in reader-facing docs, nav labels, titles, or banners. The `next/` directory is an internal path only. **2026.9** is the temporary public label. Write it exactly like the SDK and server version: `2026.9`, never `v2026.9`. Same for `2026.8`. It is fine if that string leaks as pages ship. Do not hide it, do not add a "placeholder" disclaimer for readers, and do not invent a marketing name. When product supplies a public name, replace 2026.9 everywhere it appears.
- 2026.9 is a Mintlify **version** (`navigation.versions` in `navigation.json` / `navigation.next.json`), not a top-level dropdown. Do not add a 2026.9 item next to User Guides / Developers / IT Administrators.
- Every page under `next/` sets `noindex: true`, `contextual.options: []`, and the preview banner (`snippets/next-preview-banner.mdx`).
- `next/` is additive and sparse. Do not clone or port a main-docs page into `next/` as a starting point.
- A missing `next/` page is expected. Do not backfill "for completeness." Gap analysis is a later explicit pass.

## Downloadable assets

Mintlify serves only a limited set of file types from the deployed docs site (for example images, `.json`, `.yaml`, `.css`, `.js`, and fonts). It does **not** serve direct downloads for notebooks (`.ipynb`), archives, PDFs on standard plans, and many other asset types.

**Rules:**

- **Never** link downloadable files with relative paths that expect the docs site to serve them (for example `./notebooks/example.ipynb` or `/workflows/notebooks/foo.ipynb`). Those URLs return 404 in production.
- **Always** use a raw GitHub URL to [speckle-docs-new](https://github.com/specklesystems/speckle-docs-new) as the download target.
- Keep the notebook or asset in the repo next to the guide (for example `developers/api/guides/notebooks/`, `workflows/notebooks/`).
- Use this URL pattern:

  `https://raw.githubusercontent.com/specklesystems/speckle-docs-new/refs/heads/main/<path-in-repo>`

**Example** (validation results guide):

```markdown
[Download the notebook](https://raw.githubusercontent.com/specklesystems/speckle-docs-new/refs/heads/main/developers/api/guides/notebooks/data-validation-results.ipynb).
Save the file locally, add your `.env` in the same folder, and run top to bottom.
```

Do not explain the platform limitation to readers unless they hit a broken link during migration. Give a clear download link only.

## Steps (Mintlify)

- Use **`<Steps>` / `<Step>`** for short, linear sequences.
- **Titles**: verb-first, sentence case, about 3–7 words.
- **Content**: 1–3 short sentences or a short ordered list; end with the **outcome**.
- Do **not** nest complex components (Tabs, Accordions, code blocks) inside `<Step>`.
- Put `<Tip>`, `<Note>`, `<Warning>` **adjacent** to the Steps block (not inside).
- **Fallback**: when Steps need rich content, use `###` + ordered list instead of `<Steps>`.

## FAQs (Mintlify)

- Render with **`<AccordionGroup>` + `<Accordion title="…">`** items.
- Q/A pairs are atomic (1–3 sentences or one annotated screenshot) in user language.
- If longer, **link out** to the relevant doc.
- Include at least one edge case.

## Tips and Asides (Mintlify)

- Use **`<Tip>`**, **`<Note>`**, **`<Warning>`**.
- 1–3 sentences; optional, not a workflow.
- Place near the relevant step or after the core steps.

## Publishing and Loading (Connectors)

- **Purpose-first**: write about **publish** and **load**, not connector names.
- **H2 order**:
  1. Install
  2. Open and sign in
  3. Publish
  4. Load
  5. Common tasks (3–5 micro-guides)
  6. FAQ (Accordion)
  7. Troubleshooting (top issues, log path, forum link)
  8. Known issues
- **Header panel**: supported host versions, connector version, last updated, download, changelog.
- **Web app handoff**: after Publish/Load, show where the data appears in the browser and link to Viewing and Sharing / Workspace.
