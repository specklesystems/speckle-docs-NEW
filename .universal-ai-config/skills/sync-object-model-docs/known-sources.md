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

The two pages' server-side claims (REST error codes, the version-created
signal, GraphQL mutation shapes, `.dat` gating) were verified against
`speckle-server-internal` on 2026-09-16 — see the next section.

## Server-side ingestion contract — tracked (Tier B)

Covers the wire detail on `publish.mdx` (GraphQL + REST tabs, Notes and
Tips, the legacy-send FAQ) and the server-side claims on
`version-metadata.mdx` (`BUNDLE_REFERENCE_NOT_FOUND`, `schemaVersion = 3`,
the version-created signal). Ground truth is `speckle-server-internal`,
`packages/server/`:

- `assets/modelingestion/typedefs/modelingestion.graphql` — the mutation
  paths (`projectMutations.modelIngestionMutations.*`), all five input
  types (`Create`, `Update`, `Failed`, `Invalid`, `Cancelled` — the last
  three are distinct shapes), statuses, the
  `projectModelIngestionUpdated` subscription, `versionId` reserved at
  create.
- `modules/data/rest/upload.ts` — v2 `uploads/sign` and `uploads/complete`
  (paths, body schemas, ETag equality, `additionalRequestHeaders`
  passthrough, `.dat` gating). `download.ts` beside it is the artifacts
  endpoint; `multipartUpload.ts` the multipart start/complete/abort trio
  (rationale: the 5 GB single-PUT ceiling).
- `modules/data/services/envelopeVersion.ts` — the version is born at
  complete: reserved id, `objectId` = bundle reference, `schemaVersion`
  `3`, `sourceApplication` from the ingestion's `sourceData`.
- `modules/data/domain/errors.ts` (`LEGACY_SEND_UNSUPPORTED`, 422, raised
  when `isLegacySendSupported()` is false — i.e. no bundle migration
  configured) and `modules/core/rest/bundleReferenceNotFound.ts`
  (`BUNDLE_REFERENCE_NOT_FOUND`, 404, code in the `error` field).
- `modules/core/domain/commits/events.ts` + `assets/core/typedefs/
  modelsAndVersions.graphql` — the version-created signal. **There is no
  `version_created`.** Internal event `versions.created`; GraphQL
  subscription `projectVersionsUpdated` with type `CREATED`; webhook
  trigger `commit_create`. The pages now name the subscription.
- `modules/shared/middleware/index.ts` — the only client-header read.
  `apollographql-client-version` is analytics-only;
  `apollographql-client-name` is never read. The publishing application
  comes from `sourceData.sourceApplicationSlug`/`Version`, not headers.

Things the pages say that the server does **not** enforce (they're spec or
producer rules, don't go looking for server code): `meta.produced_by` /
`producer_version` being real values; the 1536 MiB shard cap.

Caveat recorded in the manifest note: at verification time the
`speckle-server-internal` worktree was dirty on branch `jbr/fea-504-…`, and
the `message` key on the `uploads/complete` body that `publish.mdx`
documents was **uncommitted** there. `upload.ts` and `envelopeVersion.ts`
are pinned from that worktree.

## SGEO geometry encoding and the viewer `.dat` — tracked (Tier B)

`next/developers/object-model/geometry-encoding.mdx`. Verified 2026-09-16;
every header/body/flag/code table on the page matched source byte-for-byte.
Ground truth, by repo:

- `speckle-bundle-spec`: `spec/bundle-spec.sql` — the `geometries` table
  (`geometryIndex`, `content`, `id`, `type`), the shard scheme
  (`bundle_files` row for `{base}.geometries*.parquet`), and the
  `DISPLAY` / `SOLID` / `DEFINES` / `CENTERLINE` rels with their `ord`
  semantics. Note `DEFINES.ord` is the definition's member ordinal, not a
  per-object counter — only `DISPLAY`/`SOLID`/`CENTERLINE` have those.
- `speckle-sharp-sdk`: `src/Speckle.Sdk/Objects/Utils/SgeoFormat.cs`
  (header, codes, flags, CRC), `SgeoEncoder.cs` (bodies; pad-to-8 before
  normals and uvs, none before colors; nested polycurve/region segments
  behind a `u32` length + reserved `u32`), `SgeoDecoder.cs`. These live in
  the `Speckle.Sdk` project but under namespace `Speckle.Objects.Utils`.
  `src/Speckle.Sdk.Parquet/Pipelines/Send/Artifacts/
  GeometriesParquetWriter.cs` — SHA-256 over the whole blob, the `type`
  column (lowercase primitive name for SGEO rows, host label like `3dm`
  for solids), `DEFAULT_SHARD_MB = 1536` rolled *before* a blob would
  exceed it. `src/Speckle.Sdk/Bundles/BundleHandles.cs` — the three
  0-based ordinal counters. Round-trip and cross-language parity tests in
  `tests/Speckle.Objects.Tests.Unit/Geometry/Sgeo*.cs`.
- `specklepy`: `src/specklepy/bundle/sgeo.py`, `geometries_writer.py` —
  identical contract; `tests/bundle/test_sgeo.py`.
- Viewer `.dat`: builder is **datgen** in `speckle-converters/datgen/`
  (the server orchestrates it as a job; there is no in-server builder).
  Layout in `speckle-viewer-webgpu/.claude/DAT_FORMAT.md` (geometry region,
  index region with **seven** sections — meta, primitives, chunks,
  placements, materials, colors, realizations — 128-byte trailer);
  realization identity in `speckle-converters/docs/
  dat-v3-realization-contract.md`; the visibility gate (no version row
  until `{versionId}.viewer.dat` is in the artifact list) in
  `speckle-server-internal/packages/server/modules/data/services/
  pendingVersion.ts`. The `.dat` is internal; the page deliberately does
  not document its bytes.

Tracked by the freshness manifest entry for `geometry-encoding.mdx`.

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
