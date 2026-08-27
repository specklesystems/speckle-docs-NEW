---
name: docs-image-placeholders
description: >-
  Insert or catalogue IMAGE_PLACEHOLDER comments in Speckle MDX. Use when marking
  future screenshots on instructional steps and new-concept section intros, when
  the user asks for image placeholders, a screenshot shot list, or a placeholder
  pass, or before a later visual-assets wave.
argumentHint: '[optional: path or section, e.g. next/analytics]'
---

# Docs image placeholders

Mark capture sites in MDX so later screenshot work can grep and replace them. Do not capture images in this skill. Do not publish fake assets.

Work only under **speckle-docs-NEW/** unless the user names another path.

Follow the standing rule in **docs-image-placeholders** (instruction). This skill is the pass: find gaps, insert comments, return the catalogue.

## Notation

One JSX comment per capture:

```
{/* IMAGE_PLACEHOLDER: UI location — what must be visible. */}
```

Invisible to readers. Catalogue with `rg IMAGE_PLACEHOLDER` from the docs package root.

## Where comments belong

Insert when a visual would significantly help the reader recognize the product:

- Head of a section that introduces a new UI surface, control, or concept
- Adjacent to instructional Steps (before the block, or after for the outcome)
- Next to a Warning whose failure is silent without a picture

Do not insert on code-only SDK or API pattern pages, date or comparison tables, stub or hub pages, or conceptual tables with no product UI. Do not duplicate a shot already marked elsewhere. Do not nest comments inside **Step**.

Do not write a reader-facing missing-screenshot disclaimer. Do not use a Frame that points at a missing placeholder.png.

## Pass

1. Scope to `$ARGUMENTS` if given, otherwise the files in the current docs change set, or `next/` when the work is the 2026.9 preview.
2. Search existing `IMAGE_PLACEHOLDER` comments so you do not double-mark.
3. Read each page. Insert comments only at the criteria above.
4. Put comments **adjacent** to Steps, not inside a Step.
5. Description text is the shot list: screen or panel, control, state.

## Return

List every comment added or already present in scope: file path, nearby heading, and the comment text. Say which pages you skipped and why.
