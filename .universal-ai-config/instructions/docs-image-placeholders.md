---
description: Image placeholders — when to mark a future screenshot, and the IMAGE_PLACEHOLDER comment to catalogue it
alwaysApply: true
---

# Docs Agent — Image placeholders

## Purpose

Mark where a screenshot or short clip will later replace the comment. Comments are invisible to readers. Catalogue later by searching `IMAGE_PLACEHOLDER`.

## Notation

One JSX comment per capture, in MDX:

`{/* IMAGE_PLACEHOLDER: UI location — what must be visible. */}`

The text after the colon is the shot list: screen or panel, control, and state. One idea per comment.

## When to insert

Insert when a visual would significantly help the reader recognize the product:

- At the **head of a section** that introduces a new UI surface, control, or concept.
- **Adjacent to instructional `<Steps>`** (before the block, or after for the outcome) when the user must find a control or confirm a state.
- Next to a **Warning** whose failure is silent without a picture (empty preview, missing control, blocked dialog).

## When not to insert

- Code-only SDK or API pattern pages.
- Date tables, comparison tables, stub or hub pages with no product UI.
- Conceptual tables or diagrams that are not a product screenshot.
- A second comment for a shot already marked on another page.
- Inside `<Step>`. Placeholders stay adjacent to the Steps block, same as Tips and Notes.

## Capture later

Do not invent fake image files. Do not write a reader-facing "screenshot coming soon" disclaimer.

Do not use a `<Frame>` that points at a missing `/images/.../placeholder.png`.

When captures land, replace the comment with `<Frame>` plus the asset and delete the comment.
