# Speckle Docs – Authoring Guide

This repository contains the official documentation for Speckle. The goal is to make our docs **clear, consistent, and useful** for both new and experienced users.

Canonical doc rules for AI assistants live in `.universal-ai-config/instructions/*.md`. Run `uac generate` to emit tool-specific config (see **Generating universal-ai-config instructions** below).

## Structure & Style

- **Quick Reference**
  A concise entry point for essential actions and terminology. Designed to give new users a fast orientation and provide experienced users with a rapid lookup.

- **Your Speckle Workspace**
  Guides that explain how to set up and manage workspaces, projects, and models. These are deliberately briefer than connector docs, focusing on universal web application features that every user touches. To balance brevity, they are supported with FAQs, best practices, and tips.

- **Viewing & Sharing**
  Instructions on how to explore models, create saved views, apply filters, and share data with others. Emphasis is on clarity and speed to first success, with optional callouts for tips and best practices.

- **Publishing & Loading (formerly Connectors)**
  Each connector follows the same skeleton: installation, sign-in, day-0 tasks (send/receive), followed by FAQs and troubleshooting.

  We deliberately describe this section as **Publishing & Loading** rather than "Connectors." This keeps the docs user-first and purpose-driven: users think in terms of publishing data into Speckle or loading it into another tool, not in terms of underlying plumbing. It frames the outcome (why) rather than the mechanism (how).

  **Connector Documentation Structure:**
  - Use main page sections for step-by-step guides (e.g., "Setting up Data Gateway")
  - Use accordions for FAQs and troubleshooting questions
  - Import and use standard components: `<Setup>`, `<Load>`, `<Publish>`, `<SetupFaq>`, `<LoadFaq>`, `<PublishFaq>`
  - Avoid "How to do X" accordion titles that contain step-by-step instructions—these should be main sections instead

## Tone

- Direct, simple, and jargon-light.
- Instructions are imperative (“Click…”, “Select…”, “Run…”).
- Visual where possible: screenshots, diagrams, or short clips.

## FAQs, Best Practices, and Tips

- **FAQs**: Maintained as the first stop for common issues and questions. They should be phrased in user language, short and atomic, and cover both obvious and edge-case scenarios. Use accordions for FAQs—they should answer specific questions, not provide step-by-step guides.
- **Best Practices**: Principles and recommendations that help users avoid pitfalls and make good choices. They should read as guidance, not rigid rules.
- **Tips & Tricks**: Small, optional enhancements or shortcuts. Presented as quick callouts, not workflows, and always optional to the main path.

**When to use accordions vs. main sections:**

- **Accordions**: For FAQs, troubleshooting questions, and quick reference information
- **Main sections**: For step-by-step guides, detailed procedures, and comprehensive workflows

## Guardrails

- Keep **tutorials** separate. Tutorials are narrative, multi-step guides that live outside the core docs.
- Docs should remain **reference-driven**: quick answers, reproducible steps, clear explanations.

## Balance Across Sections

Connector pages are naturally more detailed because they must cover multiple host tools, installation steps, and technical caveats. User guides, by contrast, should remain concise and focused on universal actions, but must be reinforced with FAQs, best practices, and tips to feel equally rich. This balance avoids the perception that non-connector content is “thin” by design, while still keeping it accessible.

## How We Measure Quality

- Can a new user follow a page and succeed on day 0?
- Can an experienced user land on a page, scan for the answer, and leave in under a minute?
- Are FAQs current and accurate?
- Are best practices and tips useful without being prescriptive?

## Note for Contributors

### Development

- Ensure you have Node.js 22.17.1 or newer within the 22.x line installed (matching the `engines` field in `package.json`).
- `pnpm install` to install dependencies
- `pnpm dev` to start the local dev server

### PR checks (CI)

Pull requests run [`.github/workflows/docs-pr-checks.yml`](.github/workflows/docs-pr-checks.yml) in **report-only** mode (failures do not block merge yet):

- `pnpm format:check:changed` — Prettier on files changed in the PR
- `pnpm lint:md:changed` — markdownlint on files changed in the PR (MD036/MD060 on; MD033 off for Mintlify JSX)
- `pnpm valid` — Mintlify build validation (full site)
- `pnpm check-links` — internal links and anchors (full site)

PR-scoped checks locally (matches CI):

```bash
pnpm check:changed
```

Full-repo checks (large backlog until Phase 2):

```bash
pnpm check
pnpm format
pnpm lint:md:fix
```

**Phase 2 (before making the check required):** clear full-repo debt — ~430 Prettier files, ~1.3k markdownlint findings (mostly MD060/MD036), OpenAPI `developers/api/previews/preview-openapi.json`, `snippets/components/PowerBIVersionFetcher.jsx` react import, and broken-link hits (~41 MDX files, mostly `developers/viewer` and `legacy`). Then remove `continue-on-error` from the workflow and require **Docs PR checks** in branch protection.

### Generating universal-ai-config instructions

Doc rules for AI assistants (Cursor, Copilot, Claude) are maintained as templates in `.universal-ai-config/instructions/`. To emit tool-specific config (e.g. `.cursor/rules/*.mdc` for Cursor), run:

```bash
npx universal-ai-config generate
```

Or use the project’s package manager: `pnpm uac generate`, `npm run uac generate`, or `yarn uac generate` (if a `uac` script is defined in `package.json`).

- **All targets (default):** generates for Claude, Copilot, and Cursor.
- **Specific targets:** `npx universal-ai-config generate -t cursor,claude`
- **Preview only:** `npx universal-ai-config generate --dry-run`
- **Clean then generate:** `npx universal-ai-config generate --clean`

Edit only the source templates in `.universal-ai-config/instructions/*.md`; do not edit the generated files by hand.

To generate only the targets you use, add an overrides file (e.g. `universal-ai-config.overrides.config.ts`) in the repo root and set `targets` (and optionally `variables`, `exclude`, etc.). That file is usually gitignored so each developer can choose their own targets without affecting the shared config.

### Using doc rules in AI tools

- **Cursor:** After `uac generate`, rules are in `.cursor/rules/*.mdc` and attach automatically.
- **ChatGPT / Claude:** Paste the prompt seed below into Custom Instructions or your first message; or attach this README and point to the seed.
- **Copilot (Chat):** Say “Use the AI authoring prompt seed in README as guidance for all doc edits in this session.” Optionally add at the top of the page you’re editing: `<!-- style: mintlify components; FAQs=AccordionGroup; steps=no nested components -->`

**Prompt seed** (paste once per session for non-Cursor tools):

> You are writing docs for Speckle. Follow the canonical rules in `.universal-ai-config/instructions/` (docs-general, docs-authoring, docs-steps, docs-faqs, docs-asides, docs-titles-nav-seo). After `uac generate`, Cursor users get these as `.cursor/rules/*.mdc`; other tools should use this seed or attach README.
>
> **Global:** Mintlify components only; approachable, precise tone; short, imperative sentences; task-first; show outcomes; keep pages brief; visuals when they clarify; compact FAQ + best practices + 1–3 Tips; no tutorials in core docs; cross-link by user intent.
>
> **Steps:** use `<Steps>` / `<Step>` for short sequences; verb-first titles; do **not** nest complex components; render callouts adjacent; fallback to `###` + ordered list if needed.
>
> **FAQs:** use `<AccordionGroup>` + `<Accordion title="…">`; answers are atomic; link out if longer; include an edge case.
>
> **Connectors:** frame by purpose (publish/load), not connector names; H2 order = Install → Open and sign in → Publish → Load → Common tasks → FAQ → Troubleshooting → Known issues; add a header panel (versions, download, changelog); always show the web-app handoff.

### Publishing Changes

Install our GitHub App to auto-propagate changes from your repo to your deployment. Changes will be deployed to production automatically after pushing to the default branch. Find the link to install on your dashboard.

### Troubleshooting

- **Mintlify dev isn’t running** → Run `mintlify install` to re-install dependencies.
- **Page loads as 404** → Make sure you are running in a folder with `docs.json`.

### Optional: Using Devcontainers

This repository also includes a devcontainer/Dockerfile setup. It provides a pre-configured environment with Node, Mintlify, and ZSH installed, along with a convenient `mintdev` alias.

- To use it in VS Code, open the repo and choose **Reopen in Container**. The devcontainer will build itself.
- Once inside the container, run:

```bash
mintdev
```

This will start Mintlify in verbose mode with polling enabled, ensuring file changes are picked up reliably.

Using the devcontainer is optional but recommended if you want a consistent, containerised environment without managing Node or Mintlify versions on your local machine.
