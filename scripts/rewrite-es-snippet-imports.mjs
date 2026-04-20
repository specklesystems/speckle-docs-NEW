/**
 * Normalize localized snippet imports in Spanish pages to absolute paths under
 * /snippets/es/ (Mint content root), matching English /snippets/... for non-locale MDX.
 *
 * Rewrites:
 * - from '/snippets/foo.mdx'  ->  from '/snippets/es/foo.mdx' (when not already es/)
 * - from '../snippets/foo.mdx' (any depth of ../)  ->  from '/snippets/es/foo.mdx'
 *
 * Does not change .jsx or other non-.mdx imports. Leaves /snippets/es/ unchanged.
 *
 * Usage:
 *   node scripts/rewrite-es-snippet-imports.mjs [--write] [es/path/file.mdx ...]
 *   node scripts/rewrite-es-snippet-imports.mjs --write
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import fs from 'node:fs/promises'
import nodePath from 'node:path'
import nodeUrl from 'node:url'

const REPO_ROOT = nodePath.dirname(nodePath.dirname(nodeUrl.fileURLToPath(import.meta.url)))
const WRITE = process.argv.includes('--write')
const args = process.argv.slice(2).filter((a) => a !== '--write')

/** Absolute English snippet import: /snippets/X.mdx but not /snippets/es/ */
const ABS_SNIPPET = /from\s+(['"])\/snippets\/(?!es\/)([^'"]+\.mdx)\1/g

/** Relative snippet import: one or more ../ then snippets/ */
const REL_SNIPPET = /from\s+(['"])((?:\.\.\/)+)snippets\/([^'"]+\.mdx)\1/g

/**
 * @param {string} source
 * @returns {{ next: string, changed: boolean }}
 */
function rewriteOne(source) {
  let changed = false
  let next = source.replace(ABS_SNIPPET, (_full, quote, path) => {
    changed = true
    return `from ${quote}/snippets/es/${path}${quote}`
  })
  next = next.replace(REL_SNIPPET, (_full, quote, _dots, path) => {
    changed = true
    return `from ${quote}/snippets/es/${path}${quote}`
  })
  return { next, changed }
}

async function collectEsMdx() {
  /** @type {string[]} */
  const out = []
  async function walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const e of entries) {
      const p = nodePath.join(dir, e.name)
      if (e.isDirectory()) await walk(p)
      else if (e.isFile() && e.name.endsWith('.mdx')) out.push(p)
    }
  }
  const esDir = nodePath.join(REPO_ROOT, 'es')
  if (!existsSync(esDir)) return out
  await walk(esDir)
  return out
}

async function main() {
  /** @type {string[]} */
  let files = args.length > 0 ? args.map((a) => nodePath.resolve(REPO_ROOT, a)) : await collectEsMdx()

  let touched = 0
  for (const abs of files) {
    if (!existsSync(abs) || !abs.endsWith('.mdx')) continue
    const raw = readFileSync(abs, 'utf8')
    if (!raw.includes('snippets/')) continue
    const { next, changed } = rewriteOne(raw)
    if (!changed) continue
    touched += 1
    const rel = nodePath.relative(REPO_ROOT, abs)
    console.log(WRITE ? 'write' : 'would write', rel)
    if (WRITE) writeFileSync(abs, next, 'utf8')
  }
  console.log(WRITE ? `Updated ${touched} file(s).` : `${touched} file(s) would change. Pass --write to apply.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
