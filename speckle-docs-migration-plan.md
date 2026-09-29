# Speckle docs migration plan: /next/ → unified doc set

**Reconciliation:** 52 `/next/` pages identified · 52 migration actions assigned · 52 redirect destinations assigned

---

## Context and objective

Fin AI reads both doc sets and gives inconsistent answers because it doesn't reliably follow llms.txt routing. The fix is a single unified doc set reflecting 2026.9 state, with no version selector. The `/next/` pages are retired after their content lands in the main trees. The transition content lives in three audience-specific What's new pages.

This plan gives Jonathon everything needed to execute the merge himself. Every decision is already made. Options that appeared in the previous draft are resolved here.

---

## 1. Target information architecture

**Decision: one doc set, no version selector.** The Mintlify version selector is removed. The `/next/` directory and the 2026.9 version entry in `navigation.json` are deleted after all redirects are in place.

**Structural additions (new pages to create):**

| New path                                            | Purpose                                                      |
| --------------------------------------------------- | ------------------------------------------------------------ |
| `whats-new/users.mdx`                               | What's new in 2026.9 for workspace users                     |
| `whats-new/developers.mdx`                          | What's new in 2026.9 for SDK/API/Automate consumers          |
| `whats-new/it-admins.mdx`                           | What's new in 2026.9 for IT teams and workspace admins       |
| `workspaces/usage.mdx`                              | Workspace Settings → Usage (new page, no Current equivalent) |
| `analytics/intelligence.mdx`                        | Intelligence Chat (new feature, no Current equivalent)       |
| `analytics/intelligence-skills.mdx`                 | Intelligence Skills (new feature, no Current equivalent)     |
| `analytics/intelligence-rules.mdx`                  | AI Rules for workspace admins (new feature)                  |
| `analytics/reports.mdx`                             | Intelligence Reports (new feature, no Current equivalent)    |
| `connectors/cloud-integrations/trimble-connect.mdx` | Trimble Connect beta (new connector)                         |
| `it-admin/compatibility-mode.mdx`                   | Compatibility mode (new admin page)                          |

**What's new page structure (all three pages):**

Each page has three sections: New, Changed, Action required.

- `whats-new/users.mdx`: viewer panels, Sketch/Measure/GroupBy, Intelligence Chat, Intelligence Reports, Intelligence Skills, AI Rules, workspace sidebar changes, Trimble Connect beta, Dashboards load 2026.9 natively, Parameter Updater moved to Elements panel, Data Validation path changes.
- `whats-new/developers.mdx`: new object model (columnar store + relational layer), Receive3 (.NET), receive3 (Python), no root object, relations replace Proxies, geometry encoding (SGEO), API changes (replace object.children), bundle format, Automate UI changes, viewer bundle loading, objectloader2 warning.
- `whats-new/it-admins.mdx`: connector upgrade window (1 Sep–1 Nov 2026), compatibility mode (ACC sync + drag-and-drop; request before 1 Nov 2026), file upload format removals, AI features toggle in workspace General settings, roles and permissions (unchanged, link to existing page), Trimble Connect setup.

**Navigation changes:**

- Add `whats-new/` group near the top of nav (after quickstart), linking all three What's new pages.
- Add `it-admin/compatibility-mode` under IT Administrators.
- Add `workspaces/usage` under Workspaces.
- Add `analytics/intelligence`, `analytics/intelligence-skills`, `analytics/intelligence-rules`, `analytics/reports` under Analytics.
- Add `connectors/cloud-integrations/trimble-connect` under Connectors.
- Remove the `/next/` version and its entire navigation tree.

---

## 2. Migration treatment (editorial checklist)

Every migrated page goes through this checklist in order. "Migrated" means the content is being merged into an existing Current page or used to create a new page.

1. **Strip agent routing blocks.** Remove the `<Visibility for="agents">...</Visibility>` block from the top of every `/next/` page. These are replaced by the unified llms.txt (see Section 7).
2. **Strip the preview banner import and component.** Remove `import NextPreviewBanner from '/snippets/next-preview-banner.mdx'` and `<NextPreviewBanner />`.
3. **Strip or rewrite version hedging.** Remove "in 2026.9", "this page covers only what changed", "not on this preview yet", and any forward references to /next/ or "Current" as a version-selector label. Rewrite if needed to be authoritative present-tense.
4. **Replace version labels in prose.** "Before 2026.9" replaces "in earlier versions" or "today". "2026.8 and earlier" replaces "the current model". Never "v2026.9". Never "Speckle Next". Never "Current" as a content term.
5. **Update all internal links.** Remove `/next/` prefix from all internal hrefs. Update any link pointing to a superseded Current page (e.g. old diff-view workflow) to point to the replacement page.
6. **Remove or rewrite superseded Current content.** Where a Current page section is being replaced by 2026.9 content (not supplemented), remove the old section. Do not leave both. Where 2026.9 supplements rather than replaces, add a dated note: "From 2026.9" before the new section.
7. **Apply migration callout where relevant.** If the page covers a behaviour that differs for self-hosted servers on an older version, add a `<Note>` pointing to `it-admin/compatibility-mode` or `workspaces/data-model-migration`. Do not scatter version callouts on pages where nothing about self-hosted differs.
8. **Verify frontmatter.** Remove `docs_version`, `product_generation`, `docs_status`, `docs_authority`, `applies_to_version`, `applies_from` fields. Keep `title`, `sidebarTitle`, `description`. Quote the title if it is only a number (Mintlify requirement).

---

## 3. Page-by-page migration map

All 52 `/next/` pages. Actions: **REPLACE** (overwrite existing Current page), **MERGE** (add content to existing Current page), **CREATE** (write new page with no Current equivalent), **STUB→RETIRE** (page is a placeholder; redirect to Current; no content to port), **REDIRECT-ONLY** (page has no unique content; redirect only).

### Root / welcome

| #   | /next/ source        | Action        | Destination          | Content work                                                               | Remove from Current |
| --- | -------------------- | ------------- | -------------------- | -------------------------------------------------------------------------- | ------------------- |
| 1   | `next/welcome.mdx`   | REDIRECT-ONLY | `quickstart/welcome` | None — stub pointing to Current                                            | —                   |
| 2   | `next/whats-new.mdx` | REDIRECT-ONLY | `whats-new/users`    | Feed the three What's new pages; do not port the comparison table verbatim | —                   |

### Workspaces

| #   | /next/ source                      | Action | Destination                | Content work                                                                                                                                                                                         | Remove from Current           |
| --- | ---------------------------------- | ------ | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| 3   | `next/workspaces/introduction.mdx` | MERGE  | `workspaces/introduction`  | Add new sidebar section (Home, Projects, Intelligence, Documents, Team, Settings map). Remove any description of the pre-2026.9 sidebar that no longer matches.                                      | Old sidebar description       |
| 4   | `next/workspaces/settings.mdx`     | MERGE  | `workspaces/configuration` | Add settings map table (General AI switch, Usage, Security, Billing, Data residency, Automation, Support, Skills, AI Rules). If `workspaces/configuration` already has a settings table, replace it. | Old incomplete settings table |
| 5   | `next/workspaces/usage.mdx`        | CREATE | `workspaces/usage`         | New page. Port content: Settings → Usage walkthrough, activity/plan limits/AI spend. No Current equivalent. Cross-link from `workspaces/configuration`.                                              | —                             |

### IT admin

| #   | /next/ source                             | Action      | Destination                   | Content work                                                                                                                                                                                                                                                        | Remove from Current     |
| --- | ----------------------------------------- | ----------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| 6   | `next/it-admin/introduction.mdx`          | MERGE       | `it-admin/introduction`       | Add dated-actions table (1 Sep/1 Nov 2026). Add AI features toggle in workspace General settings. Add Trimble Connect setup pointer.                                                                                                                                | Stale intro copy if any |
| 7   | `next/it-admin/compatibility-mode.mdx`    | CREATE      | `it-admin/compatibility-mode` | New page. Port all content: what it covers (ACC sync + drag-and-drop only, not desktop connector publishes), how to request, deadline (1 Nov 2026). Add `<Warning>` for deadline. Cross-link from `whats-new/it-admins` and from `workspaces/data-model-migration`. | —                       |
| 8   | `next/it-admin/connector-updates.mdx`     | MERGE       | `it-admin/connector-updates`  | Add the dated window section (1 Sep–1 Nov 2026) to existing `it-admin/connector-updates`. Keep existing install/baseline content. Add `<Warning>` for 1 Nov deadline.                                                                                               | —                       |
| 9   | `next/it-admin/roles-and-permissions.mdx` | STUB→RETIRE | `workspaces/roles-and-seats`  | Content is a stub ("coming soon"). No content to port. Redirect to existing roles page.                                                                                                                                                                             | —                       |

### Connectors

| #   | /next/ source                                            | Action  | Destination                                     | Content work                                                                                                                                                                                                                                                                             | Remove from Current       |
| --- | -------------------------------------------------------- | ------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| 10  | `next/connectors/overview.mdx`                           | MERGE   | `connectors/overview`                           | Add "updating connectors for 2026.9" section: most connectors — update and republish; Navisworks — no 2026.9 connector; file uploads — see below. Cross-link to `it-admin/connector-updates`.                                                                                            | —                         |
| 11  | `next/connectors/file-uploads.mdx`                       | MERGE   | `connectors/file-uploads`                       | Add `<Warning>` block: STL, 3MF, 3DS, AMF, DXF, X, E57, IGS/IGES, FBX, PLY, SLDPRT removed from default upload path. Tekla Structures now supported. Compatibility mode (legacy path) ends 1 Nov 2026. Remove any Current description of these formats as supported on the default path. | Old format list           |
| 12  | `next/connectors/revit/introduction.mdx`                 | MERGE   | `connectors/revit/revit`                        | Add section: Apply Transform toggle, model placement picker, placement record (`modelPlacement.*` in `eav.model`).                                                                                                                                                                       | —                         |
| 13  | `next/connectors/revit/migration.mdx`                    | MERGE   | `connectors/revit/revit`                        | Add "Upgrade to 2026.9" subsection: re-publish once for placement; switch scripts from `root.referencePointTransform` to bundle `modelPlacement`. Keep as a clearly marked sub-section or link to a standalone upgrade page if the connector page is already long.                       | —                         |
| 14  | `next/connectors/grasshopper/introduction.mdx`           | MERGE   | `connectors/grasshopper/grasshopper`            | Add section: renamed nodes (Load → Load(legacy)), new Explore node for relational data, extra objects access.                                                                                                                                                                            | —                         |
| 15  | `next/connectors/grasshopper/upgrading.mdx`              | MERGE   | `connectors/grasshopper/grasshopper`            | Add "Upgrade to 2026.9" subsection: mechanical path to switch existing scripts to current Load and Publish nodes. Scripts continue to work; nothing deleted on canvas.                                                                                                                   | —                         |
| 16  | `next/connectors/navisworks/introduction.mdx`            | REPLACE | `connectors/navisworks/navisworks`              | Replace or prominently update: no 2026.9 Navisworks connector; 2026.8 was the last release; upload NWC/NWD (up to 2 GB direct, up to 6 GB via ACC). Add `<Warning>` at top.                                                                                                              | Old connector description |
| 17  | `next/connectors/power-bi/introduction.mdx`              | REPLACE | `connectors/power-bi/power-bi`                  | Replace: GetTables replaces GetByUrl; Objects/Properties/Relations pattern; Object Key join; 3D visual requires WebGPU. Full page rewrite targeting 2026.9 as current.                                                                                                                   | Old GetByUrl instructions |
| 18  | `next/connectors/power-bi/migration.mdx`                 | MERGE   | `connectors/power-bi/power-bi`                  | Add "Upgrade from 2026.8" section: no automatic conversion; pin the broken report; rebuild queries with Get Tables; replace 3D visual.                                                                                                                                                   | —                         |
| 19  | `next/connectors/cloud-integrations/trimble-connect.mdx` | CREATE  | `connectors/cloud-integrations/trimble-connect` | New page. Port content: beta status, service account for background sync, 5-min polling, supported formats (RVT, IFC, NWD/NWC, 3DM, SKP, DGN/DWG). Add `<Warning>` for beta. Cross-link from `connectors/overview` and `it-admin/introduction`.                                          | —                         |

### 3D Viewer

| #   | /next/ source                     | Action  | Destination              | Content work                                                                                                                                                                                                                                                                                                | Remove from Current             |
| --- | --------------------------------- | ------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| 20  | `next/3d-viewer/introduction.mdx` | REPLACE | `3d-viewer/introduction` | Full rewrite. New dockable panels: Selection, Filters, Views, Elements, SQL, Inspector, Materials, Browse. Section planes (not box). Sketch, Measure, GroupBy. Elements table with Export to Excel and Update parameters. Remove any description of controls, panels, or capabilities that no longer exist. | Old viewer controls description |

### Analytics

| #   | /next/ source                                       | Action | Destination                                                    | Content work                                                                                                                                                                                                                                                                  | Remove from Current                  |
| --- | --------------------------------------------------- | ------ | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| 21  | `next/analytics/dashboards.mdx`                     | MERGE  | `analytics/intelligence-dashboards`                            | Add opening note: Dashboards load 2026.9-format models natively. Compatibility mode not required for Dashboards. Add note re: widget availability (link to new page). Remove any instruction to enable compatibility mode for Dashboards.                                     | Compatibility mode instruction       |
| 22  | `next/analytics/dashboards-widget-availability.mdx` | CREATE | `analytics/dashboards-widget-availability`                     | New page. Port the not-yet-ported widget list. Clearly label as a transition-state page ("Widgets in the following list appear as placeholders until ported"). Add pointer to update this page when widgets are ported (per the agent instruction in the source).             | —                                    |
| 23  | `next/analytics/data-conditioning.mdx`              | MERGE  | `beta/parameter-updater` (or wherever Parameter Updater lives) | Add "In 2026.9" section: batch-edit from Elements panel, not dashboard-widget path; still logs as Issue. Cross-link to existing documentation for editable types, connector apply steps, known limitations.                                                                   | —                                    |
| 24  | `next/analytics/data-validation/overview.mdx`       | MERGE  | `analytics/data-validation/overview` (or equivalent)           | Add "What changed in 2026.9" section: empty default scope; related objects checks (Add related object, direction, all/any); label mapping; path matching (exact/suffix/regex); paths changed to `properties.Parameters.*`. Remove "Project standards" if it no longer exists. | Project standards section if removed |
| 25  | `next/analytics/intelligence.mdx`                   | CREATE | `analytics/intelligence`                                       | New page. Port content: Intelligence Chat surface, project sidebar, viewer sparkle, Skills invocation (`/skill-name`), reads 2026.9-format versions only. Enterprise/plan gate note.                                                                                          | —                                    |
| 26  | `next/analytics/intelligence-skills.mdx`            | CREATE | `analytics/intelligence-skills`                                | New page. Port content: reusable playbooks, draft with AI, save chat as skill, Knowledge files, workspace/private visibility.                                                                                                                                                 | —                                    |
| 27  | `next/analytics/intelligence-rules.mdx`             | CREATE | `analytics/intelligence-rules`                                 | New page. Port content: standing AI Rules, workspace governance, currency/language/safety/disclosure.                                                                                                                                                                         | —                                    |
| 28  | `next/analytics/reports.mdx`                        | CREATE | `analytics/reports`                                            | New page. Port content: Report artifact under Reports in project sidebar; Chat creates it; edit layout, change sources and knobs, tabs, compare versions, share link. Viewing does not spend AI credit; Chat turns that edit it do.                                           | —                                    |

### Workflows

| #   | /next/ source                                                           | Action  | Destination                                                         | Content work                                                                                                                                                                                                               | Remove from Current    |
| --- | ----------------------------------------------------------------------- | ------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| 29  | `next/workflows/overview.mdx`                                           | MERGE   | `workflows/overview`                                                | Add "Updated for 2026.9" section that notes which workflow guides remain valid and which steps have been replaced (viewer, Intelligence, Diff view). Do not clone the hub; add a callout pointing to the What's new pages. | —                      |
| 30  | `next/workflows/assess-model-changes-with-intelligence.mdx`             | REPLACE | `workflows/assess-model-changes` (or equivalent diff-view workflow) | Replace Diff view instructions with Intelligence Chat approach. Add note: Diff view is deprecated. Cross-link to `analytics/intelligence`.                                                                                 | Diff view instructions |
| 31  | `next/workflows/benchmark-against-your-portfolio-with-intelligence.mdx` | CREATE  | `workflows/benchmark-against-your-portfolio`                        | New page. Port content: pin past-project figures as Knowledge, benchmark in Chat, compare inside the conversation. Plan/Enterprise gate note.                                                                              | —                      |
| 32  | `next/workflows/take-off-quantities-with-intelligence.mdx`              | CREATE  | `workflows/take-off-quantities`                                     | New page. Port content: quantity takeoff and cost estimate from model via Chat, rate card, flagging un-priceable items.                                                                                                    | —                      |
| 33  | `next/workflows/validate-incoming-models-automatically.mdx`             | CREATE  | `workflows/validate-incoming-models-automatically`                  | New page. Port content: Validation Check with auto-trigger, author once, runs on every new version, rules-based (not Chat).                                                                                                | —                      |

### Developers

| #   | /next/ source                                        | Action      | Destination                                                                    | Content work                                                                                                                                                                                                                                                                  | Remove from Current    |
| --- | ---------------------------------------------------- | ----------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| 34  | `next/developers/introduction.mdx`                   | MERGE       | `developers/introduction`                                                      | Add "What changed in 2026.9" callout block with links to object model pages and What's new for developers. Do not rewrite the main intro.                                                                                                                                     | —                      |
| 35  | `next/developers/api/introduction.mdx`               | MERGE       | `developers/api/graphql` and `developers/api/rest`                             | Add "In 2026.9" section to both: replace `object.children` filtering with EAV property queries; new REST endpoints for bundle artifacts; link to object model overview.                                                                                                       | —                      |
| 36  | `next/developers/object-model/overview.mdx`          | CREATE      | `developers/object-model/overview`                                             | New page. Port content: columnar property store + relational layer vs tree-and-Proxy. Before/after comparison. Who's affected, what changes. Link to relations, geometry encoding, version metadata pages.                                                                    | —                      |
| 37  | `next/developers/object-model/relations.mdx`         | CREATE      | `developers/object-model/relations`                                            | New page. Port content: typed relations (containment, connectivity, systems, materials) replacing Proxies. Directed edges, structural nodes.                                                                                                                                  | —                      |
| 38  | `next/developers/object-model/geometry-encoding.mdx` | CREATE      | `developers/object-model/geometry-encoding`                                    | New page. Port content: SGEO binary format, header + per-primitive body, geometry table, viewer .dat. Before/after with geometry schema.                                                                                                                                      | —                      |
| 39  | `next/developers/object-model/version-metadata.mdx`  | CREATE      | `developers/object-model/version-metadata`                                     | New page. Port content: no root object in 2026.9; version record, model ingestion, provenance stamp, model-scoped properties replace root object jobs. Script migration patterns.                                                                                             | —                      |
| 40  | `next/developers/sdks/dotnet/breaking-changes.mdx`   | MERGE       | `developers/sdks/dotnet/getting-started/scripts-and-notebooks` (or equivalent) | Add "Migrate to 2026.9" section: Receive2 → Receive3; `Model` with columnar properties + typed relations; before/after code samples (Prior to 2026.9 / 2026.9 tabs per docs-versioned-snippets rule).                                                                         | —                      |
| 41  | `next/developers/sdks/python/breaking-changes.mdx`   | MERGE       | `developers/sdks/python/introduction` (or equivalent quickstart)               | Add "Migrate to 2026.9" section: `operations.receive` → `operations.receive3`; `Model` with columnar properties; before/after code samples.                                                                                                                                   | —                      |
| 42  | `next/developers/sdks/typescript/introduction.mdx`   | STUB→RETIRE | `developers/sdks/typescript/introduction`                                      | Content is a stub pointing to Current; add objectloader2 warning to Current page. Stub content: objectloader/objectloader2 users stop getting data for 2026.9 bundles. Add `<Warning>` to the Current JS/TS page. Redirect next/ stub to Current.                             | —                      |
| 43  | `next/developers/automate/introduction.mdx`          | MERGE       | `developers/automate/introduction`                                             | Add "In 2026.9" section: Functions page (workspace level), automations created from project Settings → Automations instead of old wizard.                                                                                                                                     | Old wizard description |
| 44  | `next/developers/automate/attaching-results.mdx`     | MERGE       | `developers/automate/getting-started` (or results page)                        | Add note: `AttachResultToObjects` / `attach_result_to_objects` still keys by content-hashed id; functions work against 2026.9 models. Link to viewing-results note.                                                                                                           | —                      |
| 45  | `next/developers/automate/viewing-results.mdx`       | MERGE       | `developers/automate/getting-started` (or results page)                        | Add `<Warning>`: results doughnut icon missing for models in the 2026.9 data model; results are recorded and runs complete; UI gap under active development.                                                                                                                  | —                      |
| 46  | `next/developers/building-applications.mdx`          | CREATE      | `developers/building-applications`                                             | New page. Port content: app builders (dashboards, internal tools, web apps) — no root object, no object graph; bundle/parquet; link to building-integrations/load.                                                                                                            | —                      |
| 47  | `next/developers/building-integrations.mdx`          | CREATE      | `developers/building-integrations/overview`                                    | New page. Port content: language-neutral model; bundle (parquet files); bundle builder; producer and consumer roles; where publish and load go.                                                                                                                               | —                      |
| 48  | `next/developers/building-integrations/load.mdx`     | CREATE      | `developers/building-integrations/load`                                        | New page. Port content: list artifacts, presigned URLs, download parquet, rebuild from three key spaces joined by relations.                                                                                                                                                  | —                      |
| 49  | `next/developers/building-integrations/publish.mdx`  | CREATE      | `developers/building-integrations/publish`                                     | New page. Port content: ingestion sequence; open ingestion, write bundle, upload, version appears on success; build order.                                                                                                                                                    | —                      |
| 50  | `next/developers/server/introduction.mdx`            | STUB→RETIRE | `developers/server/introduction`                                               | Stub: content not yet available. No content to port. Redirect to Current server page.                                                                                                                                                                                         | —                      |
| 51  | `next/developers/viewer/introduction.mdx`            | MERGE       | `developers/viewer/introduction`                                               | Add "In 2026.9" section: @speckle/viewer receives parquet bundle not object graph; two options to keep rendering (patch path + new bundle loader). Link to loading-bundles page. Add `<Warning>` at top: versions in 2026.9 format give nothing to draw until app is updated. | —                      |
| 52  | `next/developers/viewer/loading-bundles.mdx`         | CREATE      | `developers/viewer/loading-bundles`                                            | New page. Port content: sample code and step-by-step path for rendering 2026.9 bundle versions with the published Viewer package without waiting for a package release.                                                                                                       | —                      |

---

## 4. Content decisions

**Decision: "before 2026.9" framing everywhere.** Do not call the old model "legacy". Do not use "current" as a content term. Where a before/after table or code block is needed, use tabs labelled "Prior to 2026.9" and "2026.9" per `docs-versioned-snippets.md`.

**Decision: compatibility mode callout is a single cross-link, not repeated content.** Pages that touch data format (connectors, uploads, Automate) carry a brief `<Note>` pointing to `it-admin/compatibility-mode` and `workspaces/data-model-migration`. The compatibility mode page itself holds all the rules. No page repeats those rules inline.

**Decision: the /next/whats-new comparison table is not ported.** It is a version-selector artefact. The three What's new pages replace it. The comparison table content is distributed across those three pages.

**Decision: connector migration sub-pages (revit/migration, grasshopper/upgrading, power-bi/migration) are merged into the connector's main page, not created as standalone pages.** They are "upgrade to 2026.9" sub-sections. If the connector page becomes too long (more than ~1500 words after merge), split the upgrade section out as `connectors/<tool>/upgrade.mdx`.

**Decision: Intelligence is a user-facing feature first.** Analytics/intelligence and its child pages are created in the user guides tree, not the developer docs tree. Developer API consumers go to `developers/api/introduction` for the API side.

**Decision: dashboard widget availability page is a temporary state page.** `analytics/dashboards-widget-availability` is kept as a short-lived page. Add a note at the top: "This page is maintained as widgets are ported. When the last widget is ported, this page will redirect to Dashboards." Remove widgets from the list as they land.

**Decision: roles and permissions /next/ stub redirects to Current.** The /next/ page is a placeholder with no content. No content work. `next/it-admin/roles-and-permissions` → `workspaces/roles-and-seats`.

**Decision: Automate results UI gap gets a Warning, not a full page.** The gap (doughnut icon missing) is merged into the Automate developer page as a `<Warning>`. It is not a standalone page in the unified set.

**Decision: self-hosted has one exception page.** See Section 8.

---

## 5. What's new pages — required content

### `whats-new/users.mdx`

**New:**

- Intelligence Chat (project sidebar + viewer sparkle) — link to `analytics/intelligence`
- Intelligence Skills — link to `analytics/intelligence-skills`
- Intelligence Reports — link to `analytics/reports`
- AI Rules for workspace — link to `analytics/intelligence-rules`
- Trimble Connect beta — link to `connectors/cloud-integrations/trimble-connect`
- Workspace Usage page in Settings — link to `workspaces/usage`

**Changed:**

- 3D viewer: dockable panels, Sketch, Measure, GroupBy, Elements table + Export + Update parameters, section planes replacing box — link to `3d-viewer/introduction`
- Workspace sidebar: Home, Projects, Intelligence, Documents (when enabled), Team, Settings — link to `workspaces/introduction`
- Workspace settings: new entries (AI features switch, Skills, AI Rules) — link to `workspaces/configuration`
- Dashboards load 2026.9 models natively; some widgets pending — link to `analytics/dashboards-widget-availability`
- Parameter Updater: now in Elements panel, not dashboard — link to updated parameter-updater page
- Data Validation: empty default scope; related objects checks; paths now `properties.Parameters.*` — link to validation page
- Grasshopper: Load node renamed Load(legacy); new Explore node — link to `connectors/grasshopper/grasshopper`
- Revit: Apply Transform toggle, placement picker — link to `connectors/revit/revit`
- Navisworks: no 2026.9 connector; upload NWC/NWD — link to `connectors/navisworks/navisworks`
- Power BI: Get Tables replaces Get By URL; 3D visual — link to `connectors/power-bi/power-bi`
- Diff view deprecated; Intelligence Chat replaces it — link to updated workflow page
- File uploads: formats removed from default path — link to `connectors/file-uploads`

**Action required:**

- Update Grasshopper scripts: replace Load node
- Update Power BI reports: no automatic migration; see upgrade guide
- Move file upload workflows for removed formats (STL, FBX, etc.) to supported formats or compatibility mode before 1 November 2026
- Workspace admins: request compatibility mode before 1 November 2026 if ACC sync or drag-and-drop workflows need it

### `whats-new/developers.mdx`

**New:**

- Object model: columnar property store + relational layer — link to `developers/object-model/overview`
- Typed relations replace Proxies — link to `developers/object-model/relations`
- Geometry encoding: SGEO binary format — link to `developers/object-model/geometry-encoding`
- No root object: version metadata split across four places — link to `developers/object-model/version-metadata`
- Bundle format: parquet files, ingestion sequence — link to `developers/building-integrations/overview`
- Bundle loader for Viewer apps — link to `developers/viewer/loading-bundles`

**Changed:**

- .NET SDK: Receive2 → Receive3; `Model` type — link to SDK migration section
- specklepy: `operations.receive` → `operations.receive3` — link to SDK migration section
- GraphQL/REST: `object.children` filtering removed; EAV property queries — link to `developers/api/introduction`
- Automate: Functions page at workspace level; automations from project Settings → Automations — link to `developers/automate/introduction`
- Automate results UI: doughnut icon missing for 2026.9 models — link to `developers/automate`

**Action required:**

- `.NET` scripts: update `Receive2` calls to `Receive3`
- Python scripts: update `operations.receive` to `operations.receive3`
- Apps using `object.children` filtering: update to property queries — deadline: 1 November 2026
- Apps building on `@speckle/objectloader` or `@speckle/objectloader2`: update to bundle loader — starts returning 404 for 2026.9 versions immediately
- Automate functions using `AttachResultToObjects`: test with a 2026.9-format model; results record correctly, UI display has known gap

### `whats-new/it-admins.mdx`

**New:**

- Compatibility mode (ACC sync + drag-and-drop only) — link to `it-admin/compatibility-mode`
- AI features toggle in workspace General settings

**Changed:**

- Connector upgrade window: 1 September–1 November 2026 — link to `it-admin/connector-updates`
- Trimble Connect: setup requires service account — link to `connectors/cloud-integrations/trimble-connect`
- File upload formats removed from default path — link to `connectors/file-uploads`
- Roles and permissions: unchanged — link to `workspaces/roles-and-seats`

**Action required (with dates):**

- **By 1 September 2026:** Begin connector update rollout across the estate
- **Before 1 November 2026:** Complete connector updates; request compatibility mode if needed for ACC sync or drag-and-drop workflows; move file upload workflows off removed formats
- **1 November 2026:** Compatibility mode ends; legacy file upload path closes

---

## 6. Agent/Fin AI migration plan

**Context:** Every `/next/` page carries a `<Visibility for="agents">` block that contains routing metadata and version authority instructions. These blocks are what currently attempts to route Fin AI correctly between the two doc sets. After the merge, there is one doc set and no version duality; these blocks are removed from every migrated page. Fin AI reads whatever is live on the unified doc site.

### What happens to the Visibility blocks

The `<Visibility for="agents">` blocks are not ported. They are stripped as step 1 of the migration treatment (Section 2). After the merge:

- Every topic has exactly one page, reflecting 2026.9 state.
- There is no "prefer this version over conflicting earlier guidance" disambiguation needed — there is only one version.
- Fin AI reads the merged pages directly without routing instructions.

### What replaces the routing instructions

**Nothing at the page level.** The routing logic was needed only because two versions of the same content coexisted. Once the pages are merged, the authority is implicit: the page is the current state.

**The llms.txt does the aggregate framing.** Jonathon manages llms.txt directly. After the migration is complete — after redirects are live and /next/ pages are removed from the sitemap — the llms.txt entry for docs.speckle.systems/llms.txt should be updated to reflect the single unified set. This is the only change to llms.txt the plan recommends. The specific wording is Jonathon's call; the migration plan's job is to make the content consistent so the framing is accurate.

### Fin AI final check

Before removing /next/ pages from the sitemap and nav, verify Fin AI with these test queries:

1. "How do I load a Speckle model in Python?" — should describe `operations.receive3`, not walk a Base tree.
2. "What happened to object.children in the API?" — should describe EAV queries.
3. "Can I still use compatibility mode?" — should describe `it-admin/compatibility-mode` correctly.
4. "Which file formats can I upload?" — should list 2026.9 default-path formats, not include STL/FBX.
5. "Where is the Automate section in the workspace?" — should describe Functions page, not old wizard.

If Fin AI returns a mix of 2026.9 and pre-2026.9 answers after the migration, the cause is either: (a) cached index not yet refreshed, or (b) a page was not updated. Identify the page from the answer text and update it before declaring the migration complete.

### During migration (while both sets coexist)

The /next/ Visibility blocks stay in place during the migration. Pages are migrated and /next/ sources are retired release unit by release unit (see Section 9). Do not remove a /next/ page from the sitemap or nav until its content has landed in the unified set and the redirect is live.

---

## 7. Self-hosted as contained exception

**Decision: one compatibility page, callouts only where instructions would be wrong.**

Self-hosted servers on versions before 2026.9 are addressed in two places:

1. **`it-admin/compatibility-mode`** (created in this migration) — full compatibility mode rules, deadline, how to request. This is the single source of truth for self-hosted operators whose deployment hasn't moved to 2026.9.
2. **A `<Note>` on affected pages only** — pages where the 2026.9 instruction would be incorrect for a self-hosted server on an older version carry a `<Note>`: "On a self-hosted server running before 2026.9, this step differs. See [Compatibility mode](/it-admin/compatibility-mode)." This `<Note>` is added to: `connectors/file-uploads`, `analytics/intelligence`, `analytics/intelligence-skills`, `analytics/intelligence-rules`, `analytics/reports`, `it-admin/introduction`, and any page whose content is exclusively a 2026.9 behaviour.

**Pages that do NOT get a self-hosted callout:** developer object-model pages, SDK migration pages, building-integrations pages, viewer bundle-loading pages. These address a code-level migration, not a deployment version.

**No "self-hosted track".** There is no separate sub-tree or tab system for self-hosted. A single callout per affected page is sufficient. Self-hosted operators who need deeper deployment guidance already go to `developers/server/`.

---

## 8. Redirect strategy

### Rules

- All redirects are permanent (HTTP 301).
- Redirects are configured in Mintlify's `redirects` array in `mint.json`. All 52 source paths (and their `/next/` prefixes) must be listed.
- Each redirect points to the canonical destination page in the unified set. No redirect chains.
- Where a `/next/` page has been merged into an existing page, the redirect points to the destination page. If the content lands under a specific anchor, add the anchor (e.g. `/connectors/revit/revit#upgrade-to-20269`).
- Include `.md` and `/index` variants only if Mintlify generates them — check after deploy.
- Remove all `/next/` entries from `navigation.json` and from the sitemap (`mint.json` pages array or equivalent) before the final redirect deploy.
- After deploy, run a URL check across all 52 source paths to confirm no 404s.

### Redirect table

| Source URL                                                           | Destination URL                                                 |
| -------------------------------------------------------------------- | --------------------------------------------------------------- |
| `/next/welcome`                                                      | `/quickstart/welcome`                                           |
| `/next/whats-new`                                                    | `/whats-new/users`                                              |
| `/next/workspaces/introduction`                                      | `/workspaces/introduction`                                      |
| `/next/workspaces/settings`                                          | `/workspaces/configuration`                                     |
| `/next/workspaces/usage`                                             | `/workspaces/usage`                                             |
| `/next/it-admin/introduction`                                        | `/it-admin/introduction`                                        |
| `/next/it-admin/compatibility-mode`                                  | `/it-admin/compatibility-mode`                                  |
| `/next/it-admin/connector-updates`                                   | `/it-admin/connector-updates`                                   |
| `/next/it-admin/roles-and-permissions`                               | `/workspaces/roles-and-seats`                                   |
| `/next/connectors/overview`                                          | `/connectors/overview`                                          |
| `/next/connectors/file-uploads`                                      | `/connectors/file-uploads`                                      |
| `/next/connectors/revit/introduction`                                | `/connectors/revit/revit`                                       |
| `/next/connectors/revit/migration`                                   | `/connectors/revit/revit#upgrade-to-20269`                      |
| `/next/connectors/grasshopper/introduction`                          | `/connectors/grasshopper/grasshopper`                           |
| `/next/connectors/grasshopper/upgrading`                             | `/connectors/grasshopper/grasshopper#upgrade-to-20269`          |
| `/next/connectors/navisworks/introduction`                           | `/connectors/navisworks/navisworks`                             |
| `/next/connectors/power-bi/introduction`                             | `/connectors/power-bi/power-bi`                                 |
| `/next/connectors/power-bi/migration`                                | `/connectors/power-bi/power-bi#upgrade-to-20269`                |
| `/next/connectors/cloud-integrations/trimble-connect`                | `/connectors/cloud-integrations/trimble-connect`                |
| `/next/3d-viewer/introduction`                                       | `/3d-viewer/introduction`                                       |
| `/next/analytics/dashboards`                                         | `/analytics/intelligence-dashboards`                            |
| `/next/analytics/dashboards-widget-availability`                     | `/analytics/dashboards-widget-availability`                     |
| `/next/analytics/data-conditioning`                                  | `/beta/parameter-updater`                                       |
| `/next/analytics/data-validation/overview`                           | `/analytics/data-validation/overview`                           |
| `/next/analytics/intelligence`                                       | `/analytics/intelligence`                                       |
| `/next/analytics/intelligence-skills`                                | `/analytics/intelligence-skills`                                |
| `/next/analytics/intelligence-rules`                                 | `/analytics/intelligence-rules`                                 |
| `/next/analytics/reports`                                            | `/analytics/reports`                                            |
| `/next/workflows/overview`                                           | `/workflows/overview`                                           |
| `/next/workflows/assess-model-changes-with-intelligence`             | `/workflows/assess-model-changes`                               |
| `/next/workflows/benchmark-against-your-portfolio-with-intelligence` | `/workflows/benchmark-against-your-portfolio`                   |
| `/next/workflows/take-off-quantities-with-intelligence`              | `/workflows/take-off-quantities`                                |
| `/next/workflows/validate-incoming-models-automatically`             | `/workflows/validate-incoming-models-automatically`             |
| `/next/developers/introduction`                                      | `/developers/introduction`                                      |
| `/next/developers/api/introduction`                                  | `/developers/api/graphql`                                       |
| `/next/developers/object-model/overview`                             | `/developers/object-model/overview`                             |
| `/next/developers/object-model/relations`                            | `/developers/object-model/relations`                            |
| `/next/developers/object-model/geometry-encoding`                    | `/developers/object-model/geometry-encoding`                    |
| `/next/developers/object-model/version-metadata`                     | `/developers/object-model/version-metadata`                     |
| `/next/developers/sdks/dotnet/breaking-changes`                      | `/developers/sdks/dotnet/getting-started/scripts-and-notebooks` |
| `/next/developers/sdks/python/breaking-changes`                      | `/developers/sdks/python/introduction`                          |
| `/next/developers/sdks/typescript/introduction`                      | `/developers/sdks/typescript/introduction`                      |
| `/next/developers/automate/introduction`                             | `/developers/automate/introduction`                             |
| `/next/developers/automate/attaching-results`                        | `/developers/automate/getting-started`                          |
| `/next/developers/automate/viewing-results`                          | `/developers/automate/getting-started`                          |
| `/next/developers/building-applications`                             | `/developers/building-applications`                             |
| `/next/developers/building-integrations`                             | `/developers/building-integrations/overview`                    |
| `/next/developers/building-integrations/load`                        | `/developers/building-integrations/load`                        |
| `/next/developers/building-integrations/publish`                     | `/developers/building-integrations/publish`                     |
| `/next/developers/server/introduction`                               | `/developers/server/introduction`                               |
| `/next/developers/viewer/introduction`                               | `/developers/viewer/introduction`                               |
| `/next/developers/viewer/loading-bundles`                            | `/developers/viewer/loading-bundles`                            |

**Note on anchor suffixes:** The anchors `#upgrade-to-20269` in the redirect table are illustrative. Use the actual heading anchor Mintlify generates from the heading text in the merged page. Confirm anchors after each connector page merge.

**Note on trailing slashes:** Mintlify normalises trailing slashes. Test with and without after deploy.

**Post-deploy checklist:**

- [ ] All 52 source paths return 301 to the correct destination
- [ ] No destination URL returns 404
- [ ] `/next/` no longer appears in `navigation.json`
- [ ] `/next/` no longer appears in sitemap
- [ ] The Mintlify version selector entry for `2026.9` is removed from `mint.json`

---

## 9. Execution order — release units

Each release unit is a deployable batch. Deploy one unit before starting the next. Units are ordered by Fin AI and support impact — the questions Fin AI currently gets wrong most often come first.

### Unit 1: What's new + navigation scaffold

**Deploy first to give Fin AI a correct anchor while the rest migrates.**

Content:

- Create `whats-new/users.mdx`, `whats-new/developers.mdx`, `whats-new/it-admins.mdx` (all three, complete)
- Add `whats-new/` group to navigation

Workflow replacement: none yet — this is additive only.
Redirects: none yet — /next/ pages are not removed in this unit.
llms.txt: no changes in this unit.
Fin AI verification: confirm Fin AI can find the What's new pages.

Completion check:

- [ ] Three What's new pages published and in navigation
- [ ] No /next/ pages removed yet

---

### Unit 2: IT admin + compatibility-mode + connector updates

**Highest support impact: compatibility mode deadline questions and connector upgrade questions.**

Content:

- MERGE `next/it-admin/introduction` → `it-admin/introduction`
- CREATE `it-admin/compatibility-mode`
- MERGE `next/it-admin/connector-updates` → `it-admin/connector-updates`
- STUB→RETIRE `next/it-admin/roles-and-permissions` (redirect only)

Workflow replacement: none.
Navigation: add `it-admin/compatibility-mode` to IT Administrators nav.
Redirects (deploy at end of unit):

- `/next/it-admin/introduction` → `/it-admin/introduction`
- `/next/it-admin/compatibility-mode` → `/it-admin/compatibility-mode`
- `/next/it-admin/connector-updates` → `/it-admin/connector-updates`
- `/next/it-admin/roles-and-permissions` → `/workspaces/roles-and-seats`
  Remove from /next/ nav: all four it-admin pages.
  llms.txt: no changes in this unit.

Completion check:

- [ ] `it-admin/compatibility-mode` published
- [ ] Four /next/it-admin/* pages redirect correctly
- [ ] Four /next/it-admin/* pages removed from nav and sitemap

---

### Unit 3: Connectors (all 10 pages)

**Second highest support impact: Power BI migration, Navisworks no-connector, Revit placement, file upload format removals.**

Content:

- MERGE `next/connectors/overview` → `connectors/overview`
- MERGE `next/connectors/file-uploads` → `connectors/file-uploads`
- MERGE `next/connectors/revit/introduction` + `next/connectors/revit/migration` → `connectors/revit/revit`
- MERGE `next/connectors/grasshopper/introduction` + `next/connectors/grasshopper/upgrading` → `connectors/grasshopper/grasshopper`
- REPLACE `next/connectors/navisworks/introduction` → `connectors/navisworks/navisworks`
- REPLACE `next/connectors/power-bi/introduction` + MERGE `next/connectors/power-bi/migration` → `connectors/power-bi/power-bi`
- CREATE `connectors/cloud-integrations/trimble-connect`

Navigation: add Trimble Connect to Connectors nav.
Redirects (deploy at end of unit): all 10 connector /next/ paths.
Remove from /next/ nav: all 10 connector pages.
llms.txt: no changes in this unit.

Completion check:

- [ ] All connector destination pages updated/created
- [ ] Navisworks `<Warning>` at top of page
- [ ] Power BI old GetByUrl instructions removed
- [ ] Ten /next/connectors/* paths redirect correctly
- [ ] Ten /next/connectors/* pages removed from nav and sitemap

---

### Unit 4: 3D viewer + workspaces + workflows

Content:

- REPLACE `next/3d-viewer/introduction` → `3d-viewer/introduction`
- MERGE `next/workspaces/introduction` → `workspaces/introduction`
- MERGE `next/workspaces/settings` → `workspaces/configuration`
- CREATE `workspaces/usage`
- MERGE `next/workflows/overview` → `workflows/overview`
- REPLACE `next/workflows/assess-model-changes-with-intelligence` → `workflows/assess-model-changes` (remove diff-view instructions)
- CREATE `workflows/benchmark-against-your-portfolio`
- CREATE `workflows/take-off-quantities`
- CREATE `workflows/validate-incoming-models-automatically`

Navigation: add `workspaces/usage`; add three new workflow pages; update workflow page link if title changes.
Redirects (deploy at end of unit): all /next/3d-viewer/, /next/workspaces/, /next/workflows/ paths.
Remove from /next/ nav: viewer, workspaces, workflows sections.

Completion check:

- [ ] 3d-viewer/introduction old panel descriptions removed
- [ ] Diff view instructions removed from assess-model-changes page
- [ ] Three new workflow pages published
- [ ] Thirteen /next/ paths redirect correctly
- [ ] Thirteen /next/ pages removed from nav and sitemap

---

### Unit 5: Analytics

Content:

- MERGE `next/analytics/dashboards` → `analytics/intelligence-dashboards`
- CREATE `analytics/dashboards-widget-availability`
- MERGE `next/analytics/data-conditioning` → `beta/parameter-updater`
- MERGE `next/analytics/data-validation/overview` → data validation page
- CREATE `analytics/intelligence`
- CREATE `analytics/intelligence-skills`
- CREATE `analytics/intelligence-rules`
- CREATE `analytics/reports`

Navigation: add all four new analytics pages.
Redirects (deploy at end of unit): all 8 /next/analytics/ paths.
Remove from /next/ nav: all analytics pages.

Completion check:

- [ ] Compatibility mode instruction removed from dashboards page
- [ ] Four new analytics pages published
- [ ] Eight /next/analytics/* paths redirect correctly
- [ ] Eight /next/analytics/* pages removed from nav and sitemap

---

### Unit 6: Developer docs (all 15 pages)

Content:

- MERGE `next/developers/introduction` → `developers/introduction`
- MERGE `next/developers/api/introduction` → GraphQL and REST pages
- CREATE `developers/object-model/overview`, `/relations`, `/geometry-encoding`, `/version-metadata` (4 pages)
- MERGE `next/developers/sdks/dotnet/breaking-changes` → .NET SDK page
- MERGE `next/developers/sdks/python/breaking-changes` → Python SDK page
- STUB→RETIRE `next/developers/sdks/typescript/introduction` + add `<Warning>` to Current JS/TS page
- MERGE `next/developers/automate/introduction` → automate introduction
- MERGE `next/developers/automate/attaching-results` + `next/developers/automate/viewing-results` → automate page
- CREATE `developers/building-applications`
- CREATE `developers/building-integrations/overview`, `/load`, `/publish` (3 pages)
- STUB→RETIRE `next/developers/server/introduction`
- MERGE `next/developers/viewer/introduction` → viewer introduction
- CREATE `developers/viewer/loading-bundles`

Navigation: add object-model sub-section with 4 pages; add building-integrations section with 3 pages; add building-applications; add viewer/loading-bundles.
Redirects (deploy at end of unit): all 15 /next/developers/ paths.
Remove from /next/ nav: all developer pages.

Completion check:

- [ ] Four object-model pages published
- [ ] Three building-integrations pages published
- [ ] SDK pages carry Before/After code tabs (Prior to 2026.9 / 2026.9)
- [ ] Automate UI gap `<Warning>` present on automate page
- [ ] objectloader `<Warning>` present on JS/TS SDK page
- [ ] Fifteen /next/developers/* paths redirect correctly
- [ ] Fifteen /next/developers/* pages removed from nav and sitemap

---

### Unit 7: Final teardown

**Deploy only when all 52 /next/ pages have been retired in units 2–6.**

- Remove `/next/` version entry from `mint.json` navigation versions
- Remove `next/welcome` and `next/whats-new` (redirects deploy in this unit)
- Confirm zero /next/ paths remain in sitemap
- Run full URL check across all 52 redirects
- Run Fin AI verification queries (Section 6)
- Update llms.txt to reflect unified doc set (Jonathon's edit)

Completion check:

- [ ] Version selector removed from Mintlify
- [ ] All 52 /next/* source paths return 301
- [ ] No 404s on any redirect destination
- [ ] Fin AI returns 2026.9-accurate answers on all five test queries
- [ ] llms.txt updated

---

## 10. Scope reconciliation

| Metric                           | Count |
| -------------------------------- | ----- |
| /next/ pages in repo             | 52    |
| Migration actions assigned       | 52    |
| Redirect destinations assigned   | 52    |
| Pages with action REPLACE        | 3     |
| Pages with action MERGE          | 22    |
| Pages with action CREATE         | 19    |
| Pages with action STUB→RETIRE    | 4     |
| Pages with action REDIRECT-ONLY  | 4     |
| New pages created (unified set)  | 19    |
| Existing pages updated           | 25    |
| Pages retired with redirect only | 8     |

**Verification:** 3 + 22 + 19 + 4 + 4 = 52. All /next/ pages accounted for.

### Completion checks per release unit

Unit 1 (What's new): 3 pages created, 0 redirects, 0 pages retired.
Unit 2 (IT admin): 1 created, 3 merged, 4 redirects, 4 /next/ pages retired.
Unit 3 (Connectors): 1 created, 6 merged/replaced, 10 redirects, 10 /next/ pages retired.
Unit 4 (Viewer/workspaces/workflows): 4 created, 5 merged/replaced, 13 redirects, 13 /next/ pages retired.
Unit 5 (Analytics): 4 created, 4 merged, 8 redirects, 8 /next/ pages retired.
Unit 6 (Developers): 9 created, 6 merged/retired, 15 redirects, 15 /next/ pages retired.
Unit 7 (Teardown): 2 remaining redirects, 0 content, confirm complete.

Running total after all units: 52 /next/ pages retired, 52 redirects live, 0 /next/ pages remaining in nav or sitemap.
