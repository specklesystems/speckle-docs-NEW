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

## Global Authoring Rules

- **Mintlify only**: prefer Mint components over raw HTML/Markdown.
- **Tone**: approachable, precise; short, imperative sentences.
- **Structure**: task-first; show outcomes; keep pages brief.
- **Visuals**: include only when they clarify; add captions or callouts if needed.
- **Extras**: add a compact FAQ, Best practices, and 1–3 Tips where appropriate.
- **Tutorials**: keep tutorials separate; if a flow needs more than 3–5 steps, link out.
- **Cross-link and naming**: cross-link related pages; name sections by user intent.

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
