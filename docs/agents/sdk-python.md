# specklepy Documentation

Applies when creating or editing pages under `developers/sdks/python/`.

## Audience (scripts first)

Primary reader: **citizen developer / AEC hacker** — notebook, script, small automation beside existing AEC tools.

Secondary reader: maintained integrations and connector-adjacent tooling. specklepy is already import-and-go friendly; **do not** over-index connector deployment patterns on introduction or quickstart pages.

Full persona rules: see **Developer Docs Audience Hierarchy** in `docs/agents/persona-audience.md`.

## Default examples

- Lead with `SpeckleClient`, `operations.send3` / `operations.receive3`, and PAT or `get_default_account()`.
- Keep deprecated `operations.send` / `operations.receive` examples in migration or explicitly
  object-graph-scoped sections; never restore them as the general default.
- Keep examples copy-pasteable in one script or notebook cell.
- Version comparison tabs follow `docs/agents/versioned-snippets.md` (same setup; only the changed call differs).
- Put advanced topics (custom transports at scale, connector-specific object graphs, proxy unpacking) in guides — not the first screen.

## Parity with .NET docs

When both SDKs document the same concept:

- specklepy: emphasize simplicity (direct imports).
- .NET: emphasize one-time bootstrap + `Send3`/`Receive3` for script parity — link to [Scripts and Notebooks](/developers/sdks/dotnet/getting-started/scripts-and-notebooks), not DI concept pages.

Do not let .NET connector docs set the tone for specklepy pages unless the workflow is genuinely connector-only.
