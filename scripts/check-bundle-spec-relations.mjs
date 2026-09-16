#!/usr/bin/env node
/**
 * Bundle-spec relation drift check.
 *
 * next/developers/object-model/relations.mdx hand-documents the LIVE relation
 * catalog from speckle-bundle-spec's spec/bundle-spec.sql — categorized into
 * sections, with editorial "Replaces in the Current model" / "When you use it"
 * prose that has no mechanical source. This script does NOT regenerate that
 * prose (see the sync-bundle-spec-docs skill for the authoring workflow it
 * feeds). It only answers the mechanical question a human always forgets to
 * ask by hand: does the set of relation NAMES on the page still match the set
 * of live relations in the spec?
 *
 * Source of truth: speckle-bundle-spec/generated/docs-data.json, a sibling
 * checkout's generated artifact. By default this script regenerates it first
 * (`npm run generate` over there) so a stale JSON can never produce a false
 * "nothing to do" — `generate` is idempotent (it's what that repo's own
 * `check` script diffs against), so running it here is safe, not invasive.
 * Pass --no-generate to skip that and check whatever's already on disk (e.g.
 * no local `duckdb` CLI, or deliberately checking against a colleague's
 * already-generated output).
 *
 * Usage:
 *   node scripts/check-bundle-spec-relations.mjs
 *   node scripts/check-bundle-spec-relations.mjs --no-generate
 *   node scripts/check-bundle-spec-relations.mjs --bundle-spec /path/to/speckle-bundle-spec
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const RELATIONS_MDX = path.join(root, 'next', 'developers', 'object-model', 'relations.mdx')

function resolveBundleSpecRoot() {
  const flagIdx = process.argv.indexOf('--bundle-spec')
  return flagIdx !== -1 && process.argv[flagIdx + 1]
    ? process.argv[flagIdx + 1]
    : path.resolve(root, '..', 'speckle-bundle-spec')
}

/** Runs `npm run generate` in the sibling repo so docs-data.json can't be stale. */
function regenerate(bundleSpecRoot) {
  if (!fs.existsSync(bundleSpecRoot)) {
    console.error(
      `No speckle-bundle-spec checkout at ${bundleSpecRoot}.\n` +
        `Pass --bundle-spec <path>, or --no-generate to check an existing docs-data.json.`
    )
    process.exitCode = 1
    return false
  }
  try {
    execFileSync('npm', ['run', 'generate'], { cwd: bundleSpecRoot, stdio: 'inherit' })
    return true
  } catch {
    console.error(
      `\n\`npm run generate\` failed in ${bundleSpecRoot} (see output above).\n` +
        `Common cause: the \`duckdb\` CLI isn't on PATH (brew install duckdb).\n` +
        `Re-run with --no-generate to check the last-generated docs-data.json instead.`
    )
    process.exitCode = 1
    return false
  }
}

/** Relation names documented in a table row, e.g. `| `ON_LEVEL` | object → node | ... |`. */
function documentedRelationNames(mdx) {
  const names = new Set()
  const re = /^\|\s*`([A-Z][A-Z0-9_]*)`\s*\|/gm
  let m
  while ((m = re.exec(mdx))) names.add(m[1])
  return names
}

function main() {
  const bundleSpecRoot = resolveBundleSpecRoot()
  const dataPath = path.join(bundleSpecRoot, 'generated', 'docs-data.json')

  if (!process.argv.includes('--no-generate')) {
    if (!regenerate(bundleSpecRoot)) return
  } else if (!fs.existsSync(dataPath)) {
    console.error(
      `Could not find ${dataPath}.\n` +
        `Run \`npm run generate\` in speckle-bundle-spec first, or drop --no-generate.`
    )
    process.exitCode = 1
    return
  }

  if (!fs.existsSync(RELATIONS_MDX)) {
    console.error(`Could not find ${RELATIONS_MDX}.`)
    process.exitCode = 1
    return
  }

  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'))
  const mdx = fs.readFileSync(RELATIONS_MDX, 'utf8')

  const live = new Set(data.relations.map((r) => r.name))
  const documented = documentedRelationNames(mdx)

  const undocumented = [...live].filter((n) => !documented.has(n)).sort()
  const stale = [...documented].filter((n) => !live.has(n)).sort()

  console.log(
    `speckle-bundle-spec schemaVersion ${data.schemaVersion}: ` +
      `${live.size} live relations, ${documented.size} named on the page.\n`
  )

  if (!undocumented.length && !stale.length) {
    console.log('relations.mdx names match the live relation catalog. Nothing to do.')
    return
  }

  if (undocumented.length) {
    console.log('Live in the spec but not named anywhere on the page (new relations to document):')
    for (const n of undocumented) {
      const r = data.relations.find((r) => r.name === n)
      console.log(`  - ${n}  (${r.src} → ${r.dst})  ${r.description ?? ''}`)
    }
    console.log()
  }

  if (stale.length) {
    console.log(
      'Named on the page but not in the live catalog (retired, renamed, or a typo — do not just delete the row: check whether readers need a "why did this disappear" FAQ entry, per the existing IN_NETWORK/IN_SPACE pattern):'
    )
    for (const n of stale) console.log(`  - ${n}`)
    console.log()
  }

  console.log(
    'This is a name-only check. Drafting the actual table row or FAQ prose is editorial —'
  )
  console.log('use the sync-bundle-spec-docs skill rather than pasting spec text onto the page.')

  process.exitCode = 1
}

main()
