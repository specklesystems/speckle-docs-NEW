/**
 * Staged-file format/lint — aligned with CI Format and lint (Phase 2b).
 * - Prettier: blocking (auto-writes)
 * - markdownlint: blocking on staged markdown (matches CI changed-file gate)
 * Does not run mint validate / links / a11y.
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

function shellQuote(file) {
  return `'${file.replace(/'/g, `'\\''`)}'`
}

export default {
  [prettierGlobs]: 'prettier --write',
  '*.{md,mdx}': (files) => {
    const lintable = files.filter(shouldLintMarkdown)
    if (lintable.length === 0) {
      return []
    }
    // Single shell string — lint-staged array form (`bash`, script, files) was hanging.
    return [`bash scripts/lint-md-staged.sh ${lintable.map(shellQuote).join(' ')}`]
  }
}
