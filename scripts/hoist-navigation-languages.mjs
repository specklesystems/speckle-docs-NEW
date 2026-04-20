/**
 * Hoist `navigation.dropdowns` into Mintlify `navigation.languages` (en + es).
 * Spanish entry uses the same tree with every MDX page path prefixed `es/`,
 * except OpenAPI-style `GET /…` / `POST /…` entries and URLs.
 *
 * Usage: node scripts/hoist-navigation-languages.mjs --write
 * Without --write, prints a short summary only.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import nodePath from 'node:path'
import nodeUrl from 'node:url'

const REPO_ROOT = nodePath.dirname(nodePath.dirname(nodeUrl.fileURLToPath(import.meta.url)))
const DOCS_JSON = nodePath.join(REPO_ROOT, 'docs.json')

function deepClone(v) {
  return JSON.parse(JSON.stringify(v))
}

function shouldSkipPagePrefix(s) {
  if (typeof s !== 'string') return true
  if (/^https?:\/\//i.test(s)) return true
  if (/^[A-Z]+\s+\//.test(s)) return true
  if (/\.json$/i.test(s)) return true
  return false
}

/**
 * @param {unknown} node
 * @returns {unknown}
 */
function prefixEsNav(node) {
  if (Array.isArray(node)) {
    return node.map((x) => prefixEsNav(x))
  }
  if (node && typeof node === 'object') {
    /** @type {Record<string, unknown>} */
    const out = {}
    for (const [k, v] of Object.entries(node)) {
      if (k === 'pages' && Array.isArray(v)) {
        out[k] = v.map((item) => {
          if (typeof item === 'string') {
            if (shouldSkipPagePrefix(item)) return item
            if (item.startsWith('es/')) return item
            return `es/${item}`
          }
          return prefixEsNav(item)
        })
      } else if (v && (typeof v === 'object' || Array.isArray(v))) {
        out[k] = prefixEsNav(v)
      } else {
        out[k] = v
      }
    }
    return out
  }
  return node
}

const write = process.argv.includes('--write')
const raw = readFileSync(DOCS_JSON, 'utf8')
const doc = JSON.parse(raw)

if (!doc.navigation || !Array.isArray(doc.navigation.dropdowns)) {
  console.error('Expected doc.navigation.dropdowns (array)')
  process.exit(1)
}

if (doc.navigation.languages) {
  console.error('navigation.languages already exists; aborting to avoid double hoist.')
  process.exit(1)
}

const dropdownsEn = doc.navigation.dropdowns
const dropdownsEs = prefixEsNav(deepClone(dropdownsEn))

doc.navigation = {
  languages: [
    { language: 'en', dropdowns: dropdownsEn },
    { language: 'es', dropdowns: dropdownsEs },
  ],
}

const out = `${JSON.stringify(doc, null, 2)}\n`

if (!write) {
  console.log('Dry run: would write languages [en, es] with es/ prefixed page paths.')
  console.log('Re-run with --write to update docs.json')
  process.exit(0)
}

writeFileSync(DOCS_JSON, out, 'utf8')
console.log('Updated docs.json with navigation.languages (en, es).')
