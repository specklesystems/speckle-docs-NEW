#!/usr/bin/env node
/**
 * Freshness check for object-model facts read from sibling-repo source.
 *
 * Facts on these pages with no generated catalog to diff against are
 * conclusions drawn from reading source in sibling repos. This script
 * re-hashes every source file pinned in
 * scripts/object-model-freshness-manifest.json and reports the ones that
 * changed since the entry was last verified. A changed source is a prompt
 * to re-run the research pass (sync-object-model-docs skill), not proof the
 * docs are wrong.
 *
 * Files are read with `git show <ref>:<path>` (ref per source, default
 * origin/main), so the result does not depend on which branch each sibling
 * checkout happens to have checked out.
 *
 * Usage:
 *   node scripts/check-object-model-freshness.mjs
 *   node scripts/check-object-model-freshness.mjs --checkout-root /path/to/speckle-atlas
 *   node scripts/check-object-model-freshness.mjs --warn-only
 *
 * The checkout root defaults to $ATLAS_ROOT, then the parent of this repo
 * (the nested speckle-atlas layout).
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const MANIFEST = path.join(root, 'scripts', 'object-model-freshness-manifest.json')
const DEFAULT_REF = 'origin/main'

function argValue(flag) {
  const index = process.argv.indexOf(flag)
  if (index === -1 || index === process.argv.length - 1) return ''
  return process.argv[index + 1]
}

function checkoutRoot() {
  return argValue('--checkout-root') || process.env.ATLAS_ROOT || path.resolve(root, '..')
}

/** sha256 of `<ref>:<path>` in the repo, or null when the repo or blob is unreachable. */
function sha256AtRef(repoDir, ref, filePath) {
  if (!fs.existsSync(path.join(repoDir, '.git'))) return null
  try {
    const blob = execFileSync('git', ['-C', repoDir, 'show', `${ref}:${filePath}`], {
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: 64 * 1024 * 1024
    })
    return crypto.createHash('sha256').update(blob).digest('hex')
  } catch {
    return null
  }
}

function main() {
  const warnOnly = process.argv.includes('--warn-only')
  const checkout = checkoutRoot()
  const { entries } = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'))

  let anyDrift = false
  let anyMissing = false

  for (const entry of entries) {
    const changed = []
    const missing = []

    for (const src of entry.sources) {
      const ref = src.ref || DEFAULT_REF
      const current = sha256AtRef(path.join(checkout, src.repo), ref, src.path)
      if (current === null) missing.push({ ...src, ref })
      else if (current !== src.sha256) changed.push({ ...src, ref, current })
    }

    if (!changed.length && !missing.length) {
      console.log(`OK    ${entry.docsPage} — "${entry.concept}" (verified ${entry.verifiedAt})`)
      continue
    }

    console.log(`STALE ${entry.docsPage} — "${entry.concept}" (last verified ${entry.verifiedAt})`)
    for (const c of changed) {
      anyDrift = true
      console.log(`  changed: ${c.repo}/${c.path} @ ${c.ref}`)
      console.log(`    was ${c.sha256.slice(0, 12)}…, now ${c.current.slice(0, 12)}… — ${c.why}`)
    }
    for (const m of missing) {
      anyMissing = true
      console.log(
        `  missing: ${m.repo}/${m.path} @ ${m.ref} (no checkout at ${path.join(checkout, m.repo)}, ref not fetched, or the file moved)`
      )
    }
    console.log()
  }

  if (!anyDrift && !anyMissing) {
    console.log('\nAll pinned sources match what the docs were last verified against.')
    return
  }

  console.log(
    'A changed source means the conclusion needs re-checking, not that the docs are wrong.\n' +
      'Re-run the research pass (sync-object-model-docs skill), update the docs if the fact\n' +
      'changed, and refresh sha256 + verifiedAt in scripts/object-model-freshness-manifest.json.'
  )
  if (!warnOnly) process.exitCode = 1
}

main()
