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

## Get just this directory

The docs repo is mostly prose and screenshots. Sparse checkout takes this directory
without the rest of it.

```bash
git clone --filter=blob:none --sparse --depth 1 \
  https://github.com/specklesystems/speckle-docs-new.git
cd speckle-docs-new
git sparse-checkout set examples/viewer-bundle-bridge
cd examples/viewer-bundle-bridge
```

You get this directory plus the repo's root-level files, which cone mode always includes.

## Run it

Install from inside this directory. The sample is its own pnpm root, so it does not share a
store with the docs repo around it and copies out cleanly.

```bash
pnpm install
pnpm dev
```

Open the `http://localhost:…` address it prints. Opening `index.html` from disk cannot
work — it is a Vite app, and browsers refuse ES modules over `file:`.

With [mise](https://mise.jdx.dev), `mise run install` and `mise run dev` do the same thing
and pin Node and pnpm to the versions this was verified against. mise is optional — the
sample needs only Node and pnpm.

Then enter a server URL, project, model and version id, and a personal access
token. The app loads either shape of version: a bundle through the bridge, an
object graph from 2026.8 and earlier through `SpeckleLoader` as before.

To load a bundle directory you already have, serve it over HTTP with a `files.json` listing
its file names beside it, then open `?bundle=<url>`. That path skips the version lookup and
takes the same projection and loader a live version does.

## Extensions, on purpose

Alongside `CameraController` and `SelectionExtension`, the app runs two things the Speckle
web app does not:

- **`ExplodeExtension`**, which ships with the viewer and the web app never creates.
- **`BoxSelectExtension`** in `src/boxSelect.ts`, written here from scratch: an injected
  `SelectionExtension` and `CameraController`, a drag rectangle, and a world-tree walk that
  projects render-view bounds to the screen.

Selecting anything fills a small properties panel: the object's scalars, a count of instance
against type-level rows, and the first few values. The lookup goes to the bundle rather than
to the object the viewer is holding — the viewer hands back an `applicationId` and the
bundle's own eav tables answer to it. That is the round trip the bridge is really for, and it
works even for objects the projection drew as instance proxies, which carry no properties of
their own. It stops at a handful of values on purpose; it is a demonstration, not a property
browser.

That is the point. If an extension written from scratch against public Viewer API works on a
bundle that came through the bridge, the Viewer 2 API surface works on 2026.9 data — not
just the paths Speckle itself exercises. The ids box select reports are `applicationId`
values, because that is what the projection sets `id` to.

## Layout

| Path                         | What it is                                               |
| ---------------------------- | -------------------------------------------------------- |
| `src/bridge/artifacts.ts`    | Version record, artifacts listing, downloads             |
| `src/bridge/bundleReader.ts` | Parquet and eav tables to dense-keyed maps and relations |
| `src/bridge/projection.ts`   | Bundle to `Base` objects: what the viewer converts       |
| `src/bridge/bundleLoader.ts` | The `SpeckleLoader` subclass and the end-to-end load     |
| `src/bridge/vendored.ts`     | Copied-in spec catalog and SGEO decoder — do not edit    |
| `src/boxSelect.ts`           | A custom extension, to show the Viewer 2 API still works |
| `src/propertiesHud.ts`       | Selection to the producer's own properties               |
| `src/main.ts`                | The mini app                                             |
| `mise.toml`                  | Optional: pins Node and pnpm, wraps the scripts          |

## What the projection covers

Rendering is unconditional: geometry, nested instances, grouping, and the full material and
colour precedence from the geometry up through the object to its container — rels 1, 4, 5, 6,
8, 9, 10 and 26–29.

Two things cost extra reads, so they are options:

```ts
projectBundle(bundle, { properties: true, referencePoint: true })
```

`properties` merges each object's instance and type-level rows. The type rows live in their
own table, and without that merge most Revit type parameters are absent — which is what the
HUD would show you. `referencePoint` carries the model's datum onto the root. An app that only
draws leaves both off and never downloads the eav tables.

Solids, centrelines and the scene-view tree are carried by the bundle and read by none of
this. The rules for them are in [Load a bundle in your own
code](https://docs.speckle.systems/next/developers/building-integrations/load).

## Vendored files

`src/bridge/vendored.ts` holds two files copied from elsewhere in the stack, because
neither is on public npm. Neither is meant to be read for understanding or edited here —
refresh a section wholesale from its source rather than hand-merging.

| Section | Source                                                                                      | Pin                                 |
| ------- | ------------------------------------------------------------------------------------------- | ----------------------------------- |
| Catalog | [speckle-bundle-spec](https://github.com/specklesystems/speckle-bundle-spec) `generated/ts` | Schema 1.2.0, commit `82ae2e97`     |
| Decoder | The Speckle viewer's SGEO decoder (Apache-2.0)                                              | Postdates `@speckle/viewer@2.31.14` |

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
bundle spec 1.2.0, as of September 2026, on a real Revit model published to
app.speckle.systems: 4894 objects, 2988 geometries and 3601 instance placements read
with no unknown relations and no skipped primitives, rendered in the browser with its
materials, then exploded and box selected — box select returning `applicationId`
values for the objects inside the rectangle.
