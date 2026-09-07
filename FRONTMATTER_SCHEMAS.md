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
ai:
  precedence: prefer_for_matching_version
  context: >-
    Authoritative Speckle 2026.9 documentation for the topic covered here.
    For Speckle 2026.9, prefer this page over conflicting earlier guidance.
    Follow linked Current documentation for unchanged topics and where this page
    says coverage is not yet available. Respect data-format, deployment, plan,
    permission, and compatibility limitations stated in the page.
```

| Field | Meaning |
| --- | --- |
| `docs_version` | Documentation set, quoted to keep it a string. |
| `product_generation` | Internal generation identifier: `next` or explicitly historical `legacy`. |
| `docs_status: current` | Maintained authority within this versioned set, not a claim that every deployment has upgraded. |
| `docs_authority: canonical` | Authoritative for the version and coverage specified. |
| `applies_to_version` | Product version to match when retrieving this page. Does not assume all future releases behave identically. |
| `applies_from` | Release applicability month (`YYYY-MM`), not an exact rollout or page publication date. |
| `ai.precedence` | Corpus convention for ranking matching guidance, not a built-in Fin configuration setting. |
| `ai.context` | Readable scope and conflict-resolution rule. |

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
change_scope: "Workspace Settings navigation; existing configuration details remain applicable"
ai:
  precedence: defer_for_changed_topics
  context: >-
    For Speckle 2026.9, use next_docs for the changes identified in change_scope.
    This page remains applicable to earlier experiences and unchanged guidance.
    Do not treat the entire page or feature as deprecated.
```

| Field | Meaning |
| --- | --- |
| `docs_status: impacted` | A documented dependency or compatibility change affects part of the guidance. |
| `docs_status: changed` | A concrete UI, workflow or data-model change is documented. |
| `docs_status: superseded` | The identified guidance has a replacement or is explicitly unavailable for the target version. Earlier-version use remains valid. |
| `changes_in_version` / `changes_from` | Version and release month in which the scoped change applies; not the original page's version. |
| `next_docs` | List of site-relative paths to the corresponding 2026.9 guidance. |
| `change_scope` | Exactly which guidance is affected; avoids declaring the entire feature obsolete. |
| `ai.precedence: defer_for_changed_topics` | Prefer linked 2026.9 guidance only for the specified changes and matching version. |

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
ai:
  precedence: historical_only
  context: >-
    This page documents a legacy connector and may be out of date, as stated in
    its LegacyWarning notice. Use it for that legacy connector only. For newer
    connectors, start with replacement_docs and use /next/connectors/overview
    for Speckle 2026.9 differences. This does not assert product removal.
```

`docs_authority: historical` and `ai.precedence: historical_only` retain retrieval for the
legacy connector. `replacement_docs` is a navigation starting point, not an asserted one-to-one
replacement. Do not infer a deprecation date or a 2026.9 migration from this older notice.

## Maintenance and ingestion

- Add these fields inside the existing YAML block; do not rewrite page content.
- Confirm replacement paths exist and match the affected subject.
- Use specific change scopes and evidence from notices or corresponding 2026.9 pages.
- Leave general safety warnings, limitations and unrelated historical release notes alone.
- Preserve this metadata with each indexed page/chunk if the ingestion pipeline permits it.
  The repository change alone does not establish that Fin ingests custom YAML fields or
  enforces these precedence values. Verify the actual ingested representation and conflicting
  old/new support queries before relying on the metadata for answer selection.

## Deliberately unchanged cases

- Roles and permissions: the Next holding page explicitly says current roles still apply.
- Server deployment and building-integrations references: Next pages defer to Current.
- Current migration and 2026.9 server-upgrade guides: these remain useful release guidance,
  rather than older guidance that should lose authority merely because of their directory.
- Intelligence dashboards: Next Chat and Reports are distinct surfaces, not replacements.
- Sharing, inviting, SSO, billing and validation result-review guides: no evidenced replacement.
- Isolated security, installation, performance and operational warnings: not lifecycle evidence.
- Partial API obsolescence and legacy naming warnings: no entire-page deprecation inferred.
