---
description: Versioned code snippets — same setup across version tabs; only the changed call differs
alwaysApply: true
---

# Docs Agent — Versioned snippets

## Purpose

Let the reader overlay two versions of the same task. The only visible difference should be the API or data shape that actually changed.

## When

Use this whenever a page shows the same operation before and after a dated release (Mintlify `<Tabs>` such as Prior to 2026.9 / 2026.9, or stacked headings with a code block under each).

## Symmetry

- Same task, same inputs, same names, same outcome.
- Shared bootstrap lives **outside** the tabs. State once that `account`, `client`, ids, or `root` / `model` are already in scope.
- Each snippet starts at the call that differs.
- Fence title matches the tab title (for example `Prior to 2026.9` and `2026.9`).
- Do not add usings, comments, or helper lines in only one side.
- Keep line count close. Extra lines must be the new API, not scaffolding.

## Boilerplate

Keep lines that are not the compared change to a minimum.

- Omit auth, client construction, id lookup, and other setup that is the same on both sides. Say those values are already in scope.
- Omit imports, usings, and hoisted declarations when they are not part of the comparison.
- Keep imports and hoisting **inside** the tabs only when the difference *is* those lines (a new namespace, a renamed type, a moved helper). Then they stay on both sides so the overlay still works.
- Do not pad a snippet to look complete. A short fragment that shows the changed call is enough.

## Labels

- Tab titles: **Prior to 2026.9** and **2026.9**. Add the API in parentheses when it helps (`Prior to 2026.9 (Receive2)`).
- Public version string is `2026.9`, never `v2026.9`. Same for `2026.8`.
- Prefer tabs over stacked headings when both sides are code. If you use headings, apply the same symmetry.

## Checklist

1. Cover the same inputs and outcome?
2. Could a reader overlay the two snippets and see only the changed calls?
3. Shared setup stated once, outside the tabs?
4. Are leftover imports or hoisting actually part of the comparison? If not, omit them.
