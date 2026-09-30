#!/usr/bin/env node
/**
 * Bundle-spec relation drift check.
 *
 * Compares the relation names in table rows on
 * next/developers/object-model/relations.mdx against the live relation
 * catalog in speckle-bundle-spec's generated/docs-data.json. Names only:
 * the page's section placement and reader-facing prose have no mechanical
 * source and are drafted via the sync-object-model-docs skill.
 *
 * docs-data.json is regenerated first (`npm run generate` in the sibling
 * checkout, needs the `duckdb` CLI) so a stale artifact can never produce a
 * false "nothing to do".
 *
 * Usage:
 *   node scripts/check-bundle-spec-relations.mjs
 *   node scripts/check-bundle-spec-relations.mjs --no-generate
 *   node scripts/check-bundle-spec-relations.mjs --checkout-root /path/to/speckle-atlas
 *   node scripts/check-bundle-spec-relations.mjs --warn-only
 *
 * The checkout root defaults to $ATLAS_ROOT, then the parent of this repo
 * (the nested speckle-atlas layout).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const RELATIONS_MDX = path.join(root, 'next', 'developers', 'object-model', 'relations.mdx')

function argValue(flag) {
  const index = process.argv.indexOf(flag)
  if (index === -1 || index === process.argv.length - 1) return ''
  return process.argv[index + 1]
}

function checkoutRoot() {
  return argValue('--checkout-root') || process.env.ATLAS_ROOT || path.resolve(root, '..')
}

function regenerate(bundleSpecRoot) {
  try {
    execFileSync('npm', ['run', 'generate'], { cwd: bundleSpecRoot, stdio: 'inherit' })
    return true
  } catch {
    console.error(
      `\n\`npm run generate\` failed in ${bundleSpecRoot} (see output above).\n` +
        `Common cause: the \`duckdb\` CLI isn't on PATH (brew install duckdb).\n` +
        `Re-run with --no-generate to check the last-generated docs-data.json instead.`
    )
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
  const warnOnly = process.argv.includes('--warn-only')
  const bundleSpecRoot = path.join(checkoutRoot(), 'speckle-bundle-spec')
  const dataPath = path.join(bundleSpecRoot, 'generated', 'docs-data.json')

  if (!fs.existsSync(bundleSpecRoot)) {
    console.error(
      `No speckle-bundle-spec checkout at ${bundleSpecRoot}.\n` +
        `Pass --checkout-root <path> or set ATLAS_ROOT.`
    )
    process.exitCode = 1
    return
  }

  if (!process.argv.includes('--no-generate') && !regenerate(bundleSpecRoot)) {
    process.exitCode = 1
    return
  }

  if (!fs.existsSync(dataPath)) {
    console.error(
      `Could not find ${dataPath}.\n` +
        `The speckle-bundle-spec checkout must emit generated/docs-data.json from \`npm run generate\`.`
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
    console.log('Live in the spec but not named on the page (new relations to document):')
    for (const n of undocumented) {
      const r = data.relations.find((r) => r.name === n)
      console.log(`  - ${n}  (${r.src} → ${r.dst})  ${r.description ?? ''}`)
    }
    console.log()
  }

  if (stale.length) {
    console.log('Named on the page but not in the live catalog (retired, renamed, or a typo):')
    for (const n of stale) console.log(`  - ${n}`)
    console.log()
  }

  console.log('Name-only check. Draft rows and FAQ entries with the sync-object-model-docs skill.')
  if (!warnOnly) process.exitCode = 1
}

main()
