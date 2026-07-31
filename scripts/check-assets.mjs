#!/usr/bin/env node
/**
 * Local asset check.
 *
 * Verifies that every repo-relative asset referenced from a page actually
 * exists on disk — images, video, and downloadable files.
 *
 * `mint broken-links` checks page links but does not catch a missing local
 * image: a stale reference can sit in the repo for months and still render in
 * production, because the deployed site falls back to a CDN copy uploaded by
 * an earlier build. That hides extension mismatches (.png vs .jpg) and files
 * deleted from the repo but still live on the CDN.
 *
 * Only repo-relative paths (starting with /) are checked. External URLs are
 * the scheduled external-link job's problem.
 *
 * Usage:
 *   node scripts/check-assets.mjs
 *   node scripts/check-assets.mjs --warn-only
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const SKIP_DIRS = ['node_modules', '.git', '.mintlify']

/** Extensions treated as assets rather than page routes. */
const ASSET_EXT = /\.(png|jpe?g|gif|svg|webp|avif|mp4|webm|mov|pdf|zip|ipynb|csv)$/i

/** src="/x" or href="/x", plus markdown ![alt](/x). */
const PATTERNS = [/(?:src|href)=["'](\/[^"'?#]+)["']/g, /!\[[^\]]*\]\((\/[^)\s?#]+)/g]

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || SKIP_DIRS.includes(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (entry.name.endsWith('.mdx') || entry.name.endsWith('.md')) out.push(full)
  }
  return out
}

/** Same basename with a different extension — the usual cause of a miss. */
function suggest(ref) {
  const dir = path.join(root, path.dirname(ref))
  if (!fs.existsSync(dir)) return null
  const stem = path.basename(ref, path.extname(ref))
  const hit = fs.readdirSync(dir).find((f) => path.basename(f, path.extname(f)) === stem)
  return hit ? path.join(path.dirname(ref), hit) : null
}

function main() {
  const warnOnly = process.argv.includes('--warn-only')
  const missing = new Map()
  let checked = 0

  for (const file of walk(root)) {
    const text = fs.readFileSync(file, 'utf8')
    const rel = path.relative(root, file)

    for (const pattern of PATTERNS) {
      for (const [, ref] of text.matchAll(pattern)) {
        if (!ASSET_EXT.test(ref)) continue
        checked++
        if (fs.existsSync(path.join(root, ref.slice(1)))) continue
        if (!missing.has(ref)) missing.set(ref, new Set())
        missing.get(ref).add(rel)
      }
    }
  }

  console.log(`Checked ${checked} local asset references.\n`)

  if (!missing.size) {
    console.log('All local assets resolve.')
    return
  }

  console.log(`${missing.size} missing asset(s):\n`)
  for (const [ref, files] of [...missing].sort()) {
    console.log(`  ${ref}`)
    for (const f of [...files].sort()) console.log(`    referenced by ${f}`)
    const alt = suggest(ref)
    if (alt) console.log(`    -> did you mean ${alt}?`)
    console.log('')
  }

  if (!warnOnly) process.exitCode = 1
}

main()
