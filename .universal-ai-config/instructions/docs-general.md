---
description: Documentation general principles — user intent, progressive disclosure, document what exists today
alwaysApply: true
---

# Docs Agent — General Principles

## Audience

- Mixed technical and non-technical users.

## Principles

- User intent over system architecture.
- Progressive disclosure: simple first, depth later.
- Document what exists today.

## Quality Bar

- A first-time user can succeed without external help.
- A returning user can scan and jump to the right section.

## Content Separation

- User-facing pages (`workspaces/`, `connectors/`, `3d-viewer/`) describe what a feature does and how to use it in the UI.
- Feature flags, Helm values, env vars, and docker-compose config never appear in user-facing pages.
- If a feature requires server-side setup, the user-facing page states availability and links to the deployment guide — never reproduces the setup instructions.

## Where to Document Server Configuration

Speckle has two source repos:
- [speckle-server-internal](https://github.com/specklesystems/speckle-server-internal) — private; latest features for Speckle cloud and enterprise deployments.
- [speckle-server](https://github.com/specklesystems/speckle-server) — public; features merged here when ready for public release.

Where config goes depends on which repo contains the feature:
- **Public (merged to speckle-server)**:
  - `developers/server/getting-started` — env vars, feature flags, docker-compose config.
  - `developers/server/deployment/kubernetes-with-helm` — Helm chart values.
- **Enterprise-only (speckle-server-internal only)**: document in `developers/server/deployment/enterprise-license` only.
- **Both repos** (public feature with Enterprise additions):
  - Document the base config in the open-source guides as above.
  - The Enterprise guide should also cover the feature's setup, but if the Helm values are identical to what's already in `kubernetes-with-helm`, link there instead of duplicating.

## Enterprise-Only Features

- Speckle can be self-hosted, but certain features require an Enterprise license and deployment.
- Features gated behind the Enterprise license (documented in `developers/server/deployment/enterprise-license.mdx`) must include a `<Note>` on their user-facing page stating the feature is available only on Speckle Enterprise Server.
- Current Enterprise-only features: Workspaces, Admin Support Mode, Saved Views, Issues, Multi-regional Deployment, Automate, Intelligence, ACC Integration, extended Direct Uploads.
- Add role restrictions when applicable (e.g. "visible only to server administrators").
- Always link to the relevant section in the Enterprise deployment guide for setup instructions.
