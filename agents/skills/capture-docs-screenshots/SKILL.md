---
name: capture-docs-screenshots
description: >-
  Capture or retake browser-accessible Speckle product screenshots for
  documentation, fulfil IMAGE_PLACEHOLDER comments, and insert verified
  Mintlify Frames in the docs house style. Runs only after the developer
  confirms when prompted (docs tasks that leave IMAGE_PLACEHOLDER markers
  offer it) and supplies the source and sample URLs; never starts on its own.
---

# Capture docs screenshots

**Prompt, then confirm.** Never start capturing on your own. A docs task that
leaves `IMAGE_PLACEHOLDER` markers ends by offering capture (AskUserQuestion),
and this skill runs only when the developer confirms and supplies:

- the source: production, a staging URL, or their running dev server URL;
- a sample URL for each surface to capture (workspace, project, model or
  page), plus any feature flags the UI needs.

Capture signs in to a real account, touches shared data and needs choices only
a person can make, so missing details are asked for, not guessed. If the
developer declines, or nobody is there to answer, leave the markers:
`pnpm report:placeholders` reports them as debt on every PR.

Turn the docs screenshot queue into finished, house-styled assets. Each marker
is a **brief**: the shot is done when every item the brief names is visible,
legible, and the marker is gone from the queue.

## 1. Select the batch

1. Resolve `$ARGUMENTS` to a docs page, directory, product area, or exact
   `IMAGE_PLACEHOLDER` brief. Read the target page and any area doc required
   by `AGENTS.md`.
2. **Ask where to look.** Where a feature is visible is the human's call
   (released or not, which branch, which data is presentable). Unless
   `$ARGUMENTS` already names it, ask once, before any browser work, for:
   - the **source**:
     - `local`: launch a seeded local deployment;
     - `dev <url>`: their already-running development server, for an
       unreleased feature on their branch;
     - `hosted <url>`: a released environment such as app.speckle.systems;
   - the **place** in it: the workspace, project and model that show the
     feature with data approved for public docs (a demo workspace such as
     Speckle Demos), plus any flag or setting that must be on.
   When nobody can answer (an unattended run), plan the batch, stop before
   capture, and report the question.
3. Scope with `rg -n "IMAGE_PLACEHOLDER" <path>`. A page means every marker on
   it unless the user narrowed it; a directory or product area means at most
   five related markers per batch.
4. **Empty scope gate.** Zero markers in scope: stop and run
   **docs-image-placeholders** on the target first, then return here with the
   markers it added. A hub, changelog or "What's new" page earns markers only for
   its headline features, and each one reuses the brief of the matching marker
   on the page that owns that surface (search the corpus for it).
5. Record each marker's file, surrounding heading, exact comment, required
   product state and visible controls. The line number is a discovery aid only.
6. Classify each marker:
   - **browser**: the Speckle web app or docs UI;
   - **external app**: Revit, Grasshopper, Power BI, Vectorworks or another
     desktop product. Capture it only when that application is running and
     automatable; otherwise preserve it and name the application.

## 2. Plan the assets

- **Owner and consumers.** One product state has one asset, owned by the page
  most specifically about that surface. Search the corpus for the same state
  before planning a new image. Consumers (hub pages, What's new) reference the
  owner's path. Replace the owner's marker only when the shot satisfies the
  owner's full brief; a shot that satisfies only the consumer's brief lives
  under the consumer's path instead.
- **State.** Instructional steps show the state the reader starts from (often
  empty). Headline shots on hub or What's new pages show the feature at work:
  a real answer, a populated table, a selection. Produce it with the product's
  own suggested inputs; anything it persists in the demo project (a chat, an
  issue) is listed in the report.
- Paths mirror the owning MDX path beneath `images/`:
  `workspaces/settings.mdx` → `images/workspaces/settings/<shot-name>.png`.
  Short kebab-case name for the visible state.
- Before capture, check whether the path exists and search for references to it.
  Overwrite only for an explicit retake after listing every consumer; preview
  every consumer after the retake.
- **Critic, round 1.** Put the shot plan (state, tier, crop, markers per
  marker) through the critic in [references/critic.md](references/critic.md)
  and apply its revisions. The plan is settled only when every shot passes.

## 3. Prepare the product

Pick the backend from [references/capture-backends.md](references/capture-backends.md):

- **local**: invoke **open-dev-speckle-in-browser** in `launch` mode (server,
  login, seeding, demo data) and capture with Playwright.
- **dev**: invoke **open-dev-speckle-in-browser** in `attach` mode against the
  engineer's URL; never restart, reseed or reconfigure their server. Capture
  with Playwright when this session runs on that machine, otherwise through
  their Chrome (Claude in Chrome reaches their localhost). Record the server
  repo's branch and short commit (`git -C <speckle-server> rev-parse
  --abbrev-ref HEAD` and `--short HEAD`), and confirm the feature flag or
  workspace grant that exposes the feature is on.
- **hosted**: the user's signed-in Chrome via Claude in Chrome, on the project
  they named.

Preflight, all true before any capture:

- the viewport reports 1440 × 900 CSS px, `devicePixelRatio` 2;
- **light theme forced**, never inherited: the app's color mode defaults to
  `system`, which follows the OS and can flip to dark mid-session (macOS Auto
  appearance at dusk). Force it with the snippet in capture-backends, confirm
  `<html>` has class `light`, and re-confirm immediately before every capture;
- automation and dev overlays hidden (snippet in capture-backends);
- every visible name, avatar, email and value is synthetic or approved for
  public docs: a demo workspace such as **Speckle Demos**, never customer data;
- the visible project, model, role and feature grants produce the brief's state;
- the UI matches what a reader with an ordinary role sees: account-level
  extras (staff flags, dev panels, a customised viewer **Layout**) are reset
  or kept out of frame. When you cannot tell whether a control is gated, keep
  the shot and name the control in the report.

If preflight cannot establish the state, preserve the marker and report the
missing route, role, feature grant or seed data.

## 4. Capture, compose, audit

1. Open the exact panel, menu, selection or result the brief names. Inspect
   frontend routes and components when navigation is unclear. Wait for loading,
   streaming geometry, transitions, toasts and skeletons to settle unless the
   brief asks for one of them.
2. Capture the raw viewport PNG (backend reference).
3. Compose it with `scripts/compose.py <spec.json>` following
   [references/house-style.md](references/house-style.md): pick the tier
   (hero, region, element) by the shot's purpose, crop close to the subject,
   and add numbered markers only where the reader must find something the prose
   cannot point at alone.
   Keep the spec JSON beside the raw capture in the scratch dir so a retake is
   a re-run.
4. Treat every `compose.py` warning as an audit failure to fix or justify.
5. **Critic, round 2.** Hand the composed PNGs to a fresh critic
   ([references/critic.md](references/critic.md)); CI cannot judge composition.
   An image ships only when the critic passes it on every criterion listed
   there. Fix caption and alt text from its PASS-WITH-FIX notes.
   Retake or recompose a failed image and send it back to a fresh critic.
   Preserve the marker when the state cannot be produced safely.

## 5. Insert the Frame

One marker at a time. Immediately before each edit, re-read the page and re-run
the scoped search; locate the occurrence by file, heading and exact comment.
Replace only that occurrence, at the comment's indentation (a marker inside a
list item keeps the Frame inside the item):

```mdx
<Frame caption="1 First marked control · 2 Second marked control">
  <img
    src="/images/<owning-page-path>/<shot-name>.png"
    alt="Describe the visible product state and the controls the reader should recognize"
  />
</Frame>
```

- `caption`: the marker legend, in UI words and marker order. A shot without
  markers gets a caption only when it adds meaning beyond the prose.
- `alt`: the meaningful UI and state; never opens with "image of" or
  "screenshot of", and does not repeat the legend.

A capture from a **dev** source shows UI that can still change before release.
Directly above its Frame, add one grep-able line so the shot is rechecked when
the feature ships:

```mdx
{/* IMAGE_PRERELEASE: <server branch>@<short sha> — recheck against the released UI. */}
```

Delete that line after a recheck against the released UI (retake on drift).

## 6. Verify the batch

1. Format changed pages: `pnpm exec prettier --write <pages…>`
   (no `pnpm` in a sandbox: `node node_modules/prettier/bin/prettier.cjs --write <pages…>`).
2. Open every changed route and every consumer of a retaken shared asset in the
   docs dev server (`mise run dev`); confirm each Frame loads, reads at its
   rendered size and is not clipped.
3. Invoke **docs-page-review** for every changed MDX page; it invokes
   **docs-ci-ready**. The batch is done only when its required checks pass.
   When a check cannot run in this shell (the `mint` CLI needs the host's native
   build), list it as pending in the report rather than as passed.
4. For a release recheck, `rg -n "IMAGE_PRERELEASE"` lists every shot waiting on
   its feature to ship.
5. Re-run `pnpm report:placeholders` (or `node scripts/report-image-placeholders.mjs`)
   and confirm every completed marker left the queue.

Restore anything the session changed in the user's browser (color mode,
viewer layout) once the batch is captured.

Report completed shots as page + heading + asset path + source (local, the dev
server's branch@sha, or the hosted project URL). Report preserved markers separately with the exact missing
application, route, permission, feature state or seed data, and list any
gated-looking controls left in frame.
