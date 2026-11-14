# Examples

Runnable sample projects that go with the Speckle docs. Each folder is standalone: copy the one you
need. To take a single folder without the rest of the docs repo:

```bash
git clone --filter=blob:none --sparse --depth 1 \
  https://github.com/specklesystems/speckle-docs-new.git
cd speckle-docs-new
git sparse-checkout set examples/<folder>
```

| Folder                                                     | What it does                                                                                                                     | Guide                                                                                                                            |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| [`bundle-properties-function`](bundle-properties-function) | An Azure Function (Python, TypeScript, C#) or AWS Lambda (Python, TypeScript) that returns a bundle version's properties as JSON | [Use model properties in Power Automate, Zapier, or n8n](https://docs.speckle.systems/developers/api/guides/low-code-properties) |
| [`viewer-bundle-bridge`](viewer-bundle-bridge)             | A mini app that loads a 2026.9 bundle into the published `@speckle/viewer`                                                       | [Load a 2026.9 bundle in the Viewer](https://docs.speckle.systems/developers/viewer/loading-bundles)                             |
