# Persona and audience

The doc-type → reader table and the general voice rules are in `AGENTS.md`. This doc holds what goes into each doc type, the reader tiers inside developer and IT admin docs, and how to split a page across roles.

- Developer docs: env vars, APIs, SDKs, connectors, server setup.
- User guides: workspaces, connectors (publish/load), 3D viewer, sharing.
- IT admin docs: deployment, admin support mode, workspace admin flows, enterprise features.

## Developer Docs Audience Hierarchy

Within **developer docs**, assume the reader is most often a **citizen developer** or **AEC hacker** — not a full-time platform engineer building a maintained host-application integration. "You" is the developer; the tone is technical and precise.

### Primary audience (default for SDK and API docs)

Practitioners who write **short-lived code** to move AEC data through Speckle while staying inside tools they already use:

- Standalone scripts and console apps
- Notebook cells (polyglot / Jupyter / IDE notebooks)
- Grasshopper or Dynamo C# components
- Small automations that **augment** existing software (Revit, Rhino, Excel, internal tools) — not replace it

**Intent:** get data in or out of Speckle quickly; minimal ceremony; visible outcome on day zero.

**Write for them by default:**

- Lead with PAT auth, env vars, and the shortest working send/receive path.
- Frame advanced setup (dependency injection, ingestion pipelines, proxy unpacking) as **optional depth**, not prerequisites.
- Label connector-only or host-integration content **before** code blocks (`<Warning>` / `<Info>`), not buried at the end.
- Prefer examples that fit one file or one notebook cell unless the page is explicitly connector-oriented.

### Secondary audience (included, not default)

Teams building **maintained host-application integrations**:

- Production desktop connectors (Revit, Rhino, AutoCAD, and similar add-ins)
- Long-lived services and ASP.NET apps sharing a DI container with the SDK
- Connector-scale upload paths (`SendPipeline`, model ingestion, continuous traversal)

**Intent:** production reliability, progress reporting, server capability detection, cooperative cancellation.

**Write for them in dedicated pages or clearly marked sections** — same SDK, deeper paths. Do not let connector patterns become the default story on introduction, quickstart, or overview pages.

### Persona check (before publishing SDK content)

1. **Would a script writer need this on day one?** If no → later section, advanced guide, or connector track.
2. **Does the first example assume DI literacy or connector internals?** If yes → add a script-first path or link to [Scripts and Notebooks](/developers/sdks/dotnet/getting-started/scripts-and-notebooks) (.NET) / specklepy quickstart (Python).
3. **Is connector-only content labeled at the top?** If no → add a warning before the first code sample.

### Terminology

| Term | Meaning in docs |
| --- | --- |
| **Citizen developer / AEC hacker** | Primary reader; scripts and small automations beside existing AEC tools |
| **Augmenting existing software** | Speckle beside the host app — not building a new host or full connector product |
| **Connector / add-in development** | Secondary reader; maintained host-application integration (least likely entry path, must remain documented) |

## IT Admin Audience Hierarchy

Within IT admin docs, the audience tiers are:

1. **IT teams and workspace admins** — primary; enterprise customers who deploy or manage Speckle. "You" is this reader; say "your server admin" when addressing them about someone else's role.
2. **Server admins** — last tier; smallest audience. Includes Speckle ops running enterprise deployments and, to a lesser extent, customers who run servers with an enterprise license.

When a feature involves both workspace admins and server admins, lead with workspace admins. Server admin content is for this narrow audience; repeat contextual Notes (e.g. Enterprise Server only) under their section so they see it when they jump there.

## Partition by Persona (Multi-Role Features)

- When a feature involves multiple roles (e.g. server admin, workspace admin), structure content by persona so readers can jump to their section.
- Use "As a [role]" headings.
- Lead with the gatekeeper role when the flow involves request-and-approve.
- Put each role's actions under their section; do not mix both roles in one block.
- Repeat Notes that apply to a persona under that persona's section (e.g. Enterprise Server only — repeat under "As a server admin").

## Intent-First Intro

Worked example of the why-and-when-first rule in `AGENTS.md`:

- Prefer: "When a workspace issue requires support, your server admin may need to inspect or fix data."
- Avoid: "This feature gives server administrators controlled, auditable access."
