/**
 * For each `es/...` page path in docs.json Spanish navigation, ensure `es/....mdx`
 * exists by copying the English source when missing (English placeholder until translated).
 *
 * Usage: node scripts/ensure-es-stubs-from-nav.mjs --write
 */

import { existsSync, mkdirSync, readFileSync, copyFileSync } from 'node:fs'
import nodePath from 'node:path'
import nodeUrl from 'node:url'

const REPO_ROOT = nodePath.dirname(nodePath.dirname(nodeUrl.fileURLToPath(import.meta.url)))
const DOCS_JSON = nodePath.join(REPO_ROOT, 'docs.json')

function shouldSkipPagePrefix(s) {
  if (typeof s !== 'string') return true
  if (/^https?:\/\//i.test(s)) return true
  if (/^[A-Z]+\s+\//.test(s)) return true
  if (/\.json$/i.test(s)) return true
  return false
}

/**
 * @param {unknown} node
 * @param {Set<string>} out
 */
function collectEsPagePaths(node, out) {
  if (Array.isArray(node)) {
    for (const x of node) collectEsPagePaths(x, out)
    return
  }
  if (node && typeof node === 'object') {
    const o = /** @type {Record<string, unknown>} */ (node)
    if (Array.isArray(o.pages)) {
      for (const p of o.pages) {
        if (typeof p === 'string') {
          if (!shouldSkipPagePrefix(p) && p.startsWith('es/')) out.add(p)
        } else {
          collectEsPagePaths(p, out)
        }
      }
    }
    for (const [k, v] of Object.entries(o)) {
      if (k !== 'pages') collectEsPagePaths(v, out)
    }
  }
}

const write = process.argv.includes('--write')
const doc = JSON.parse(readFileSync(DOCS_JSON, 'utf8'))
const langs = doc.navigation?.languages
if (!Array.isArray(langs)) {
  console.error('Expected navigation.languages')
  process.exit(1)
}
const esNav = langs.find((l) => l.language === 'es')
if (!esNav) {
  console.error('No es language entry')
  process.exit(1)
}

const paths = new Set()
collectEsPagePaths(esNav, paths)

let created = 0
let skipped = 0
let missingEn = 0

for (const page of paths) {
  const rel = `${page}.mdx`
  const dest = nodePath.join(REPO_ROOT, rel)
  const enRel = `${page.replace(/^es\//, '')}.mdx`
  const src = nodePath.join(REPO_ROOT, enRel)
  if (existsSync(dest)) {
    skipped++
    continue
  }
  if (!existsSync(src)) {
    console.warn(`Missing English source for ${page}: ${enRel}`)
    missingEn++
    continue
  }
  if (write) {
    mkdirSync(nodePath.dirname(dest), { recursive: true })
    copyFileSync(src, dest)
  }
  created++
}

if (!write) {
  console.log(`Would create ${created} stub(s), skip ${skipped} existing, ${missingEn} missing English.`)
  console.log('Re-run with --write')
  process.exit(0)
}

console.log(`Created ${created} stub(s), skipped ${skipped} existing, ${missingEn} missing English.`)
