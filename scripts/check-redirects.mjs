#!/usr/bin/env node
/**
 * Redirect integrity check.
 *
 * `mint broken-links --check-redirects` verifies that redirect *destinations*
 * resolve. It does not check whether a redirect *source* shadows a page that
 * actually exists — a redirect always wins over the page, so a stray wildcard
 * silently makes real docs unreachable. That is the failure this script exists
 * to catch, along with four related classes.
 *
 * Checks:
 *   1. schema      — only source/destination/permanent keys; both required
 *   2. duplicates  — the same source declared twice
 *   3. self        — source === destination
 *   4. shadow      — source (or wildcard prefix) matches a live page
 *   5. chain       — destination is itself a redirect source
 *   6. dangling    — destination resolves to no page
 *
 * Usage:
 *   node scripts/check-redirects.mjs
 *   node scripts/check-redirects.mjs --warn-only
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

/** Mintlify's redirect schema. Anything else is silently ignored at build time. */
const ALLOWED_KEYS = new Set(['source', 'destination', 'permanent'])

/**
 * Trees kept in the repo purely as historical source and deliberately shadowed
 * by redirects. Sources under these prefixes are exempt from the shadow check.
 */
const INTENTIONALLY_SHADOWED = ['/classic/', '/legacy/']

/** Directories that hold no routable pages. */
const NOT_ROUTABLE = ['node_modules', 'snippets', '.git', '.mintlify']

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || NOT_ROUTABLE.includes(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (entry.name.endsWith('.mdx') || entry.name.endsWith('.md')) out.push(full)
  }
  return out
}

/** Every routable page path, as a leading-slash URL with no extension. */
function livePages() {
  return new Set(
    walk(root).map(
      (f) =>
        '/' +
        path
          .relative(root, f)
          .replace(/\.mdx?$/, '')
          .split(path.sep)
          .join('/')
    )
  )
}

/** The prefix a wildcard source governs: /workspaces/:path* -> /workspaces */
function wildcardPrefix(source) {
  const i = source.indexOf('/:')
  return i === -1 ? null : source.slice(0, i)
}

function main() {
  const warnOnly = process.argv.includes('--warn-only')
  const file = path.join(root, 'redirects.json')
  const redirects = JSON.parse(fs.readFileSync(file, 'utf8'))
  const pages = livePages()
  const sources = new Set(redirects.map((r) => r?.source).filter(Boolean))
  const problems = []

  const add = (check, detail) => problems.push({ check, detail })
  const exempt = (s) => INTENTIONALLY_SHADOWED.some((p) => s.startsWith(p))

  const seen = new Set()
  for (const entry of redirects) {
    const { source, destination } = entry ?? {}

    for (const key of Object.keys(entry ?? {})) {
      if (!ALLOWED_KEYS.has(key)) {
        add(
          'schema',
          `"${key}" is not part of Mintlify's redirect schema and is ignored at build time — ${source ?? '(no source)'}`
        )
      }
    }
    if (!source || !destination) {
      add('schema', `entry missing source or destination: ${JSON.stringify(entry)}`)
      continue
    }

    if (seen.has(source)) add('duplicates', `${source} is declared more than once`)
    seen.add(source)

    if (source === destination) add('self', `${source} redirects to itself`)

    const prefix = wildcardPrefix(source)
    if (prefix) {
      const shadowed = [...pages].filter((p) => p.startsWith(prefix + '/'))
      if (shadowed.length) {
        add(
          'shadow',
          `${source} shadows ${shadowed.length} live page(s), e.g. ${shadowed.slice(0, 3).join(', ')}`
        )
      }
    } else if (pages.has(source) && !exempt(source)) {
      add('shadow', `${source} is a live page — the redirect wins and the page is unreachable`)
    }

    const target = destination.split('#')[0]
    if (!/^https?:\/\//.test(destination)) {
      if (sources.has(target) && target !== source) {
        add(
          'chain',
          `${source} -> ${destination} -> ${redirects.find((r) => r.source === target).destination}`
        )
      }
      if (!pages.has(target)) add('dangling', `${source} -> ${destination} (no such page)`)
    }
  }

  const order = ['schema', 'duplicates', 'self', 'shadow', 'chain', 'dangling']
  const labels = {
    schema: 'Unknown or missing keys',
    duplicates: 'Duplicate sources',
    self: 'Self-redirects',
    shadow: 'Sources shadowing a live page',
    chain: 'Chained redirects',
    dangling: 'Destinations that resolve to nothing'
  }

  console.log(`Checked ${redirects.length} redirects against ${pages.size} pages.\n`)

  if (!problems.length) {
    console.log('No problems found.')
    return
  }

  for (const check of order) {
    const hits = problems.filter((p) => p.check === check)
    if (!hits.length) continue
    console.log(`${labels[check]} (${hits.length}):`)
    for (const h of hits) console.log(`  - ${h.detail}`)
    console.log('')
  }

  console.log(`${problems.length} problem(s) found.`)
  if (!warnOnly) process.exitCode = 1
}

main()
