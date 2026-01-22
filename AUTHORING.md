# AUTHORING.md — AI Authoring Guidance (Not the Contributor README)

This file is **for training/priming AI assistants** (Cursor, ChatGPT, Claude, Copilot) to write and review Speckle docs consistently. It is **not** the contributor README. For human setup instructions (Mintlify, devcontainer, publishing), see **README.md**.

The **canonical, path‑scoped rules** live in `.cursor/rules/*.mdc`. This file summarizes those rules in one place so non‑Cursor tools can follow them.

---

## Our approach to users

* **User‑first, purpose‑first**: frame topics by the action (publish, load, share, view), not the plumbing (connectors, integrations).
* **Day‑0 success**: shortest path to a visible win; minimal decisions; show outcomes.
* **Brevity with depth**: core pages stay concise; depth lives in **FAQs**, **Best practices**, and **Tips**.
* **Visual clarity**: use screenshots/short clips when they reduce cognitive load; add captions when the image carries meaning.
* **Plain language**: approachable, precise, no jargon; imperative steps.
* **Honest guardrails**: call out limitations, known issues, version differences.
* **Connectors are a subset**: everyone uses the web app; not everyone uses connectors.

---

## Global authoring rules (summary of `base.mdc`)

* **Mintlify only**: prefer Mint components over raw HTML/Markdown.
* **Tone**: approachable, precise; short, imperative sentences.
* **Structure**: task‑first; show outcomes; keep pages brief.
* **Visuals**: include only when they clarify; add captions/callouts if needed.
* **Extras**: add a compact **FAQ**, **Best practices**, and **1–3 Tips** where appropriate.
* **Tutorials**: keep tutorials separate; if a flow needs >3–5 steps, link out.
* **Cross‑link & naming**: cross‑link related pages; name sections by user intent.

---

## Steps (summary of `steps.mdc`)

* Use **`<Steps>`/`<Step>`** for short, linear sequences.
* **Titles**: verb‑first, sentence case, \~3–7 words.
* **Content**: 1–3 short sentences or a short ordered list; end with the **outcome**.
* **Do not nest complex components** (Tabs, Accordions, code blocks) inside `<Step>`.
* Put `<Tip>`, `<Note>`, `<Warning>` **adjacent** to the Steps block (not inside).
* **Fallback** when Steps need rich content: use `###` + ordered list instead of `<Steps>`.

---

## FAQs (summary of `faq.mdc`)

* Render with **`<AccordionGroup>` + `<Accordion title="…">`** items.
* Q/A pairs are atomic (1–3 sentences or one annotated screenshot) using user language.
* If longer, **link out** to the relevant doc.
* Include at least one edge case.

---

## Tips & asides (summary of `tips.mdc`)

* Use **`<Tip>`**, **`<Note>`**, **`<Warning>`**.
* 1–3 sentences; optional, not a workflow.
* Place near the relevant step or after the core steps.

---

## Publishing & Loading (connectors) (summary of `connectors.mdc`)

* **Purpose‑first**: write about **publish** and **load**, not connector names.
* **Use this H2 order**:

  1. Install
  2. Open & sign in
  3. Publish
  4. Load
  5. Common tasks (3–5 micro‑guides)
  6. FAQ (Accordion)
  7. Troubleshooting (top issues, log path, forum link)
  8. Known issues
* **Header panel**: supported host versions, connector version, last updated, download, changelog.
* **Web app handoff**: after Publish/Load, show exactly where the data appears in the browser and link to Viewing & Sharing / Workspace.

---

## How to use this file with different tools

### Cursor

Cursor auto‑attaches rules from `.cursor/rules/*.mdc`. Keep those files authoritative. This `AUTHORING.md` is just a human/agent summary.

### ChatGPT

* Paste the **Prompt Seed** (below) into Custom Instructions or your first message; pin it in the thread.
* When asking for edits, reference the relevant rules (e.g., “follow `connectors.mdc` H2 order”).

### Claude

* Create a **sub‑agent** or attach this file as context; reference the rules sections explicitly.

### Copilot (Chat)

* Open `AUTHORING.md` and say: “Use this document as guidance for all doc edits in this session.”
* Add a short banner comment at the top of the page you’re editing to nudge inline completions:
  `<!-- style: mintlify components; FAQs=AccordionGroup; steps=no nested components -->`

---

## Prompt Seed (paste into your AI tool once per session)

> You are writing docs for Speckle. Follow **AUTHORING.md** in the repo and the canonical rules in `.cursor/rules/*.mdc`.
>
> **Global**: Mintlify components only; approachable, precise tone; short, imperative sentences; task‑first; show outcomes; keep pages brief; visuals when they clarify; compact FAQ + best practices + 1–3 Tips; no tutorials in core docs; cross‑link by user intent.
>
> **Steps**: use `<Steps>`/`<Step>` for short sequences; verb‑first titles; do **not** nest complex components; render callouts adjacent; fallback to `###` + ordered list if needed.
>
> **FAQs**: use `<AccordionGroup>` + `<Accordion title="…">`; answers are atomic; link out if longer; include an edge case.
>
> **Connectors**: frame by purpose (publish/load), not connector names; H2 order = Install → Open & sign in → Publish → Load → Common tasks → FAQ → Troubleshooting → Known issues; add a header panel (versions, download, changelog); always show the web‑app handoff.

---

**Source of truth:** `.cursor/rules/*.mdc`
**Contributor setup:** see `README.md`.
