# speckle-docs-NEW — agent instructions

Speckle's documentation site, built with Mintlify. This file is the only always-on instruction file: procedures are skills (`agents/skills/`), area rules live under `docs/agents/`. Keep this file ≤ 200 lines / 12 KB (atlas ADR-0008).

## Repository layout

- Pages are `.mdx`, routed by path. `docs.json` is the site config; navigation is `navigation.json` (version **Current**) plus `navigation.next.json` (version **2026.9**, the default, pages under `next/`); redirects in `redirects.json`.
- User guides: `quickstart/`, `workspaces/`, `3d-viewer/`, `analytics/`, `workflows/`, `connectors/`, `beta/`. Developers: `developers/`. IT admins: `it-admin/`. `classic/` and `legacy/` are frozen redirect-target trees outside the nav: don't expand them.
- `snippets/` reusable MDX fragments, `images/` assets, `examples/` runnable sample apps (own pnpm root), `scripts/` CI checks.
- `README.md` is the human contributor guide; `FRONTMATTER_SCHEMAS.md` defines the 2026.9 frontmatter.

## Working rules

- **Tooling:** `pnpm` for every script and dependency (`packageManager` pins the version), Node 22. `mise.toml` tasks: `mise run install|dev|validate|check-links|example-check|agents-sync`.
- **Checks:** `pnpm check` is the CI gate: Prettier + markdownlint on changed files, `mint validate`, structure (redirects, orphans, framing, assets), broken links, a11y. Pre-commit (Husky) runs Prettier + markdownlint on staged files.
- **Before a docs PR:** run the `docs-page-review` skill on every written or revised page, then `docs-ci-ready`.
- **Area docs are not auto-loaded.** When a path you read, plan or edit matches a row under [Area docs](#area-docs), load that doc first, however small the task.
- **Product truth:** document what exists today. When UI labels, operators, plan gates or enums look stale, verify against the product (`../speckle-server-internal`, FE3 = `packages/frontend-3`) before rewriting; multi-page parity audits use the `docs-product-capability-sweep` skill.

## Audience and voice

| Doc type | Reader ("you") | Intent |
|---|---|---|
| User guides | the user | use the product: publish, load, share, view |
| Developer docs | citizen developers / AEC hackers writing scripts, notebooks, small automations first; connector authors second | build, integrate, extend, debug |
| IT admin docs | IT teams and workspace admins first, server admins last | deploy, configure, troubleshoot, support users |

- Write for the reader, never for Speckle staff. User intent over system architecture; progressive disclosure, simple first, depth later.
- Frame topics by the action (publish, load, share, view), not the plumbing (connectors, integrations). Everyone uses the web app; not everyone uses connectors.
- Day-0 success: shortest path to a visible win; lead with why and when before mechanics. A first-time user succeeds without help; a returning user scans and jumps.
- Approachable, precise, plain language; short imperative sentences; no jargon or marketing adjectives. Call out limitations, known issues and version differences.
- Keep core pages brief and task-first: depth goes to a compact FAQ, Best practices and 1–3 Tips. Tutorials live outside the core docs; link out to them. Cross-link related pages; name sections by user intent.

## Page elements (Mintlify)

- Mintlify components over raw HTML/Markdown.
- **Steps:** `<Steps>`/`<Step>` for linear tasks, usually 3–5 steps; past 7, split or link out to a tutorial. Counts are guidelines, never a finding on their own. Titles verb-first, sentence case, ~3–7 words; each step 1–3 sentences ending in an observable outcome; no conditionals (branch into troubleshooting). Nothing complex inside a `<Step>` (Tabs, Accordions, code): put code, asides and placeholders adjacent, or fall back to `###` + an ordered list. Add a "You should see…" check where failure is silent.
- **FAQs:** `<AccordionGroup>` + `<Accordion title="…">`; one question in user language ("How do I…", "What happens if…"), one atomic answer under 120 words; link out when longer; include at least one edge case; delete FAQs that restate the body; order by support-ticket frequency.
- **Asides:** `<Tip>` optional shortcut, `<Note>` neutral clarification, `<Warning>` data loss, access or irreversible risk. One idea, 1–3 sentences, never a multi-step workflow; place it next to the step or section it names explicitly. Calm, factual tone.
- **Titles and nav:** task or outcome first, sentence case, ~50–65 characters, one promise (no compound clauses), no version numbers or internal product names unless required. Nav labels short, concrete, recognizable over clever; siblings parallel. H1 matches the title's intent; reader keywords once in H1 and early copy, no stuffing. Quote a numeric-only frontmatter `title` (`title: '2026.9'`); unquoted, Mintlify's PageHeader crashes.
- **Images:** only when they reduce cognitive load; caption them when the image carries meaning. Not captured yet: `{/* IMAGE_PLACEHOLDER: UI location — what must be visible. */}` at the head of a section introducing new UI, or adjacent to (never inside) instructional Steps. Skip code-only SDK/API pages, comparison tables, hub pages and shots already marked elsewhere. Never fake image files or "screenshot coming soon" copy. Full rules: `docs-image-placeholders` skill.
- **Downloads:** Mintlify does not serve notebooks, archives and most non-image files. Keep the file next to the guide and link `https://raw.githubusercontent.com/specklesystems/speckle-docs-new/refs/heads/main/<path-in-repo>`, never a relative path; don't explain the limitation to readers.

## Content rules

- **Version naming:** "Speckle Next" and other codenames never appear in reader-facing copy, nav or titles; `next/` is an internal path. Write `2026.9`, never `v2026.9` (same for `2026.8`); no placeholder disclaimer, no invented marketing name, no hiding the string. When product names the release, replace 2026.9 everywhere. "Current" names the version selector only: body copy says "before 2026.9" / "2026.8 and earlier" or names the mechanism; table columns `Before 2026.9` / `2026.9`. "Legacy" names the v2 → v3 migration, not the 2026.8 corpus.
- **User pages stay user-facing:** feature flags, Helm values, env vars and docker-compose config never appear in user guides; state availability and link to the deployment guide.
- **Enterprise-only features** (Workspaces, Admin Support Mode, Saved Views, Issues, Multi-regional Deployment, Automate, Intelligence, ACC Integration, extended Direct Uploads): the user-facing page carries its own `<Note>` (available only on Speckle Enterprise Server) linked to its setup in `developers/server/deployment/enterprise-license`; add role restrictions where they apply.
- **Plan labels:** frontmatter `tag` is for `Enterprise` and `Third-Party` only; Alpha/Beta go in a `<Badge>` atop the body. Keep billing light: no plan limits or prices, just "available on the **Enterprise** plan"; other plans contact sales@speckle.systems.

## Area docs

| Doc | Load first for |
|---|---|
| `docs/agents/next.md` | ANY work under `next/` |
| `docs/agents/connectors.md` | ANY work under `connectors/` or `next/connectors/` |
| `docs/agents/sdk-dotnet.md` | ANY work under `developers/sdks/dotnet/` or `next/developers/sdks/dotnet/` |
| `docs/agents/sdk-python.md` | ANY work under `developers/sdks/python/` or `next/developers/sdks/python/` |
| `docs/agents/persona-audience.md` | writing or restructuring developer or IT admin pages, or a page for a multi-role feature |
| `docs/agents/versioned-snippets.md` | a page that compares code before and after a release |
| `docs/agents/server-config.md` | documenting server configuration (env vars, feature flags, Helm, docker-compose) |

## Agent config (ADR-0008)

Tracked sources: this file, `agents/skills/<name>/SKILL.md`, `docs/agents/`, the Claude/Codex hooks `.claude/settings.json` + `.codex/hooks.json`, and omp's `.omp/extensions/atlas-sync.js`. Everything under `.claude/skills/`, `.agents/skills/`, `.mcp.json`, `.codex/config.toml` and the atlas block below is written by `../atlas/scripts/sync-agents.py` (startup, `mise run agents-sync`) — edit the source. Layout, opt-in MCP servers (`ATLAS_MCP_SERVERS`) and collision rules: `../atlas/agents/README.md`.

<!-- atlas:shared:begin -->

<!-- Duplicated from the atlas checkout root AGENTS.md by atlas/scripts/sync-agents.py for clients that stop at this repo's git root (Codex, Grok). Edit the atlas copy. -->

# Code comments: decision significance only

Write a comment only when it states a decision or constraint the code
cannot show — the why behind a non-obvious choice, with the ticket, spec,
or ADR reference when one exists. Never write comments that:

- describe the current state of the world elsewhere ("the chart ignores
  this value for now", "X hasn't landed yet") — they go stale silently
  the moment that other thing changes;
- retell the spec, plan, or PR narrative — reference the ticket instead;
- explain what the next line does.

That context belongs in the commit message, PR body, or ticket. This
policy overrides matching the comment density of the surrounding file:
a legacy heavy-comment file does not license new narrative comments.

# Ticket workflow: claim before you code

When starting implementation of a Linear ticket — via /implement, /tdd, or
no skill at all — first claim it:

1. Move the ticket to **In Progress**.
2. Assign it to the developer running the session (`linear-server`
   `get_user` with query "me").

If the ticket is already In Progress and assigned to someone else, stop
and confirm with the user before touching it — it may be claimed by a
parallel session, and double-resolving a claimed ticket has burned us
before.

This applies only to work tracked as a Linear ticket; untracked work and
repo-local trackers with their own conventions are unaffected. Claiming is
the only transition this rule owns — later states (review, done) belong to
the PR flow.

# Ways of working (Speckle stack)

When the user starts describing a feature, refactor, bug, or plan, suggest
the matching entry point instead of diving into implementation: `/wayfinder`
for big/foggy multi-session work, `/grill-me` (or `/grill-with-docs`) to
stress-test one plan, `/prototype` when "how should it look/behave" is open,
then `/to-spec` → `/to-tickets` → `/implement` (which calls `/code-review`).
The full loop: `atlas/ways-of-working.md` in the speckle-atlas checkout root
(`../atlas/ways-of-working.md` from this repo in the standard nested layout)
— read it before shaping non-trivial work.

Specs: cross-repo → the atlas repo's `atlas/specs/`; local to this repo →
this repo's `specs/` folder. Same structure everywhere: `YYYY-MM-title.md`,
a linked Linear project, worked via PR. Check both places when picking up
spec work.

ADR linking is two-way (atlas ADR-0003 + its amendment): a repo-local ADR
born from a cross-repo project back-links the owning atlas spec in its
header and is indexed from that spec; and when a stack-level ADR — standing
(`atlas/adr/`) or a spec's — governs a specific module of this repo, that
module carries a **pointer ADR** in its local ADR home. A pointer is a thin
stub, never a fork of the atlas content: it keeps the atlas ADR's number and
title, names the atlas text as canonical, links it and its spec by relative
path (never GitHub URLs), summarizes the decision and what it binds in this
module, and is registered in the module's docs index and the repo's context
map. The pointer lands with the work that makes the decision bind the
module. If a pointer's atlas links don't resolve, this checkout is missing
the atlas layer — ask the user to set up the speckle-atlas checkout above
this repo before acting on that decision.

Shared skills, MCP definitions, and conventions change **in the speckle-atlas
repo via PR** — never by editing synced outputs (`.agents/skills`,
`.claude/skills`, `.mcp.json`, `.codex/config.toml`, this block) or forking a
local copy in this repo. A repo-local skill with a shared skill's name fails
the sync (ADR-0008); there is no override.

<!-- atlas:shared:end -->
