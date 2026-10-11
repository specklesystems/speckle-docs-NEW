# Documentation frontmatter schemas

The docs are one corpus that describes the product as it works today (GRO-1035). There is no
per-version frontmatter: do not add `docs_version`, `docs_status`, `docs_authority`,
`applies_to_version`, `applies_from`, `changes_in_version`, `changes_from`, `change_scope` or
`next_docs`. A page whose guidance applies only to data published before 2026.9 says so in a
visible `<Note>` at the top of the body, where readers, search engines and Fin all read it.

## Pages with an existing legacy-connector notice

Apply only where the page already renders `LegacyWarning`, which recommends newer connectors
(the frozen `legacy/` tree):

```yaml
product_generation: legacy
docs_status: superseded
docs_authority: historical
change_scope: Legacy connector guidance; the existing notice recommends newer connectors.
replacement_docs:
  - /connectors/overview
```

`docs_authority: historical` and the page's agent-only historical-use instruction keep these
pages retrievable for the legacy (v2) connector they describe. `replacement_docs` is a
navigation starting point, not an asserted one-to-one replacement. Do not infer a deprecation
date from this older notice.

## Agent instructions

- `markdown.instructions` in `docs.json` holds the site-wide rules for AI readers. Mintlify
  appends them to page Markdown exports, `llms.txt` and `llms-full.txt`.
- `<Visibility for="agents">` is reserved for the legacy-connector pages above. Do not use it
  to route between versions or to carry information a human reader also needs.
- These are content instructions, not a guarantee that every external LLM or ingestion service
  obeys them. Verify Fin's answers after a deploy that changes them.

## Standard fields

Use Mintlify's standard fields when their documented semantics match the intent:

| Standard field                                | Use and boundary                                                                                      |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `title`, `description`, `sidebarTitle`, `tag` | Page and navigation presentation; preserve these fields.                                              |
| `deprecated: true`                            | A whole-page deprecated label. Only with explicit evidence that the documented subject is deprecated. |
| `boost`                                       | Multiplier for Mintlify in-product search ranking; not an AI precedence rule.                         |
| `noindex`                                     | Excludes a page from site search, sitemaps, search engines and Mintlify assistant context.            |
| `searchable`                                  | Controls Mintlify search and assistant inclusion.                                                     |
| `lastUpdatedDate`                             | Actual page update date.                                                                              |
| `related`                                     | Related-topic presentation.                                                                           |

References: [Page metadata](https://www.mintlify.com/docs/organize/pages),
[Markdown export](https://www.mintlify.com/docs/ai/markdown-export),
[Visibility](https://www.mintlify.com/docs/components/visibility).
