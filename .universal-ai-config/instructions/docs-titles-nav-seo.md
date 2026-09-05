---
description: Titles, navigation labels, and SEO — scannable nav, clear intent, user language
alwaysApply: true
---

# Docs Agent — Titles, Navigation, and SEO

## Goals

- Make pages scannable in navigation.
- Make intent obvious in titles.
- Avoid gaming search; prioritize user language.

## Titles

- Use task or outcome first; avoid internal product names unless necessary.
- Sentence case; 50 to 65 characters where possible.
- One clear promise; no compound clauses.
- Quote frontmatter `title` when the value is only a YAML float (for example `2026.9`). Unquoted `title: 2026.9` parses as a number and Mintlify PageHeader crashes (`trim is not a function`). Same if the title is only an integer.

## Navigation Labels

- Short; concrete; noun or verb phrase.
- Optimize for recognition, not cleverness.
- Keep siblings parallel in grammar and scope.

## SEO Hygiene

- H1 matches page title intent; not necessarily identical text.
- Use natural language keywords once in H1 and early body copy.
- Do not stuff keywords; clarity wins.

## Anti-Patterns

- Marketing adjectives.
- Version numbers in titles unless required.
