---
description: User intent and persona by doc type — developers, users, IT support
alwaysApply: true
---

# Docs Agent — Persona and Audience

## User Intent and Persona by Doc Type

Match the audience to the doc type. Write for the person viewing the docs.

| Doc type | Audience | Intent |
| --- | --- | --- |
| **Developer docs** | Developers | Build, integrate, extend, debug |
| **User guides** | Users | Use the product, publish, load, share, view |
| **IT support docs** | IT teams supporting Speckle deployment | Deploy, configure, troubleshoot, support users |

- Developer docs: env vars, APIs, SDKs, connectors, server setup.
- User guides: workspaces, connectors (publish/load), 3D viewer, sharing.
- IT support docs: deployment, admin support mode, workspace admin flows, enterprise features.

## IT Support Audience Hierarchy

Within IT support docs, the audience tiers are:

1. **IT teams and workspace admins** — primary; enterprise customers who deploy or manage Speckle.
2. **Server admins** — last tier; smallest audience. Includes Speckle ops running enterprise deployments and, to a lesser extent, customers who run servers with an enterprise license.

When a feature involves both workspace admins and server admins, lead with workspace admins. Server admin content is for this narrow audience; repeat contextual Notes (e.g. Enterprise Server only) under their section so they see it when they jump there.

## Audience Framing

- All content is written for the reader — never assume Speckle internal staff.
- **User guides**: "you" = the user. Plain language, task-first.
- **IT support docs**: "you" = IT or workspace admin (the customer). Use "your server admin" when addressing workspace admins about someone else's role.
- **Developer docs**: "you" = the developer. Technical, precise.

## Partition by Persona (Multi-Role Features)

- When a feature involves multiple roles (e.g. server admin, workspace admin), structure content by persona so readers can jump to their section.
- Use "As a [role]" headings.
- Lead with the gatekeeper role when the flow involves request-and-approve.
- Put each role's actions under their section; do not mix both roles in one block.
- Repeat Notes that apply to a persona under that persona's section (e.g. Enterprise Server only — repeat under "As a server admin").

## Intent-First Intro

- Lead with why and when (user intent, problem, scenario) before mechanics.
- Prefer: "When a workspace issue requires support, your server admin may need to inspect or fix data."
- Avoid: "This feature gives server administrators controlled, auditable access."

## Step Outcomes and Verification

- Each step ends with an observable outcome.
- Add a verification line ("You should see...") after flows where failure is silent.

## FAQ Hygiene

- Remove FAQs that duplicate main content.
- Keep FAQs that add value (edge cases, expiration, connectors).
