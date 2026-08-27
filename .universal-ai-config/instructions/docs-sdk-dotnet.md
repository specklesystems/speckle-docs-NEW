---
description: Speckle.Sdk (.NET) docs — scripts-first audience, bootstrap boilerplate, connector content secondary
globs: ["developers/sdks/dotnet/**", "next/developers/sdks/dotnet/**"]
---

# Speckle.Sdk (.NET) Documentation

Applies when creating or editing pages under `developers/sdks/dotnet/` or `next/developers/sdks/dotnet/`.

## Audience (scripts first)

Primary reader: **citizen developer / AEC hacker** — Grasshopper C#, polyglot notebook cell, one-off script augmenting existing AEC software.

Secondary reader: **connector / add-in author** — production host-application integration. Document thoroughly but do not let this persona own introduction, quickstart, or default examples.

Full persona rules: see **Developer Docs Audience Hierarchy** in `docs-persona-audience.md`.

## Entry points by reader

| Reader | Direct them to |
| --- | --- |
| Script, notebook, GH C# | [Scripts and Notebooks](/developers/sdks/dotnet/getting-started/scripts-and-notebooks) |
| First full walkthrough | [Quickstart](/developers/sdks/dotnet/getting-started/quickstart) |
| Connector / large host-app send | [Building Connector-Scale Sends](/developers/sdks/dotnet/guides/building-connector-scale-sends), [Dependency Injection](/developers/sdks/dotnet/concepts/dependency-injection) |

Nav order in `docs.json`: prefer **Scripts and Notebooks** before connector-oriented guides when adding Getting Started pages.

## Bootstrap vs dependency injection

- Speckle.Sdk has **no** specklepy-style import-and-go. A one-time `AddSpeckleSdk` bootstrap is required.
- **Do not** present DI as a skill readers must learn for scripts. Call it **boilerplate** — copy once, resolve `IOperations` / `IClientFactory`, ignore container design.
- **Do not** open introduction or quickstart with "Dependency Injection by Design" as a selling point.

## Default send/receive path for examples

| Reader | Prefer in examples |
| --- | --- |
| Scripts, notebooks, quick wins | `Send2` / `Receive2` (URL + project id + token; no `IServerTransportFactory`) |
| Quickstart tour (transport teaching) | `Send` / `Receive` with `IServerTransportFactory` — acceptable when the page is explicitly a full walkthrough |
| Connectors only | `SendPipeline` + model ingestion — never the default on non-connector pages |

## Connector-only content (label upfront)

These topics are **secondary** — mark with `<Warning>` or `<Info>` at the top of the page or section:

- `SendPipeline`, `ISendPipelineFactory`, model ingestion lifecycle
- `client.Ingestion.*` as part of a script workflow (ingestion completion semantics differ for packfile vs manual paths)
- `IRootContinuousTraversalBuilder`, packfile send, ingestion progress subscriptions
- Deep `GraphTraversal` / proxy unpacking (unless page is explicitly about receiving connector-produced data)

## Cross-links

- Compare to specklepy where helpful — Python readers expect import-and-go; .NET readers need the bootstrap preamble explained once.
- Link to [speckle-sharp-connectors](https://github.com/specklesystems/speckle-sharp-connectors) only on connector-scale pages, not on every SDK overview.

## Platform vs .NET scope (avoid overlap)

Canonical platform docs live outside `developers/sdks/dotnet/`:

- [Data Schema](/developers/data-schema/overview) — DataObject, Collection, proxies, geometry storage, traversal patterns
- [Authentication](/developers/authentication/pats) — creating PATs, OAuth registration
- [Key Concepts](/developers/key-concepts) — high-level platform model

When editing .NET SDK pages:

1. **Platform first** — If data-schema or authentication explains *what* and *why*, .NET pages explain *which type/method* and *pitfalls* only.
2. **One teaching home per topic** — Do not split the same mechanism across a concept page and a guide. Concept = API surface; guide = end-to-end task (or merge into one page).
3. **Cap platform preamble** — Max ~3 sentences + link before .NET code on shared topics.
4. **Keep educational value** — Every removed narrative section must leave a working C# snippet or a .NET-specific pitfall (e.g. `displayValue` casing, `AggregateException`, `[Chunkable]` vs `SendPipeline`).

## Authoring checklist (.NET SDK page)

Before completing an edit:

1. First code sample achievable without connector knowledge?
2. Connector-only sections warned before code?
3. Script path linked where bootstrap or `GetRequiredService` appears?
4. C# fences use Mintlify metadata — ` ```csharp Example lines icon="/images/developers/sdks/csharp.svg" ` (title before `lines`; never ` ```csharp lines ...` alone); add `expandable` on Complete Example blocks?
5. Version comparison tabs follow **docs-versioned-snippets** (same setup; only the changed call differs)?
6. `pnpm valid` and `pnpm check-links` run from `speckle-docs-NEW` after substantive changes?

## Code fences

Match [specklepy](/developers/sdks/python) SDK pages. Mintlify expects a **title or filename before meta options** — do not put `lines` immediately after the language id (Mintlify treats it as the block title and breaks highlighting/header).

| Block type | Fence |
| --- | --- |
| Typical C# sample | ` ```csharp Example lines icon="/images/developers/sdks/csharp.svg" ` |
| Grasshopper `#r` NuGet lines | ` ```csharp NuGet references lines icon="/images/developers/sdks/csharp.svg" ` — add a `//` comment before `#r` so Mintlify keeps `csharp` highlighting (blocks starting with `#r` fall back to plain text) |
| Full Grasshopper C# Script | ` ```csharp Complete example lines icon="/images/developers/sdks/csharp.svg" expandable ` |
| Long complete example / full script | `Complete example` title + `expandable` |
| Shell install (`dotnet add package`, etc.) | plain ` ```bash ` — no change |

Font Awesome has no hosted C# icon (`icon="csharp"` resolves to a missing CDN asset). Use `/images/developers/sdks/csharp.svg` (Microsoft C# logo) for code blocks and SDK cards.

Use descriptive titles where helpful (`Bootstrap`, `Send and receive`, `Bootstrap.cs`). Keep modifiers (`expandable`, `focus={…}`) after the title. Do not put code on the same line as the opening fence.
