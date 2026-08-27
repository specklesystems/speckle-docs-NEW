---
name: document-dev-speckle-feature
description: Explore a new feature in a local Speckle Server deployment and create documentation pages for it. Handles codebase exploration, screenshot capture, doc placement, and page creation.
argumentHint: '[feature name or description]'
---

# Document a New Speckle Feature

Explore a recently developed feature in a local Speckle Server deployment, understand how it works, and create documentation pages for this docs project.

## 1. Resolve the speckle-server Repo Path

1. Check auto-memory for a saved `speckle-server-repo-path`.
2. If $ARGUMENTS contains a path, use it and update memory.
3. If no saved path and no argument, ask the user with AskUserQuestion for the absolute path to their local `speckle-server` repo.
4. Validate the path exists and contains a Speckle Server repo (check for `packages/` or speckle references in `package.json`).
5. Save/update the path in auto-memory.

**If no valid repo path can be resolved, stop.** Output: "A local speckle-server repository is required. Provide the path as an argument or when prompted."

## 2. Determine Documentation Placement

Read `docs.json` in the docs project root. The navigation has 3 top-level dropdowns:

- **User Guides** — end-user documentation (workflows, UI features, connectors)
- **Developers** — API, SDKs, server, automate, viewer, data schema
- **IT Administrators** — deployment, setup, manual installation

A feature may need docs in **multiple** dropdowns (e.g. a new workspace feature might need a User Guide page AND an IT Admin page).

Present the user with:

1. The 3 dropdown categories and their existing group structure
2. Suggested placement(s) based on the feature description
3. Ask which dropdown(s) and group(s) to target
4. Ask for the file path(s) within the docs structure (e.g. `workspaces/new-feature.mdx`)

Accept user overrides — they may want docs in unexpected locations.

## 3. Explore the Feature in the Codebase

Run an Explore agent with **CWD = the speckle-server repo path**. The agent should:

1. Discover and read relevant AI instructions and skills in the speckle-server repo (check `.claude/`, `.cursor/`, CLAUDE.md, etc.)
2. Search for code related to the feature — components, API routes, GraphQL resolvers, database migrations, services
3. Understand the feature's architecture: what it does, how users interact with it, what data flows exist, edge cases, permissions
4. Identify UI entry points (routes, components) for screenshot planning
5. Return a structured summary: purpose, user-facing behavior, technical details, UI locations, configuration options, limitations

## 4. Screenshot Strategy

Ask the user with AskUserQuestion which approach to use:

- **Automatic screenshots** — launch Speckle locally and capture screenshots via browser tooling
- **Placeholders** — mark capture sites with IMAGE_PLACEHOLDER comments (fill in later)
- **Skip screenshots** — no images and no placeholder comments in the initial draft

### If automatic screenshots are chosen:

1. Invoke the **open-dev-speckle-in-browser** skill (pass the speckle-server repo path as argument)
2. Navigate to the relevant UI areas identified during exploration
3. Capture **focused, well-cropped screenshots** — crop to the relevant UI element or section, not the full page (unless the full page view is what matters)
4. Save screenshots to the appropriate `images/` subdirectory in the docs project
5. Use descriptive filenames matching the doc structure (e.g. `images/workspaces/new-feature/settings-panel.png`)

### If placeholders are chosen:

Follow **docs-image-placeholders**. Insert one JSX comment per capture, adjacent to instructional Steps and at the head of sections that introduce a new UI surface or concept:

```
{/* IMAGE_PLACEHOLDER: UI location — what must be visible. */}
```

Do not point a Frame at a missing placeholder.png. Do not tell readers a screenshot is coming. End the task with a list of the comments so they can be grepped later.

## 5. Create Documentation Pages

Generate the doc pages following these rules:

### Structure

- Follow the authoring rules in the project's instruction files (docs-authoring, docs-steps, docs-faqs, docs-asides, docs-versioned-snippets, docs-titles-nav-seo)
- Use Mintlify components: Steps/Step, AccordionGroup/Accordion, Tip, Note, Warning, Frame, Tabs/Tab
- Match the tone and depth of existing pages in the target section

### Content

- Frame by user action, not system architecture
- Include: overview, step-by-step workflow, FAQ (AccordionGroup), tips
- Cross-link related existing pages
- For notebooks and other downloadable assets, follow **Downloadable assets** in docs-authoring (raw GitHub links only; never relative `.ipynb` paths on the docs site)
- Add frontmatter: title, description, sidebarTitle

### For each page:

1. Write the `.mdx` file content
2. Show the user the proposed content before writing
3. After user approval, write the file and update `docs.json` navigation to include the new page(s)

## 6. Final Review

Present a summary:

- Pages created (with file paths)
- Navigation changes made to `docs.json`
- Screenshots captured or IMAGE_PLACEHOLDER comments to fill
- Suggested cross-links to add in existing pages

## Key Rules

- **All speckle-server exploration runs with CWD = speckle-server repo.** Do not explore that codebase from the docs directory.
- **Memory persistence**: save the repo path for subsequent invocations IF your AI Agent supports it. This should not be some kind of repo-level memory file, but Claude Memory or Copilot memory or something equivalent.
- **Exit early** if repo path is missing or invalid.
- **Multiple doc locations**: a feature often needs docs in more than one dropdown — always ask.
- **User approval before writing**: show draft content and get confirmation before creating files.
