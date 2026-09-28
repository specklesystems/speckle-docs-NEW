# Viewer bundle bridge

Sample code that loads a 2026.9 **bundle** into the published `@speckle/viewer`.
Copy what you need into your own app. Nothing here is a package, and nothing here
patches the viewer.

The step-by-step guide is
[Load a 2026.9 bundle in the Viewer](https://docs.speckle.systems/next/developers/viewer/loading-bundles).

## What it does

1. Reads the version record and dispatches on its shape.
2. Lists the version's artifacts and downloads the parquet tables.
3. Decodes SGEO geometry.
4. Projects the bundle onto `Base` objects with collection, material, colour and
   instance proxies.
5. Hands those objects to `ObjectLoader2Factory.createFromObjects` through a
   `SpeckleLoader` subclass, then `viewer.loadObject(loader, true)`.

Everything after step 5 — extensions, filtering, selection, camera — is untouched
public viewer API.

## Run it

Install from inside this directory. The sample is its own pnpm root, so it does not share a
store with the docs repo around it and copies out cleanly.

```bash
pnpm install
pnpm dev
```

Then enter a server URL, project, model and version id, and a personal access
token. The app loads either shape of version: a bundle through the bridge, an
object graph from 2026.8 and earlier through `SpeckleLoader` as before.

The app creates `CameraController`, `SelectionExtension` and a custom
`ApplicationIdAuditExtension` — an ordinary extension with an injected dependency, a viewer
event listener and a world-tree walk. It is there to show that once the loader has run,
nothing downstream knows the data came from a bundle.

To load a bundle directory you already have, serve it over HTTP with a `files.json` listing
its file names beside it, then open `?bundle=<url>`. That path skips the version lookup and
takes the same projection and loader a live version does.

To look at a bundle on disk without a browser or a server at all:

```bash
pnpm inspect ./some-downloaded-bundle
```

That prints the tables it read, the relation ids it did not recognise, what each
projection produced, and which SGEO primitives it skipped.

## Layout

| Path                                            | What it is                                             |
| ----------------------------------------------- | ------------------------------------------------------ |
| `src/bridge/artifacts.ts`                       | Version record, artifacts listing, downloads           |
| `src/bridge/parquet.ts`                         | Parquet reads, including the zstd codec                |
| `src/bridge/propertyTable.ts`                   | The eav tables as a lookup, with dotted paths rebuilt  |
| `src/bridge/bundleReader.ts`                    | Parquet to dense-keyed tables and grouped relations    |
| `src/bridge/decodeSgeo.ts`                      | Vendored SGEO decoder — do not edit                    |
| `src/bridge/sgeoToSpeckle.ts`                   | Decoded primitives to `Objects.Geometry.*`             |
| `src/bridge/projection-viewer-compatibility.ts` | **Path 1**: render only                                |
| `src/bridge/projection-full.ts`                 | **Path 2**: properties, solids, complete carriage      |
| `src/bridge/bundleLoader.ts`                    | The `SpeckleLoader` subclass and the end-to-end load   |
| `src/bridge/bundleSpec.ts`                      | Vendored relation and node-kind catalog — do not edit  |
| `src/applicationIdAudit.ts`                     | A custom extension, to show nothing downstream changes |
| `src/main.ts`                                   | The mini app                                           |

## Pick a projection

Both projections produce the same kind of object tree. Path 1 draws; path 2 draws
and carries the data.

|                                         | Path 1 — viewer compatibility | Path 2 — full                      |
| --------------------------------------- | ----------------------------- | ---------------------------------- |
| Geometry, instances, materials, colours | Yes                           | Yes                                |
| Object properties                       | No                            | Instance and type-level, merged    |
| Solids preference                       | No                            | Optional, display mesh as fallback |
| Objects with no geometry                | Dropped                       | Carried                            |
| Reference point                         | No                            | Yes                                |
| Relations read                          | 1, 4, 5, 6, 8, 9, 10          | those plus 2, 26–30                |

Path 1 is the default in `src/main.ts`. To switch, change one import:

```ts
import { projectBundle } from './bridge/projection-full.js'
```

The two files keep the same function names in the same order on purpose. A fix to
one is mechanical to apply to the other — keep them that way.

## Vendored files

Two files are copied from elsewhere in the stack rather than installed, because
neither is on public npm. Do not edit them here; re-copy them from source.

| File                       | Source                                                                                      | Pin                                 |
| -------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------- |
| `src/bridge/decodeSgeo.ts` | The Speckle viewer's SGEO decoder (Apache-2.0)                                              | Postdates `@speckle/viewer@2.31.14` |
| `src/bridge/bundleSpec.ts` | [speckle-bundle-spec](https://github.com/specklesystems/speckle-bundle-spec) `generated/ts` | Schema 1.2.0, commit `82ae2e97`     |

## What this sample is not

- **Not a published package, and not supported as one.** It is worked example code
  with a date on it. Read it, copy it, own the copy.
- **Not a conformance implementation.** The .NET and Python SDKs each carry their
  own tested projection; this is a third reading of the same rules, checked
  against a bundle fixture rather than against those SDKs.
- **Not a replacement for `@speckle/objectloader2`.** It reads bundles. Object
  graphs still load the way they always did.
- **Not a performance win.** It rebuilds the object graph 2026.9 retires and runs
  the converter that has always run, so it inherits today's load time and memory
  profile and gives up the streaming and sharded reads the bundle format exists
  for. It keeps your app working across the format change; it does not reach the
  ceiling 2026.9 raises.

Verified against `@speckle/viewer@2.31.14`, `@speckle/objectloader2@2.31.14` and
bundle spec 1.2.0, as of September 2026: a bundle fixture loads, renders, expands
nested instances under their transforms, and resolves selection by `applicationId`.
