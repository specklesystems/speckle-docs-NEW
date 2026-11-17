# Connector pages (publishing and loading)

Applies to pages under `connectors/`. `README.md` ("Publishing & Loading") explains why the section is framed by outcome rather than by connector.

- **Purpose-first:** write about **publish** and **load**, not connector names.
- **H2 order:**
  1. Install
  2. Open and sign in
  3. Publish
  4. Load
  5. Common tasks (3–5 micro-guides)
  6. FAQ (Accordion)
  7. Troubleshooting (top issues, log path, forum link)
  8. Known issues
- **Header panel:** supported host versions, connector version, last updated, download, changelog.
- **Shared sections:** reuse the snippets in `snippets/connectors/` (`Setup`, `Login`, `Publish`, `Load`, `SetupFaq`, `PublishFaq`, `LoadFaq`) instead of rewriting them per connector.
- **Web app handoff:** after Publish/Load, show where the data appears in the browser and link to Viewing and Sharing / Workspace.
- Step-by-step procedures are main sections, never accordion items; accordions hold FAQs and troubleshooting questions only.

## Update the latest-version reference

Use this sequence when a connector release changes or someone asks for the current connector
versions:

1. Run `pnpm versions:connectors:page`. This fetches the stable Windows EXE, Windows ZIP and
   available macOS PKG releases, then replaces `connectors/latest-versions.mdx`.
2. Review the generated diff against [Speckle Releases](https://releases.speckle.systems/). Account
   for every changed public product name, version and download URL.
3. Keep the page as a direct-link reference: it stays out of `navigation.json` and remains in
   `scripts/orphan-allowlist.txt`.
4. Run the `docs-page-review` skill on the generated page, then `pnpm check`.

The update is complete when the page, including its timestamp, matches the output from the same
generator run, `pnpm check` passes, and the orphan check reports the page as allowlisted.
