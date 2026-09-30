# Drafting relation rows on `relations.mdx`

Rules for step 1 of [`SKILL.md`](SKILL.md), once `pnpm check:bundle-spec`
has listed undocumented or stale names. `docs-data.json` describes each
relation for spec engineers; the page describes it for the reader. Use the
JSON as background and write the row in the page's voice.

## Adding a relation

1. Place it in the `###` section whose relations connect the same kind of
   things (containment, connectivity, display geometry, materials,
   instancing), judged by what it connects, not by its id in the spec. A
   relation that fits none gets a new section only after asking.
2. Match the target section's existing columns. The sections carry
   different column sets on purpose; unifying them is a separate, explicit
   change.
3. Write the endpoints in the page's vocabulary for that section (`grouping
   container`, `level`, `instance placement`), translating the JSON's raw
   `object` / `node` / `geometry`.
4. Show the drafted row before writing it, then add it.

## Removing a relation

Classify each stale name first, then act:

- **Retired with a replacement** (`IN_NETWORK` / `IN_SPACE` → `IN_SYSTEM`
  is the precedent): add or extend the "Why don't I see X on new data?"
  `<Accordion>` in the page FAQ, pointing at the replacement, then remove
  the row.
- **Renamed**: update the row in place.
- **Gone with no replacement**: confirm with the user, then remove the row.

## Node kinds

`overview.mdx` names node kinds only in prose. Every kind it names must
appear in `docsData.nodeKinds[].name`; fix any that don't. Keep it prose:
`next/` pages stay sparse (`docs/agents/next.md`).
