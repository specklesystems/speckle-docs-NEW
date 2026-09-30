---
name: docs-product-capability-sweep
description: >-
  Audit and update existing Speckle product docs against FE3 (or other product)
  source of truth. Use when docs look stale, UI labels or operators drifted,
  user asks for a capability sweep / parity pass / gap inventory, or when
  expanding thin reference sections from real product behavior—not for
  greenfield feature docs (use document-dev-speckle-feature) or CI-only fixes
  (use docs-ci-ready).
argument-hint: '[product area or docs path, e.g. analytics/data-validation]'
---

# Docs product capability sweep

Align **existing** Mintlify pages under this docs package with what the product
does today. Scope is any product area (Data Validation, Dashboards, Workspaces,
viewer, connectors, …)—not one feature family.

Work only under **`speckle-docs-NEW/`** for creates/edits. Treat the product
source (`../speckle-server-internal`) as **read-only** evidence unless the user
explicitly asks to edit it.

Do **not** edit the plan file if one is attached; implement from the agreed plan.

## When to use / not use

**Use when:** stale UI labels, incomplete operator/enum catalogs, wrong plan
gates, thin “predicates / filters / settings” sections, or “full capability
sweep” of an existing doc group.

**Do not use when:** documenting a brand-new feature from scratch →
`document-dev-speckle-feature`. CI format/validate only → `docs-ci-ready`.
Frozen `classic/` and `legacy/` trees → out of scope (see Anti-patterns).

## 1. Lock scope with the user

If `$ARGUMENTS` names an area, start there. Otherwise ask briefly:

1. **Depth** — catalog/reference only vs multi-page capability sweep
2. **Examples** — short inline examples (default) vs cookbook
3. **New page?** — prefer expanding existing pages; new nav page only if the
   reference would dominate a workflow page

Default if user shrugs: multi-page sweep, short examples, no new page.

## 2. Map source of truth (read-only)

Find product truth before rewriting prose:

| Kind | Where to look |
| ---- | ------------- |
| UI labels / operators | FE3 components in `packages/frontend-3` (dropdowns, `opOptions`, copy) |
| Semantics | Shared packages (`packages/eav-queries`, `packages/shared`, filtering helpers, GraphQL) |
| Plan / edit limits | Upgrade dialogs, save flows, “Coming soon” panels |
| Scoring / severity | Result composables, displayConfig |

Prefer UI-facing labels in docs. Do not invent type-filtered dropdowns or ops
the UI does not expose. Skip internal-only ops unless the user asks.

Do **not** paste product-specific catalogs into this skill—always re-discover.

## 3. Gap inventory (before edits)

Read the live nav group in `navigation.json` (`navigation.next.json` for `next/`) and every page in scope. Produce a short
inventory:

- Per page: covered / thin / wrong / missing
- Cross-page duplication
- Recommended **page ownership** (which page owns the canonical reference)

Share inventory + ownership; get plan approval for large sweeps. Small
single-section fixes can proceed after stating intent.

## 4. Edit with ownership

| Page role | Owns | Does not own |
| --------- | ---- | ------------ |
| Overview / intro | Concepts, plan caps, entry points, deep links | Full catalogs |
| Authoring / how-to | Workflows, operators/settings reference, limits | Result triage UI |
| Templates / import | Import fidelity, spawn/reuse flows | Operator catalog (link out) |
| Results / review | Surfaces, drill, export, PENDING | How to author rules |

Authoring rules: `AGENTS.md` and the area docs it lists (`docs/agents/versioned-snippets.md` for version tabs).
Honest limitations. Progressive disclosure. Cross-link instead of copying.

## 5. Verify

From this package root:

```bash
pnpm valid
pnpm exec prettier --write <changed.mdx>
```

Before PR: run **`docs-page-review`** on every changed page, then **`docs-ci-ready`**.

## Anti-patterns

- Rewriting from memory of an older product name or enum set
- Duplicating the same catalog on every sibling page
- Documenting dashboard widget enums as FE3 Data Validation (or vice versa)
  without checking both SoTs
- Expanding Classic docs for FE3 parity
