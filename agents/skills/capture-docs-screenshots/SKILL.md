---
name: capture-docs-screenshots
description: >-
  Capture or retake browser-accessible Speckle product screenshots for
  documentation, fulfil IMAGE_PLACEHOLDER comments, and insert verified
  Mintlify Frames. Use for a docs page, product area, or screenshot brief.
---

# Capture docs screenshots

Turn the single docs corpus' screenshot queue into finished assets. This skill
automates browser-accessible product surfaces. A desktop application capture
needs that application to be available through suitable UI automation.

## Select the batch

1. Resolve `$ARGUMENTS` to a docs page, directory, product area, or exact
   `IMAGE_PLACEHOLDER` brief. Read the target page and any area doc required by
   `AGENTS.md`.
2. Run `pnpm report:placeholders`, then scope with `rg -n "IMAGE_PLACEHOLDER"
   <path>`. A page means every marker on that page unless the user narrowed it;
   a directory or product area means at most five related markers per batch.
3. Record each marker's file, surrounding heading, exact comment, required
   product state, and visible controls. Treat its current line as a discovery
   aid, not a stable identifier.
4. Classify each marker provisionally:
   - **browser** — the Speckle web app or docs UI is reachable through the
     browser workflow;
   - **external app** — Revit, Grasshopper, Power BI, Vectorworks, or another
     desktop product requires its own running application and UI session.

Attempt browser captures. Preserve an external-app marker unless its named
application is actually available. Report the required application with the
blocked shot; reclassify rather than forcing a capture through the wrong tool.

Search the corpus for the same product state before planning a new image. Reuse
one asset only when the same composition answers both pages. Its owner is the
page most specifically about that product surface; every consumer references
that path.

For a retake with no placeholder, identify the existing `<Frame>` by page and
surrounding heading.

## Plan the assets

New assets mirror the owning MDX path beneath `images/`:

```text
workspaces/settings.mdx
  -> images/workspaces/settings/<shot-name>.png
  -> /images/workspaces/settings/<shot-name>.png
```

Use a short kebab-case name for the visible state. Before capture, check whether
the path exists and search the corpus for references to it. A new shot gets a
unique descriptive name. Overwrite only for an explicit retake after listing
every consumer; preview every consumer after the retake. When those consumers
are outside the requested scope, write a new asset and update only the target.

The corpus documents the current product. Asset paths do not encode a docs or
product version.

## Prepare the product

Invoke **open-dev-speckle-in-browser** in `launch` mode. It owns server
readiness, login, seeding, presentable demo data, light theme, and browser
interaction rules.

Complete this preflight before any capture:

- server and frontend readiness checks pass;
- the session is logged in as the intended seeded test user;
- the visible workspace, project, model, roles, and feature grants produce the
  brief's state;
- all visible data is synthetic or approved for public documentation;
- the app is in light theme;
- the Playwright page viewport is **1440 × 900 CSS pixels** at its default 1×
  device scale.

If preflight cannot establish the intended state, preserve the marker and
report the missing route, role, feature grant, or seed data.

## Capture and audit

Open the exact panel, menu, selection, or result named by the brief. Inspect the
frontend routes and components when navigation or state is unclear. Wait for
loading, transitions, toasts, and skeletons to settle unless the brief requires
one of those states.

Prefer `playwright-cli screenshot <ref> --filename <absolute-path>` on the
smallest snapshot element that contains the required context. Use a visible
viewport screenshot when the relationship between several regions is the
subject. The page screenshot excludes browser chrome; never use a full-page
capture. Browser framing is the crop.

Visually inspect every PNG before editing MDX. CI cannot judge composition.
Accept a capture only when:

- every item named by the brief is visible and readable;
- the crop retains enough context to orient the reader without unrelated UI or
  empty space;
- the UI is settled, light, and free of error overlays or automation UI;
- names, avatars, descriptions, and model content look intentional;
- no token, private email, customer data, local path, or unrelated account
  detail is visible.

Retake a failed audit. Preserve the marker when the required state cannot be
produced safely.

## Insert the Frame

Handle one marker at a time. Immediately before each edit, re-read the page and
re-run the scoped marker search. Locate the occurrence by file, surrounding
heading, and exact comment; do not rely on the earlier line number. Replace only
that occurrence with:

```mdx
<Frame caption="Use only when the caption adds meaning beyond the prose">
  <img
    src="/images/<owning-page-path>/<shot-name>.png"
    alt="Describe the visible product state and the controls the reader should recognize"
  />
</Frame>
```

Omit `caption` when it repeats nearby prose or the alt text. Alt text names the
meaningful UI and state; it does not start with "image of" or "screenshot of".

## Verify the batch

1. Run `pnpm exec prettier --write <changed-page...>`.
2. Start or reuse `mise run dev`. Open every changed route and every known
   consumer of a retaken shared asset. Visually verify that each Frame loads at
   a useful size without clipping or distortion.
3. Invoke **docs-page-review** for every changed MDX page. It invokes
   **docs-ci-ready**; complete the batch only when its required checks pass.
4. Run `pnpm report:placeholders` and confirm every completed marker left the
   queue.

Report completed shots as docs page + heading + asset path. Report preserved
markers separately with the exact missing application, route, permission,
feature state, or seed data.
