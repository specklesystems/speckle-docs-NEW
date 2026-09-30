# Known sources for object-model facts (Tier B)

Which repo owns the ground truth for each concept on
`next/developers/object-model/*` and `publish.mdx` that has no generated
catalog, and which page already covers it. Step 3 of [`SKILL.md`](SKILL.md)
reads the concept's section here first and appends what a research pass
finds. Hashes and dates live in `scripts/object-model-freshness-manifest.json`.

## What replaced the Commit object — documented

Covered in full by:

- `next/developers/object-model/version-metadata.mdx` — the root-object
  metadata split (version record / ingestion / `meta` row / model-scoped
  properties), with a before-and-after table and FAQ.
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
  envelope_writer.py` — identical shape to the .NET side.

Server-side claims on both pages are grounded by the next section.

## Server-side ingestion contract

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
  trigger `commit_create`. The pages name the subscription.
- `modules/shared/middleware/index.ts` — the only client-header read.
  `apollographql-client-version` is analytics-only;
  `apollographql-client-name` is never read. The publishing application
  comes from `sourceData.sourceApplicationSlug`/`Version`, not headers.

Spec or producer rules the server does **not** enforce (verify them in
bundle-spec or SDK source): `meta.produced_by` / `producer_version` being
real values; the 1536 MiB shard cap.

The `message` key on the `uploads/complete` body that `publish.mdx`
documents was uncommitted on the server at the 2026-09-16 verification (see
the manifest entry note); confirm it merged before re-pinning `upload.ts`.

## SGEO geometry encoding and the viewer `.dat`

`next/developers/object-model/geometry-encoding.mdx`. Every header, body,
flag and code table on the page matched source byte-for-byte at the last
verification. Ground truth, by repo:

- `speckle-bundle-spec`: `spec/bundle-spec.sql` — the `geometries` table
  (`geometryIndex`, `content`, `id`, `type`), the shard scheme
  (`bundle_files` row for `{base}.geometries*.parquet`), and the
  `DISPLAY` / `SOLID` / `DEFINES` / `CENTERLINE` rels with their `ord`
  semantics. `DEFINES.ord` is the definition's member ordinal, not a
  per-object counter — only `DISPLAY`/`SOLID`/`CENTERLINE` have those.
- `speckle-sharp-sdk`: `src/Speckle.Sdk/Objects/Utils/SgeoFormat.cs`
  (header, codes, flags, CRC), `SgeoEncoder.cs` (bodies; pad-to-8 before
  normals and uvs, none before colors; nested polycurve/region segments
  behind a `u32` length + reserved `u32`), `SgeoDecoder.cs`. These live in
  the `Speckle.Sdk` project under namespace `Speckle.Objects.Utils`.
  `src/Speckle.Sdk.Parquet/Pipelines/Send/Artifacts/
  GeometriesParquetWriter.cs` — SHA-256 over the whole blob, the `type`
  column (lowercase primitive name for SGEO rows, host label like `3dm`
  for solids), `DEFAULT_SHARD_MB = 1536` rolled *before* a blob would
  exceed it. The three 0-based ordinal counters lived in
  `src/Speckle.Sdk/Bundles/BundleHandles.cs`, split one-class-per-file
  under `Bundles/Handles/` in sharp-sdk #578. Round-trip and cross-language
  parity tests in `tests/Speckle.Objects.Tests.Unit/Geometry/Sgeo*.cs`.
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
