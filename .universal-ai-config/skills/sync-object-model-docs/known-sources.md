# Known sources for next/developers/object-model facts

A map of which repo owns the ground truth for each concept these pages
cover, and which tool (if any) checks it mechanically. Update this file
whenever a research pass (Tier B, see SKILL.md) finds a concept's source —
future runs should look here before re-discovering it from scratch.

## Relations and node kinds — mechanical (Tier A)

Source: `speckle-bundle-spec`'s generated `generated/docs-data.json` (built
from `spec/bundle-spec.sql`). Checked by `scripts/check-bundle-spec-
relations.mjs` against `next/developers/object-model/relations.mdx`.
Node kinds have no table to diff yet (`overview.mdx` only has prose
examples) — see the script's own output and SKILL.md step 2.

## Terminology (renamed concepts) — mechanical (Tier A)

Source: `atlas/glossary.md`'s `**term** (was: *legacy*)` rows — the
stack-wide canonical-naming registry. Checked by `scripts/check-object-
model-terms.mjs` against every `next/*.mdx` page (informational, not
blocking — a legacy term named for comparison is legitimate).

## What replaced the Commit object — already documented, tracked (Tier B)

**Do not draft a new page for this.** It's fully covered by:

- `next/developers/object-model/version-metadata.mdx` — the root-object
  metadata split (version record / ingestion / `meta` row / model-scoped
  properties), with a full before-and-after table and FAQ.
- `next/developers/building-integrations/publish.mdx` — the ingestion
  sequence (create → build → sign → upload → complete → wait), GraphQL/REST
  wire detail, and bundle-correctness rules.

Ground truth, by repo:

- `atlas/glossary.md` — the version-was-commit rename, the bundle reference
  string format, `Version.schemaVersion` vs `meta.schema_version`.
- `speckle-bundle-spec`: `spec/bundle-spec.sql` — the `meta` table DDL.
- `speckle-sharp-sdk`: `src/Speckle.Sdk/Bundles/BundleSender.cs` (the
  publish sequence), `src/Speckle.Sdk.Parquet/Pipelines/Send/Artifacts/
  EnvelopeWriter.cs` (`meta` row shape), `src/Speckle.Sdk/Objects/Utils/
  ObjectsArtifactPipeline.cs` (`SetProducer`).
- `specklepy`: `src/specklepy/bundle/send.py`, `src/specklepy/bundle/
  envelope_writer.py` — confirmed identical shape to the .NET side.

Tracked by `scripts/check-object-model-freshness.mjs` against
`scripts/object-model-freshness-manifest.json`, which pins the sha256 of
each source file above as of the last verification.

**Known gap**: the two pages also assert server-side contract detail (REST
error codes such as `BUNDLE_REFERENCE_NOT_FOUND` and
`LEGACY_SEND_UNSUPPORTED`, the `version_created` event, exact GraphQL
mutation shapes) that lives in `speckle-server-internal` and is **not yet**
in the freshness manifest — that repo hasn't been read for this. Add it as
a new manifest entry (or a note against the existing ones) once someone
does that research pass, rather than assuming it's covered.

## SGEO geometry encoding — not yet tracked

`next/developers/object-model/geometry-encoding.mdx` exists (referenced
from `publish.mdx`'s Geometry rules: SGEO header format, checksum, sharding
at 1536 MiB). Ground truth is presumably `speckle-bundle-spec` (the SGEO
header spec) and possibly `speckle-converters` (writers). Nobody has done
the research pass to confirm exact source files yet — do that before adding
a manifest entry, don't guess at paths.

## General rule for adding a new Tier B entry

1. Check this file first — the source locations may already be known.
2. If not, read `atlas/glossary.md` for canonical terms, then the actual
   implementation in the owning repo(s) (usually `speckle-bundle-spec` for
   format/shape, `speckle-sharp-sdk` + `specklepy` for the SDK surface,
   `speckle-server-internal` for the API contract).
3. Record what you found here (prose, for the next human/agent) AND in
   `scripts/object-model-freshness-manifest.json` (source paths + sha256,
   for the freshness script) — both, not just one. The manifest without
   this file is unreadable hashes; this file without the manifest never
   gets mechanically re-checked.
