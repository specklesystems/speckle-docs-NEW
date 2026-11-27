#!/usr/bin/env node
/**
 * mint follows redirects. Its fetch sends Accept-Language: *, and some vendors
 * build the next Location from that header. Vectorworks answers /support with
 * /*-GB/support, which redirects to itself until the client gives up, so mint
 * reports "fetch failed" for a URL browsers open.
 *
 * A file marks that URL with a link-check-allow comment. A hit is dropped
 * only when mint reports a transport failure (no HTTP status), the file
 * allows that exact URL, and a retry with Accept-Language en-US returns 2xx.
 * An HTTP status such as 404 still fails.
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const ALLOW = /\{\/\*\s*link-check-allow:\s*(https?:\/\/\S+?)\s*\*\/\}/g
const HIT = /^\s*(?:[^\s:]+\s+)?(https?:\/\/\S+?)\s+\(([^)]+)\)\s*$/
const FILE = /^(\S+\.mdx?)\s*$/

export function allowsIn(text) {
  return new Set([...text.matchAll(ALLOW)].map((match) => match[1]))
}

export function parseMintReport(output) {
  const hits = []
  const unparsed = []
  let file = null

  for (const line of output.split(/\r?\n/)) {
    const fileMatch = line.match(FILE)
    if (fileMatch && !line.includes('://')) {
      file = fileMatch[1]
      continue
    }

    const hitMatch = line.match(HIT)
    if (hitMatch && file) {
      hits.push({ file, url: hitMatch[1], reason: hitMatch[2] })
      continue
    }

    if (/https?:\/\//.test(line) && /\([^)]+\)/.test(line)) unparsed.push(line)
  }

  return { hits, unparsed }
}

export function isTransportFailure(reason) {
  return !/^\d{3}$/.test(reason)
}

export function settleHits(hits, allowByFile, probeOkByUrl) {
  const dropped = []
  const kept = []

  for (const hit of hits) {
    const allowed = allowByFile.get(hit.file)?.has(hit.url) === true
    const proved = probeOkByUrl.get(hit.url) === true
    if (isTransportFailure(hit.reason) && allowed && proved) dropped.push(hit)
    else kept.push(hit)
  }

  return { dropped, kept }
}

export function exitCode({ mintStatus, hits, unparsed, kept }) {
  if (unparsed.length > 0 || kept.length > 0) return 1
  if (hits.length === 0 && mintStatus !== 0) return mintStatus || 1
  return 0
}

async function probe(url) {
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(20_000),
      headers: {
        'accept-language': 'en-US,en;q=0.9',
        'user-agent': 'speckle-docs-link-check'
      }
    })
    return response.ok
  } catch {
    return false
  }
}

async function main() {
  // Same reason as scripts/validate.sh: a local worktree can contain agent
  // files mint tries to parse as pages. CI checks out the repo only.
  const worktrees = path.join(root, '.worktrees')
  const hidden = path.join(path.dirname(root), `.speckle-docs-worktrees-${process.pid}`)
  let moved = false
  if (fs.existsSync(worktrees)) {
    fs.renameSync(worktrees, hidden)
    moved = true
  }

  let mint
  try {
    mint = spawnSync(
      'pnpm',
      [
        'exec',
        'mint',
        'broken-links',
        '--check-anchors',
        '--check-redirects',
        '--check-snippets',
        '--check-external'
      ],
      { cwd: root, encoding: 'utf8' }
    )
  } finally {
    if (moved && fs.existsSync(hidden)) fs.renameSync(hidden, worktrees)
  }

  if (mint.stdout) process.stdout.write(mint.stdout)
  if (mint.stderr) process.stderr.write(mint.stderr)
  if (mint.error) {
    console.error(mint.error.message)
    process.exit(1)
  }

  const mintStatus = mint.status ?? 1
  const { hits, unparsed } = parseMintReport(mint.stdout ?? '')
  const allowByFile = new Map()

  for (const hit of hits) {
    if (allowByFile.has(hit.file)) continue
    const full = path.join(root, hit.file)
    allowByFile.set(
      hit.file,
      fs.existsSync(full) ? allowsIn(fs.readFileSync(full, 'utf8')) : new Set()
    )
  }

  const probeOkByUrl = new Map()
  for (const hit of hits) {
    if (!isTransportFailure(hit.reason)) continue
    if (allowByFile.get(hit.file)?.has(hit.url) !== true) continue
    if (probeOkByUrl.has(hit.url)) continue
    probeOkByUrl.set(hit.url, await probe(hit.url))
  }

  const { dropped, kept } = settleHits(hits, allowByFile, probeOkByUrl)

  if (dropped.length > 0) {
    console.log(`\nRetried ${dropped.length} allowed link(s) with Accept-Language en-US:`)
    for (const hit of dropped) console.log(`  ${hit.file}  ${hit.url}`)
  }

  const code = exitCode({ mintStatus, hits, unparsed, kept })
  if (code !== 0) {
    if (kept.length > 0) {
      console.error(`\n${kept.length} external link(s) still broken:`)
      for (const hit of kept) console.error(`  ${hit.file}  ${hit.url} (${hit.reason})`)
    }
    if (unparsed.length > 0) {
      console.error(`\n${unparsed.length} mint line(s) looked like hits and did not parse.`)
    }
  }

  process.exit(code)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main()
}
