#!/usr/bin/env node
/**
 * Orphan page check.
 *
 * Finds pages that exist as files but appear nowhere in navigation.json.
 * Some orphans are deliberate — pages published so they can be shared as a
 * direct link without cluttering the sidebar. Those belong in the allowlist
 * (scripts/orphan-allowlist.txt), which requires a reason next to each entry.
 *
 * Everything else is either dead content or a page someone forgot to add to
 * the nav, and both are worth knowing about.
 *
 * Usage:
 *   node scripts/check-orphans.mjs
 *   node scripts/check-orphans.mjs --warn-only
 *   node scripts/check-orphans.mjs --list      # print current orphans, no exit code
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const ALLOWLIST = path.join(__dirname, 'orphan-allowlist.txt')

/**
 * Trees that are not part of the live navigation by design: historical content
 * kept for redirect targets, and include-only fragments.
 */
const EXCLUDED_TREES = ['snippets', 'legacy', 'classic', 'node_modules', '.git', '.mintlify']

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || EXCLUDED_TREES.includes(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (entry.name.endsWith('.mdx')) out.push(full)
  }
  return out
}

/** Every page path referenced anywhere in the navigation tree. */
function navPages(node, found = new Set()) {
  if (Array.isArray(node)) {
    for (const item of node) navPages(item, found)
  } else if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      if (key === 'pages') {
        for (const page of value) {
          if (typeof page === 'string') found.add(page)
          else navPages(page, found)
        }
      } else if (value && typeof value === 'object') {
        navPages(value, found)
      }
    }
  }
  return found
}

/** Allowlist entries: one path per line, `#` comments, trailing /* for a subtree. */
function loadAllowlist() {
  if (!fs.existsSync(ALLOWLIST)) return []
  return fs
    .readFileSync(ALLOWLIST, 'utf8')
    .split('\n')
    .map((line) => line.replace(/#.*$/, '').trim())
    .filter(Boolean)
}

function isAllowed(page, patterns) {
  return patterns.some((p) => (p.endsWith('/*') ? page.startsWith(p.slice(0, -1)) : page === p))
}

function main() {
  const warnOnly = process.argv.includes('--warn-only')
  const listOnly = process.argv.includes('--list')

  const nav = JSON.parse(fs.readFileSync(path.join(root, 'navigation.json'), 'utf8'))
  const referenced = navPages(nav)
  const patterns = loadAllowlist()

  const pages = walk(root).map((f) =>
    path
      .relative(root, f)
      .replace(/\.mdx$/, '')
      .split(path.sep)
      .join('/')
  )

  const orphans = pages.filter((p) => !referenced.has(p)).sort()
  const unexpected = orphans.filter((p) => !isAllowed(p, patterns))
  const allowed = orphans.filter((p) => isAllowed(p, patterns))

  console.log(
    `Checked ${pages.length} pages against ${referenced.size} navigation entries.\n` +
      `${orphans.length} not in navigation — ${allowed.length} allowlisted, ${unexpected.length} unexpected.\n`
  )

  if (listOnly) {
    for (const p of orphans) console.log(`${isAllowed(p, patterns) ? '  ok ' : '  NEW'}  ${p}`)
    return
  }

  if (!unexpected.length) {
    console.log('No unexpected orphan pages.')
    return
  }

  console.log('Pages that exist but are not reachable from navigation:\n')
  for (const p of unexpected) console.log(`  - ${p}`)
  console.log(
    '\nIf a page is deliberately unlisted (published for direct-link sharing),\n' +
      'add it to scripts/orphan-allowlist.txt with a short reason.\n' +
      'Otherwise add it to navigation.json, or delete it.'
  )

  if (!warnOnly) process.exitCode = 1
}

main()
