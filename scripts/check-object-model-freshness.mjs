#!/usr/bin/env node
/**
 * Tier B freshness check for next/developers/object-model pages.
 *
 * Some facts on these pages (relations, node kinds) come from a
 * speckle-bundle-spec-generated catalog and can be diffed exactly — see
 * check-bundle-spec-relations.mjs. Others (what replaced the Commit object:
 * Version, Ingestion, the bundle's own `meta` table) have no generated
 * artifact — they're conclusions an agent drew from reading source across
 * speckle-bundle-spec, speckle-sharp-sdk, specklepy, and atlas/glossary.md.
 * Nothing re-checks those conclusions when the source moves.
 *
 * This script is the mechanical half of that: scripts/object-model-freshness-
 * manifest.json pins the sha256 of every source file a conclusion was drawn
 * from. This script re-hashes those files (in sibling checkouts) and reports
 * which ones changed since the manifest entry was last verified — a signal
 * to re-run the research pass (the sync-object-model-docs skill), not proof
 * the docs are wrong. It does NOT understand the content, only whether it
 * moved.
 *
 * Usage:
 *   node scripts/check-object-model-freshness.mjs
 *   node scripts/check-object-model-freshness.mjs --checkout-root /path/to/Speckle
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const MANIFEST = path.join(repoRoot, 'scripts', 'object-model-freshness-manifest.json')

function resolveCheckoutRoot() {
  const flagIdx = process.argv.indexOf('--checkout-root')
  if (flagIdx !== -1 && process.argv[flagIdx + 1]) return process.argv[flagIdx + 1]
  // Standard atlas layout: this repo and its siblings (speckle-bundle-spec,
  // speckle-sharp-sdk, specklepy, atlas, ...) all live one level down from
  // the checkout root.
  return path.resolve(repoRoot, '..')
}

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')
}

function main() {
  if (!fs.existsSync(MANIFEST)) {
    console.error(`Could not find ${MANIFEST}.`)
    process.exitCode = 1
    return
  }
  const checkoutRoot = resolveCheckoutRoot()
  const { entries } = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'))

  let anyDrift = false
  let anyMissing = false

  for (const entry of entries) {
    const changed = []
    const missing = []

    for (const src of entry.sources) {
      const fullPath = path.join(checkoutRoot, src.repo, src.path)
      if (!fs.existsSync(fullPath)) {
        missing.push(src)
        continue
      }
      const current = sha256(fullPath)
      if (current !== src.sha256) {
        changed.push({ ...src, current })
      }
    }

    if (!changed.length && !missing.length) {
      console.log(`OK    ${entry.docsPage} — "${entry.concept}" (verified ${entry.verifiedAt})`)
      continue
    }

    console.log(`STALE ${entry.docsPage} — "${entry.concept}" (last verified ${entry.verifiedAt})`)
    for (const c of changed) {
      anyDrift = true
      console.log(`  changed: ${c.repo}/${c.path}`)
      console.log(`    was ${c.sha256.slice(0, 12)}…, now ${c.current.slice(0, 12)}… — ${c.why}`)
    }
    for (const m of missing) {
      anyMissing = true
      console.log(`  missing: ${m.repo}/${m.path} (checkout not found at ${checkoutRoot}/${m.repo}, or the file moved)`)
    }
    console.log()
  }

  if (!anyDrift && !anyMissing) {
    console.log('\nAll Tier B sources match what the docs were last verified against.')
    return
  }

  console.log(
    'A changed source does not mean the docs are wrong — it means the conclusion needs\n' +
      're-checking. Re-run the research pass (see the sync-object-model-docs skill),\n' +
      'update the docs if the fact changed, and refresh the sha256 + verifiedAt in\n' +
      'scripts/object-model-freshness-manifest.json either way.'
  )
  process.exitCode = 1
}

main()
