/**
 * Staged-file format/lint — aligned with CI Format and lint.
 * - Prettier: blocking (auto-writes)
 * - markdownlint: blocking on staged markdown (matches CI changed-file gate)
 * Does not run mint validate / links / a11y.
 */

import path from 'node:path'

const prettierGlobs = '*.{md,mdx,js,jsx,mjs,cjs,ts,tsx,json,jsonc,yml,yaml,css}'

/** Paths markdownlint should skip (same idea as scripts/lint-md-changed.sh). */
function shouldLintMarkdown(file) {
  // Repo-relative with `/` separators (ENG-10126): lint-staged passes absolute paths, where a
  // substring match also hits checkout ancestors, e.g. a worktree under .claude/worktrees/.
  const rel = path.relative(process.cwd(), path.resolve(file)).split(path.sep).join('/')
  const skipPrefixes = [
    'node_modules/',
    '.mintlify/',
    '.cursor/',
    '.claude/',
    '.agents/',
    'AGENTS.md',
    'agents/',
    'docs/agents/'
  ]
  if (skipPrefixes.some((p) => rel.startsWith(p))) {
    return false
  }
  if (rel.includes('/notebooks/') || rel.startsWith('notebooks/')) {
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
