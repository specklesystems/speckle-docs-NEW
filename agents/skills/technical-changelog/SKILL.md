---
name: technical-changelog
description: >-
  Produce Speckle's monthly technical changelog from weekly evidence checks, reconcile
  connector GitHub Release notes, and audit the docs corpus after product
  merges or releases. Use for scheduled changelog runs, release-note gaps,
  or merge/release-driven documentation maintenance.
---

# Technical changelog

Merge one closed weekly window of product evidence into a review-only monthly changelog page.
The workflow is repository-owned: an interactive agent, CI runner, or scheduler
invokes the same skill and scripts.

Read [evidence-policy.md](references/evidence-policy.md) before classifying any
change. Read [schema.md](references/schema.md) before writing `changelog.json`.
Use [groupings.json](assets/groupings.json) as the sole ordered taxonomy for
public areas and components. To introduce or move a component, update that
template deliberately in the same review; do not invent an ad hoc heading in
the weekly plan.

## Inputs

Set all four values explicitly:

- `WINDOW_FROM` and `WINDOW_TO`: UTC ISO-8601 instants defining a half-open
  window (`from <= timestamp < to`). A Friday run normally covers the previous
  Friday 15:00 Europe/London through this Friday 15:00 Europe/London, converted
  to UTC with the correct daylight-saving offset.
- `CHANGELOG_WEEK`: ISO week (`YYYY-Www`) containing `WINDOW_TO`.
- `OUTPUT_DIR`: scratch directory for evidence and `changelog.json`.

Run `mise run technical-changelog-collect`. The collector resolves the
canonical atlas manifest locally or from the pinned GitHub fallback, proves
access to every selected repository, and writes the dataset only after the
whole collection succeeds. A partial inventory is not evidence.

**Done when:** `prs.jsonl`, `releases.jsonl`, and `metadata.json` exist, and
`metadata.json` names every selected repository and the exact window.

## Prove entries

Build an entry ledger before writing changelog prose. For every proposed entry,
record the exact public claim, availability scope, implementation evidence,
every required component, and any availability boundary with its authoritative
event time.

Decide publication eligibility first. Include only an exercisable technical
product behaviour, recorded as `publication.basis: technical-behavior` with a
concise rationale. Pricing, packaging, plan entitlements, billing policy, sales
availability, contracts, SLA terms and marketing-only announcements stay out
of the technical changelog, even when they affect a documented product area.

The entry is the user-facing capability, not the repository change. Combine
server, converter, web app, SDK, and connector work when they jointly deliver
one capability; keep their separate links as one compound private evidence
chain. Do not emit one public item per repository. Classify the combined item
at the broadest boundary required by its wording: one released component does
not make the full workflow available.

Resolve every dependency before calling the capability available. A completed
merge to the authoritative `main` branch is live only for continuously deployed
Web app code; this explicitly includes `bashboards/main`. Connectors require
their separate connector release. A viewer
library release proves availability to library integrators only; a Speckle
product claim also needs verified adoption and availability in every relevant
consumer, such as server, Dashboards, or the Power BI visual. Use the slowest
required boundary for a cross-repository capability.

Write terse, user-facing capability statements. Name what the product can do;
avoid internal implementation terms such as extractor names when a plain
capability statement is equally precise. Stay objective and do not infer a
broader workflow than the evidence proves.

Apply [evidence-policy.md](references/evidence-policy.md) to each row. Collection
counts prove corpus completeness, never an individual claim. Narrow or split a
claim when its evidence covers only a library, package, connector, converter
image or server release. Mark it `landed` when the required availability
boundary is missing. Omit it when even landed state is unresolved.

**Done when:** every included claim has its own evidence chain, every required
component cites collected evidence, and the declared scope matches the proven
boundary.

## Reconcile connector releases

For every connector GitHub Release in the window, compare its tag range with
the collected pull requests and implementation evidence. Its notes are the
public record for capabilities, compatibility changes, and fixes in that
version.

Use the verified release tag as the connector version shown in the changelog.
For repositories that promote `dev` into `main`, follow the release's linked
squashed commits across that boundary to the contained feature changes. Keep
release, commit, and pull-request URLs in the private review evidence only.

Prepare concise Added/Changed/Fixed-style additions for omissions. Preserve
the existing body and structure. Apply a GitHub Release edit only when the
invoking user or automation explicitly authorizes that external mutation.
Otherwise put the proposed text and evidence in the run report. Ambiguous
commit mapping also stays report-only.

**Done when:** every connector change is represented by an existing release
note, an authorized targeted addition, or a named unresolved finding.

## Author and render

Treat an agreed editorial or structural decision as a workflow change. Update
the relevant editable asset, this skill, its schema or evidence reference, the
renderer, and regression tests together; generated pages alone are not the
source of truth. Remove superseded instructions in the same change.

Write `OUTPUT_DIR/changelog.json` from the proved entry ledger. One entry is
one independently documentable change with its own stable id; several entries
may cite the same release. Render with `mise run technical-changelog-render`.
Classify its user-visible effect using
[`assets/change-kinds.json`](assets/change-kinds.json); do not derive this from
its repository or availability status. That asset is the editable ordered
taxonomy: its array order is the primary hierarchy, with newest changes first
within each kind.

The renderer validates classification and evidence, assigns the whole check to
the calendar month containing `WINDOW_TO`, and merges sanitized entries into
`technical-changelog-data/YYYY-MM.json`. It renders one monthly page under
`technical-changelog/`, using the ordered areas and components from
[`assets/groupings.json`](assets/groupings.json). Within each component, entries
follow the change-kind hierarchy and are newest first within each kind. The
public item prefix uses the corresponding label in
`assets/change-kinds.json`. Availability classification remains review metadata
and is not printed as an item label. It keeps the `Changelog` dropdown's monthly
pages newest first in `navigation/changelog.json`, so the current month is the
direct target and previous months remain available in navigation. It does not
rewrite other dropdowns or the root navigation manifest. Individual update rows
do not have permalinks. There is no separate changelog index page.
Evidence stays in the scratch ledger and review material; public pages never
link evidence, releases, pull requests, or commits.

Choose each entry's area and component from
[`assets/groupings.json`](assets/groupings.json). Use the component's `covers`
boundary when several homes appear plausible; extend that editable taxonomy
when a documented product domain genuinely has no home.

**Done when:** rendering succeeds twice with no diff on the second run.

## Audit the corpus

Trace each included change to affected docs. Make a correction in the same PR
only when product and release/deployment evidence directly proves a mechanical
fact: a UI or API name, supported version, command/config key, explicit
deprecation, resolved limitation, or compatibility statement. Put interpretive
or judgment-heavy impacts in the PR body under **Docs audit findings**, with
the affected page, evidence, and a concrete follow-up question.

For every affected page, record its current claim and compare that claim's
scope with the entry's proved scope. A library or converter release does not
clear a hosted-product statement. Put mismatches and missing deployment proof
in **Docs audit findings** instead of treating the page as current.

**Done when:** every included entry is mapped to an affected page or explicitly
recorded as having no docs impact, and every page conclusion names the current
claim, proved scope, and evidence gap or correction.

Run `docs-page-review` on every created or changed page, then `docs-ci-ready`.

## Deliver

Use branch `codex/technical-changelog-YYYY-Www` and PR title
`docs: technical changelog YYYY-Www`. Update the same open PR on reruns; the
public page remains monthly. Never
merge or publish the docs PR. If the week's PR already merged, report late
evidence instead of opening a duplicate.

Report the window, checked and unavailable sources, connector release-note
changes or proposals, entry counts by classification, corpus corrections,
audit findings, checks, and PR link. An empty verified window creates no branch.
