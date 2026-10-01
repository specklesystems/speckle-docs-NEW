# Where server configuration goes

Read before documenting server configuration: env vars, feature flags, Helm values, docker-compose. User guides carry none of it (`AGENTS.md` → Content rules); this doc says where it goes instead.

Speckle has two server source repos:

- [speckle-server-internal](https://github.com/specklesystems/speckle-server-internal) — private; latest features for Speckle cloud and enterprise deployments.
- [speckle-server](https://github.com/specklesystems/speckle-server) — public; features land here when ready for public release.

Where config goes depends on which repo contains the feature:

- **Public (in speckle-server):**
  - `developers/server/getting-started` — env vars, feature flags, docker-compose config.
  - `developers/server/deployment/kubernetes-with-helm` — Helm chart values.
- **Enterprise-only (speckle-server-internal only):** `developers/server/deployment/enterprise-license` only.
- **Both** (public feature with Enterprise additions):
  - Document the base config in the open-source guides as above.
  - The Enterprise guide also covers the feature's setup; when its Helm values are identical to `kubernetes-with-helm`, link there instead of duplicating.
