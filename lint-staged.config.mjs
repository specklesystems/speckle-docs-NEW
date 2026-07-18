/**
 * Staged-file format/lint — mirrors CI Format and lint job scope.
 * Does not run mint validate or broken-links (too slow for every commit).
 */

const prettierGlobs = '*.{md,mdx,js,jsx,ts,tsx,json,jsonc,yml,yaml}'

/** Paths markdownlint should skip (same idea as scripts/lint-md-changed.sh). */
function shouldLintMarkdown(file) {
  const skipPrefixes = [
    'node_modules/',
    '.mintlify/',
    '.cursor/',
    '.claude/',
    '.github/skills/',
    '.github/instructions/',
    '.universal-ai-config/'
  ]
  if (skipPrefixes.some((p) => file.startsWith(p) || file.includes(`/${p}`))) {
    return false
  }
  if (file.includes('/notebooks/') || file.startsWith('notebooks/')) {
    return false
  }
  return true
}

export default {
  [prettierGlobs]: 'prettier --write',
  '*.{md,mdx}': (files) => {
    const lintable = files.filter(shouldLintMarkdown)
    if (lintable.length === 0) {
      return []
    }
    return ['markdownlint-cli2', '--no-globs', ...lintable]
  }
}
