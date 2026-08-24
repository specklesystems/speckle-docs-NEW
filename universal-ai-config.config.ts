import { defineConfig } from 'universal-ai-config'

export default defineConfig({
  targets: ['claude', 'copilot', 'cursor'],
  /**
   * Shared stack-wide templates from the atlas repo (ADR-0001 there). In the
   * standard nested checkout this resolves to <checkout root>/atlas/uac; in a
   * bare clone the dir is missing and uac silently skips it. Nonstandard
   * layouts: point at your atlas clone in the overrides config.
   *
   * Local templates win name conflicts; don't add local copies of shared
   * skills.
   */
  additionalTemplateDirs: ['../atlas/uac'],
  variables: {
    projectName: 'speckle-docs',
    /**
     * Rendered into shared skills' "how to regenerate" guidance.
     */
    uacGenerateCommand: 'mise run uac-generate'
  },
  mcp: {
    /**
     * Shared MCP servers (linear, figma, chrome-devtools) stay personal
     * opt-ins via the gitignored universal-ai-config.overrides config,
     * same as the other stack repos.
     */
    forceOptIn: true
  }
})
