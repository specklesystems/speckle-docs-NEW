---
name: open-dev-speckle-in-browser
description: Open local Speckle development environment in a browser for exploring flows and taking documentation screenshots. Triggers when user wants to run Speckle locally, capture screenshots, or explore the app UI.
argumentHint: "[optional: path to speckle-server repo]"
---

# Open Local Speckle Dev Environment for Documentation

Launch the local Speckle development environment in a browser to explore UI flows and capture professional screenshots for documentation.

## 1. Resolve the speckle-server Repo Path

Check for a saved path first, then fall back to asking:

1. Read the auto-memory file at the memory directory path for this project. Look for a `speckle-server-repo-path` entry.
2. If $ARGUMENTS contains a path, use it and update memory.
3. If no saved path and no argument, ask the user with AskUserQuestion for the absolute path to their local `speckle-server` repo.
4. Validate the path exists and contains a recognizable Speckle Server repo (e.g. check for `packages/` directory or `package.json` with speckle references).
5. Save/update the path in your auto-memory file for subsequent invocations.

**If no valid repo path can be resolved, stop here.** Output: "A local speckle-server repository is required to run this skill. Provide the path as an argument or when prompted."

## 2. Explore the speckle-server Repo

All exploration, skill reading, and CLI commands in this section and beyond run with **CWD set to the speckle-server repo path**.

1. Use an Explore agent (CWD = speckle-server repo) to read AI instructions and discover available skills. Specifically locate and read the **open-app-in-browser** skill file.
2. Read that skill's full content — it contains the authoritative instructions for launching the app, preparing test users, and operating the browser.

## 3. Launch the Speckle App in the Browser

Follow the instructions from the **open-app-in-browser** skill exactly, executing all commands with CWD = speckle-server repo. This typically includes:

- Starting required services (docker containers, dev servers)
- Creating/preparing test user accounts
- Opening the app in a browser via MCP or Playwright tooling

Delegate this work to a sub-agent or run the skill directly within the speckle-server repo context as the open-app-in-browser skill prescribes.

## 4. Prepare Data for Professional Screenshots

Before capturing any screenshots, audit visible workspace data:

1. Review workspace names, project names, and model names visible in the UI.
2. Flag any that look unprofessional, auto-generated, or ugly (e.g. "test-123", "asdf", "New Project (1)", placeholder strings).
3. Either:
   - **Rename** them to clean, professional names that would look good in documentation (e.g. "Architecture Office", "Residential Tower", "Site Model").
   - **Select different data** if renaming is not feasible — navigate to workspaces/projects with presentable names.
4. Ensure avatars, descriptions, and other visible metadata are reasonable.
5. Ensure screenshots are taken in light theme

Goal: every screenshot should look like a polished product demo, not a developer's test environment.

## 5. Capture Screenshots

Once the environment is clean and professional:

1. Navigate to the page/flow requested by the user (or explore as directed).
2. Take screenshots using available browser tooling.
3. Save screenshots to the docs project image directory structure.
4. Report file paths back to the user.

## Key Rules

- **All speckle-server commands run with CWD = the speckle-server repo path.** Do not run them from the docs project directory.
- **Re-read open-app-in-browser on every invocation** — do not cache its contents across sessions. The skill may have changed.
- **Memory persistence**: save the repo path for subsequent invocations IF your AI Agent supports it. This should not be some kind of repo-level memory file, but Claude Memory or Copilot memory or something equivalent.
- **Exit early** if the repo path is missing or invalid — do not attempt partial execution.
