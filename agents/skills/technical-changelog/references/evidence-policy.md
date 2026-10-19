# Evidence policy

## Repository inventory

Use the union of the atlas `server`, `sdk`, `connector`, and `infra` stacks.
Exclude:

- `speckle-docs-NEW`: it is the output, not product evidence;
- `speckle-security-assessments`: its contents are not a public changelog
  source.

The collector validates every selected manifest entry as a
`specklesystems/<repo>` GitHub SSH URL and fails closed when any selected
repository is unavailable. Tooling and marketing stacks are outside this
technical product/docs audit.

The manifest resolution order is:

1. `ATLAS_MANIFEST`, when set;
2. `ATLAS_ROOT/atlas/manifest.toml`, when set;
3. an `atlas/manifest.toml` found while walking upward from the docs checkout;
4. `specklesystems/speckle-atlas`, ref `main`, path `atlas/manifest.toml`, read
   through `gh api` using the raw-content media type.

## Landed state

`speckle-sharp-connectors` and `speckle-converters` use integration branches:

- feature PR into `dev`: `candidate`;
- `dev` into `main`: `landed`, with the contained feature PRs established by
  commit/tag ancestry or GitHub compare data.

Every other selected repository: a feature PR into `main` is `landed`.
Pull requests into other branches are collected for evidence but are neither
landed nor available without a later proven boundary.

Squash merges and cherry-picks count only when GitHub or commit evidence maps
the change across the boundary. Linear status, branch name, elapsed time, and
memory are not release evidence.

For repositories that promote `dev` into `main`, follow the release's linked
squashed commits back through the `dev` → `main` boundary and then to the
contained feature changes. Keep those commit and pull-request URLs in the
review evidence only; never copy them into the public monthly page.

## Available state

Classify scope before status. Use the narrowest boundary the evidence proves:

- `library-release`: a published library artifact for integrators;
- `package-release`: a published registry package;
- `connector-release`: a published connector release or installer feed;
- `converter-image`: a published converter image;
- `server-release`: a published self-hosted server release;
- `hosted-deployment`: a production deployment of the user-facing service.

An entry is `available` only when the exact change or a containing commit maps
to a boundary valid for its declared scope:

- a published GitHub Release/tag and downloadable asset or official release
  endpoint;
- a package registry version mapped to a tag or commit;
- an installer feed mapped to that version;
- a production deployment record containing the deployed SHA.

A narrower boundary does not prove a broader workflow. A library release does
not prove adoption in the Speckle web app. A converter image does not prove
upload validation, routing, UI and production deployment. A server release does
not prove deployment on hosted Speckle.

For a compound claim, list every required component and cite its implementation
evidence. Claim `hosted-deployment` only when deployment evidence covers the
complete user-facing workflow. Otherwise narrow the claim to the proved
artifact, split it into independent entries, or leave it `landed`.

Boundary exceptions and dependencies:

- Continuously deployed Web app code is available when a completed merge into
  that repository's authoritative `main` branch is verified; its merge time is
  the availability event. `bashboards/main` explicitly uses this rule. This
  exception does not apply to server, connector, SDK, converter, or library
  entries.
- Connector code merged to `main` remains landed until the separate connector
  release is published.
- A viewer library release proves only `library-release`. A claim about the
  Speckle web app, Dashboards, or Power BI visual also requires verified
  adoption by each named consumer and that consumer's own availability
  boundary.
- A compound capability inherits the least advanced status of every component
  required by its wording.

Group by capability before grouping by product area. When changes in several
repositories jointly enable one user action, publish one entry with a compound
evidence chain rather than one entry per repository or artifact. Keep separate
entries only when each change is independently useful and understandable to a
user.

A GitHub prerelease is `prerelease`, not `available`, even when downloadable.
Draft releases are never availability evidence. For continuously deployed
services, `main` is landed; a production deployment record establishes
availability.

The availability boundary supplies the authoritative event time: release
`published_at`, registry publication time, installer-feed publication time, or
deployment time. It must fall inside the half-open changelog window. PR merge
times prove landed state, not availability. Retrieval time and a release's
`updated_at` are not event times. An older release edited in the window is not
eligible unless immutable revision history proves when the relevant evidence
was introduced.

Evidence kinds used by `changelog.json`:

- `implementation`: PR or commit proving implementation or the landed boundary;
- `release`: published GitHub release, server release or converter image;
- `package`: registry publication mapped to a version and commit;
- `installer`: connector installer-feed publication;
- `deployment`: production record mapped to the deployed change.

## Connector Release notes

For `speckle-sharp-connectors`, and any other connector repository that uses
GitHub Releases, the release body is the canonical public change record. It
must cover user-visible capabilities, behavior and compatibility changes, and
fixes before the docs changelog mirrors them.

Use the verified connector release tag as the version shown in the changelog
entry. Render the version as plain text; keep the release URL and its linked
commit evidence in the review material.

Preserve human text. Add only the missing factual bullet beneath the closest
existing Added/Changed/Fixed-style section, with a PR link. Release creation,
publication, deletion, retagging, asset changes, and version changes are
outside this workflow.

## Docs writing boundary

The monthly page is factual and terse, assembled from weekly checks: no marketing adjectives, inferred
benefits, roadmap claims, or codenames. Skip dependency-only, branch-sync,
comment-only, formatting-only, test-only, and CI-only changes unless they alter
a supported public interface, security posture, or required operator action.
