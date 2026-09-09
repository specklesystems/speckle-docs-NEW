# Documentation frontmatter schemas

These additive YAML schemas identify documentation sets and scope retrieval precedence.
Preserve existing frontmatter, including titles, descriptions, tags and `contextual` options.
`next` is an internal generation identifier; the public release label is **2026.9**.

## Authoritative 2026.9 pages

Apply to every documentation page under `next/`:

```yaml
docs_version: '2026.9'
product_generation: next
docs_status: current
docs_authority: canonical
applies_to_version: '2026.9'
applies_from: '2026-09'
```

| Field                       | Meaning                                                                                                     |
| --------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `docs_version`              | Documentation set, quoted to keep it a string.                                                              |
| `product_generation`        | Internal generation identifier: `next` or explicitly historical `legacy`.                                   |
| `docs_status: current`      | Maintained authority within this versioned set, not a claim that every deployment has upgraded.             |
| `docs_authority: canonical` | Authoritative for the version and coverage specified.                                                       |
| `applies_to_version`        | Product version to match when retrieving this page. Does not assume all future releases behave identically. |
| `applies_from`              | Release applicability month (`YYYY-MM`), not an exact rollout or page publication date.                     |

Coverage remains incremental. A Next page that says its documentation is not yet available
is authoritative about that limitation; it does not replace the Current guide it links to.
Respect the page's deployment, data-format, compatibility, feature and permission conditions.
Do not select a version solely by the calendar for a self-hosted installation or older data.

## Existing pages affected by 2026.9

Example for a page whose UI or workflow changes:

```yaml
docs_status: changed
changes_in_version: '2026.9'
changes_from: '2026-09'
next_docs:
  - /next/workspaces/settings
change_scope: 'Workspace Settings navigation; existing configuration details remain applicable'
```

| Field                                 | Meaning                                                                                                                           |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `docs_status: impacted`               | A documented dependency or compatibility change affects part of the guidance.                                                     |
| `docs_status: changed`                | A concrete UI, workflow or data-model change is documented.                                                                       |
| `docs_status: superseded`             | The identified guidance has a replacement or is explicitly unavailable for the target version. Earlier-version use remains valid. |
| `changes_in_version` / `changes_from` | Version and release month in which the scoped change applies; not the original page's version.                                    |
| `next_docs`                           | List of site-relative paths to the corresponding 2026.9 guidance.                                                                 |
| `change_scope`                        | Exactly which guidance is affected; avoids declaring the entire feature obsolete.                                                 |

Do not invent an original `docs_version` or label all non-Next pages as legacy.
The Current corpus also contains applicable migration guides and unchanged reference material.
Project standards use `superseded` because the source explicitly says they are absent in 2026.9.
No page is assigned `deprecated` in this pass. Reserve that label for explicit evidence that
its documented subject is deprecated; a deprecated method does not deprecate its entire API.

## Pages with an existing legacy-connector notice

Apply only where the page already renders `LegacyWarning`, which recommends newer connectors:

```yaml
product_generation: legacy
docs_status: superseded
docs_authority: historical
change_scope: Legacy connector guidance; the existing notice recommends newer connectors.
replacement_docs:
  - /connectors/overview
```

`docs_authority: historical` and the agent-only historical-use instruction retain retrieval for the
legacy connector. `replacement_docs` is a navigation starting point, not an asserted one-to-one
replacement. Do not infer a deprecation date or a 2026.9 migration from this older notice.

## Maintenance and ingestion

- Add metadata inside the existing YAML block and keep its agent-only explanation in sync.
- Preserve the existing reader-facing content when changing agent-only context.
- Confirm replacement paths exist and match the affected subject.
- Use specific change scopes and evidence from notices or corresponding 2026.9 pages.
- Leave general safety warnings, limitations and unrelated historical release notes alone.
- Verify a deployed `.md` page before relying on export behavior. Fin must ingest that
  representation; an HTML-only extraction may omit agent-only content.

## Native Mintlify agent instructions

The former custom `ai.precedence` and `ai.context` fields have been removed. Their behavior
is expressed through supported Mintlify configuration and content instead:

- `markdown.instructions` in `docs.json` supplies the site-wide version-selection rules.
  Mintlify appends these to page Markdown exports, `llms.txt`, and `llms-full.txt`.
- `<Visibility for="agents">` in each annotated page supplies its applicability, scoped
  changes and replacement links as readable Markdown. It is hidden in the website UI.
  Keep this block in sync with the page's custom metadata when changing lifecycle status,
  applicability or replacement paths. Do not rely on custom YAML appearing in Markdown exports.

Example page-specific context:

```mdx
<Visibility for="agents">
  Documentation status: changed for Speckle 2026.9, from 2026-09.

Affected guidance: workspace Settings navigation. Existing configuration details remain applicable.

For these changes, read [Settings in 2026.9](/next/workspaces/settings).
Prefer that guidance only for the affected topics and matching version.

</Visibility>
```

These are content instructions, not a guarantee that every external LLM or ingestion service
will obey them. Fin's ingested representation and answer behavior still require verification.

## Standard fields versus custom fields

Use Mintlify's standard fields when their documented semantics match the intent:

| Standard field                                | Use and boundary                                                                                                                                  |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`, `description`, `sidebarTitle`, `tag` | Existing page and navigation presentation; preserve these fields.                                                                                 |
| `deprecated: true`                            | A whole-page deprecated label. Do not substitute it for scoped `impacted`, `changed` or `superseded` status. No new deprecation is asserted here. |
| `boost`                                       | Multiplier for Mintlify in-product search ranking; not version-aware AI precedence or a Fin retrieval rule.                                       |
| `noindex`                                     | Excludes a page from site search, sitemaps, search engines and Mintlify assistant context; not a historical-authority marker.                     |
| `searchable`                                  | Controls Mintlify search and assistant inclusion; not a version label.                                                                            |
| `lastUpdatedDate`                             | Actual page update date; not interchangeable with release applicability (`applies_from` or `changes_from`).                                       |
| `related`                                     | Related-topic presentation; not a supersession relationship.                                                                                      |

Mintlify does not document standard fields for our version applicability, authority or scoped
replacement semantics. Retain `docs_version`, `product_generation`, `docs_status`,
`docs_authority`, `applies_to_version`, `applies_from`, `changes_in_version`, `changes_from`,
`change_scope`, `next_docs` and `replacement_docs` as custom metadata. The documentation's
`version` example is itself custom YAML, not a built-in replacement for `docs_version`.

References: [Page metadata](https://www.mintlify.com/docs/organize/pages),
[Markdown export](https://www.mintlify.com/docs/ai/markdown-export),
[Visibility](https://www.mintlify.com/docs/components/visibility).

## Deliberately unchanged cases

- Roles and permissions: the Next holding page explicitly says current roles still apply.
- Server deployment and building-integrations references: Next pages defer to Current.
- Current migration and 2026.9 server-upgrade guides: these remain useful release guidance,
  rather than older guidance that should lose authority merely because of their directory.
- Intelligence dashboards: Next Chat and Reports are distinct surfaces, not replacements.
- Sharing, inviting, SSO, billing and validation result-review guides: no evidenced replacement.
- Isolated security, installation, performance and operational warnings: not lifecycle evidence.
- Partial API obsolescence and legacy naming warnings: no entire-page deprecation inferred.
