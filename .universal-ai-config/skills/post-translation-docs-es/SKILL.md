---
name: post-translation-docs-es
description: Corrective Spanish editorial pass over machine-translated Speckle
  Mintlify MDX. Use after translate-docs-es or bulk MT when the user wants
  natural, product-ready copy without re-translating from scratch.
argumentHint: "[optional — Mint page path without .mdx, e.g. connectors/tekla]"
---

<!-- markdownlint-disable MD013 -->

# Post-translation Spanish normalisation (docs)

## When to use

- User asks to **review**, **polish**, or **normalise** Spanish `es/…` MDX against the English source.
- After **`pnpm translate:es`** or CI machine translation, before treating a page as product-ready.

## Inputs

1. **English source** — repo path `….mdx` (same Mint path, no `es/` prefix).
2. **Spanish draft** — repo path `es/….mdx`.

Read both files in full before editing.

## Role

You are a **post-translation editor**. You receive the original English and a machine-translated Spanish version. **Rewrite the Spanish** so it is natural, consistent, and product-ready, while **preserving the exact meaning** of the source.

Do **not** re-translate from scratch. Operate as a **corrective pass**.

## Core constraints

- Preserve meaning **exactly**. No additions, no omissions.
- Do not invent features, context, or tone not present in the source.
- Prefer **clarity** over literal fidelity.
- Keep sentences concise; avoid verbosity.
- Maintain **consistent terminology** across the page (and align with glossary if provided).

## MDX and Mintlify (this repo)

- **Preserve structure**: headings, lists, tables, `<Steps>`, `<Step>`, `<AccordionGroup>`, `<Accordion>`, `<Card>`, `<Note>` / `<Warning>` / `<Tip>`, imports, code fences, and attribute keys (`icon`, `href`, `cols`, etc.).
- **Editable copy**: body prose, `title` / `description` / `subtitle` / `sidebarTitle` in frontmatter, human-facing strings in JSX attributes (e.g. `title="…"` on `<Accordion>` / `<Step>` / `<Card>`), `alt` on `<img>` where Spanish is intended.
- **Do not** rename components, change import paths, or alter fenced **code** content except to fix clear MT corruption that would mislead readers (rare); when in doubt, leave code unchanged.
- After substantive edits, suggest **`pnpm docs:reindent-accordions -- --write path`** if list-heavy `<Accordion>` or `<Step>` bodies may confuse the MDX parser.

## Tone and style

- Direct **product UI** tone: neutral, professional, not academic.
- Prefer **imperative** where appropriate: e.g. “Explora…”, “Únete…”, “Configura…”.
- Avoid overly formal defaults: e.g. avoid heavy “Utilice”; prefer **“Usa”** or **“Utiliza”** and **stick to one per page or per doc**.
- No marketing fluff unless the English source has it.
- Avoid filler and redundancy.

## Idiomatic corrections (examples)

Fix common literal-MT patterns, including but not limited to:

- Awkward time / cadence phrases (e.g. tighten “día a día” style metaphors into natural work language).
- Unnatural technical phrasing (e.g. overly literal “demonstrations” → natural Spanish such as “demos” / “demostraciones” as context fits).
- Redundant stacks (e.g. trim duplicated nouns when English implied a single concept).
- Verbose sync language → shorter natural verbs when meaning stays the same (e.g. send/receive framing vs “sincronizar” only if the source means sync).

Always **anchor** changes to what the English actually says.

## Terminology normalisation (defaults)

Apply **consistent** product language unless the English term is fixed as a proper name:

| Concept | Prefer (pick one per page and stay consistent) |
| --- | --- |
| User testing | “pruebas de usabilidad” (UX) **or** “pruebas de usuario” |
| Feedback | “feedback” **or** “comentarios”, not both at random |
| Workflow | “flujos de trabajo” |
| Model validation | “validación de modelos” |
| Dashboard | “dashboard” unless product explicitly localises |

Do **not** translate **Speckle**, host app names, or established feature names unless the English doc already does.

## Technical phrasing

- Avoid over-literal renderings of niche dev terms; keep meaning.
- If Spanish-only wording is unclear for the audience, add the English term in parentheses **only when needed** for clarity.

## Structure

- Keep the same sections and hierarchy as the source.
- Do not merge or split sections.
- Keep bullets aligned with **source intent** and scannability.

## Quality checks before you finish

- No mixed terms for the same concept on one page.
- No calques that sound English when a natural Spanish construction exists.
- No unnecessary repetition.
- Sentences read naturally aloud.
- UI-oriented lines read like real product copy.

## Output

- **In-repo work**: update the **`es/…` file** in place with the full corrected MDX (not a fragment).
- **If the user asked for text only** (no file write): return **only** the corrected Spanish **body** or full document as they specified — no explanations, notes, or side-by-side comparison.

## Optional glossary

If the user supplies `term → approved Spanish`, **always** use the approved form where that concept appears.

## Note

This is a **corrective** pass over machine translation, **not** a creative rewrite.

## Related

- **`.universal-ai-config/skills/translate-docs-es/SKILL.md`** — machine translation workflow.
- **`.github/TRANSLATE_ES.md`** — scripts, env, CI.
- **`pnpm docs:reindent-accordions`** — `<Accordion>` / `<Step>` body indentation in `es/` MDX.
