# Changelog plan schema

`changelog.json` is the agent-authored boundary between collected evidence and
deterministic rendering.

```json
{
  "week": "2026-W41",
  "window": {
    "from": "2026-10-02T14:00:00Z",
    "to": "2026-10-09T14:00:00Z"
  },
  "entries": [
    {
      "id": "speckle-sharp-connectors#1577",
      "status": "available",
      "kind": "feature",
      "publication": {
        "basis": "technical-behavior",
        "rationale": "Adds a capability users can exercise in the connector."
      },
      "area": "Integrations",
      "component": "Desktop connectors",
      "summary": "Plant 3D solids load through the dedicated solid converter",
      "scope": "connector-release",
      "version": "2026.9.1",
      "date": "2026-10-05",
      "availability": {
        "evidenceUrl": "https://github.com/specklesystems/speckle-sharp-connectors/releases/tag/2026.9.1",
        "occurredAt": "2026-10-05T12:00:00Z"
      },
      "requirements": [
        {
          "component": "desktop connector",
          "evidenceUrl": "https://github.com/specklesystems/speckle-sharp-connectors/pull/1577"
        }
      ],
      "evidence": [
        {
          "label": "Release 2026.9.1",
          "url": "https://github.com/specklesystems/speckle-sharp-connectors/releases/tag/2026.9.1",
          "kind": "release"
        },
        {
          "label": "PR #1577",
          "url": "https://github.com/specklesystems/speckle-sharp-connectors/pull/1577",
          "kind": "implementation"
        }
      ]
    }
  ]
}
```

Rules enforced by the renderer:

- `week` is `YYYY-Www`; the environment `CHANGELOG_WEEK` must match it.
- `window.from` and `window.to` are UTC instants with `from < to`.
- `id` is a unique stable change identity, normally `<repo>#<PR>`. Evidence
  URLs may repeat across entries from one release.
- `status` is `available`, `prerelease`, or `landed`.
- `kind` is a public change label defined in
  [`assets/change-kinds.json`](../assets/change-kinds.json). Choose it
editorially from the user-visible effect; do not infer it from repository
metadata or availability status. Its array order defines the hierarchy used
before date ordering. Edit that asset to evolve the taxonomy while retaining
stable `id` values for persisted entries.
- `publication.basis` must be `technical-behavior`, with a concise
  `publication.rationale` explaining the exercisable product behaviour. This is
  review metadata and is not rendered publicly. Pricing, packaging, plan
  entitlements, billing policy, sales availability, contracts, SLA terms and
  marketing-only announcements are commercial decisions and must not enter the
  plan, regardless of their component.
- `area` and `component` must be an exact pair from
  [`assets/groupings.json`](../assets/groupings.json), the sole maintained
  taxonomy. Use each component's `covers` text to resolve overlapping homes.
  Choose the pair explicitly; do not derive it from a repository name.
- `scope` is one of `library-release`, `package-release`, `connector-release`,
  `converter-image`, `server-release`, or `hosted-deployment`. It describes the
  public boundary in the sentence, not merely the implementation repository.
- Every entry has a component, one-sentence factual summary, `YYYY-MM-DD` date,
  and at least one HTTPS evidence link.
- Every evidence item has a `kind` defined by the evidence policy. Put the
  authoritative event time on `availability`, not on evidence without one.
- Evidence is review-only. Do not set `public: true`: the renderer rejects all
  public evidence links because some repositories are private and availability
  does not consistently have a release-notes page.
- `requirements` names every component needed for the exact claim. Each
  `evidenceUrl` must also appear in `evidence`.
- `available` and `prerelease` require `version` and `availability`. Its
  `evidenceUrl` must appear in `evidence`, its evidence kind must prove `scope`,
  and `occurredAt` must be the boundary's authoritative UTC event time inside
  the changelog window.
- Continuously deployed `Web app` entries with `hosted-deployment` scope may
  omit `version` and use `implementation`
  evidence only when it records a completed merge to `targetBranch: "main"`.
  Connectors still require a release;
  viewer-backed product claims still require adoption by their consumers.
- `landed` omits `availability`; its scope says which boundary remains
  unverified. A named unreleased build may still use `version`.

Each weekly render assigns the whole check to the calendar month containing
`window.to`, merges a sanitized public record into
`technical-changelog-data/YYYY-MM.json`, and renders areas and components in
the order defined by `assets/groupings.json`. Status remains in the ledger for
evidence review and ordering but is not rendered as a public label. Kind is
rendered using the bold label in `assets/change-kinds.json`. Scope is also
review metadata and is not rendered; when a landed claim needs a user-relevant
qualification, write that limitation plainly in its summary. Changes
within a component sort by change-kind hierarchy, then `date` descending,
status and stable source hash for deterministic ties. The renderer updates only
the `pages` array of the Changelog
fragment in `navigation/changelog.json`, ordering monthly pages newest first.
It preserves the fragment's other fields and does not rewrite other dropdowns
or the root navigation manifest. No separate changelog index page is generated.
Individual update rows do not have permalinks.
