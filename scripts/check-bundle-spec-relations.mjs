#!/usr/bin/env node
/**
 * Bundle-spec relation drift check.
 *
 * Compares the relation names in table rows on
 * next/developers/object-model/relations.mdx against the live relation
 * catalog in speckle-bundle-spec. Names only: the page's section placement
 * and reader-facing prose have no mechanical source and are drafted via the
 * sync-object-model-docs skill.
 *
 * The catalog is the spec's own rel_types and node_kinds tables. The spec is
 * read with `git show <ref>:spec/bundle-spec.sql` (default origin/main, so the
 * result does not depend on the sibling's checked-out branch) and run in an
 * in-memory DuckDB: needs the `duckdb` CLI on PATH, or DUCKDB_BIN. Nothing is
 * written outside this repo.
 *
 * Usage:
 *   node scripts/check-bundle-spec-relations.mjs
 *   node scripts/check-bundle-spec-relations.mjs --ref 1.4.1
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
const SPEC_PATH = 'spec/bundle-spec.sql'
const DEFAULT_REF = 'origin/main'
const DUCKDB = process.env.DUCKDB_BIN || 'duckdb'
const STATUSES = new Set(['live', 'reserved', 'retired'])

function argValue(flag) {
  const index = process.argv.indexOf(flag)
  if (index === -1 || index === process.argv.length - 1) return ''
  return process.argv[index + 1]
}

function checkoutRoot() {
  return argValue('--checkout-root') || process.env.ATLAS_ROOT || path.resolve(root, '..')
}

function git(repoDir, args) {
  return execFileSync('git', ['-C', repoDir, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
    maxBuffer: 64 * 1024 * 1024
  })
}

/** Blob id of the spec at `rev`, or null when the rev does not exist. */
function specBlob(repoDir, rev) {
  try {
    return git(repoDir, ['rev-parse', '--verify', '-q', `${rev}:${SPEC_PATH}`]).trim()
  } catch {
    return null
  }
}

/** Whether the spec at `ref` is the one tagged as release `version`. */
function releaseState(repoDir, ref, version) {
  const tagged = specBlob(repoDir, `refs/tags/${version}`)
  if (!tagged) return `${version} is not tagged: unreleased`
  if (tagged !== specBlob(repoDir, ref)) return `differs from the ${version} tag: unreleased`
  return `released as ${version}`
}

/** Rows of `select`, run after the spec in an in-memory DuckDB. */
function query(spec, select) {
  const out = execFileSync(DUCKDB, ['-json'], {
    input: `${spec}\n${select};\n`,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    maxBuffer: 1 << 28
  }).trim()
  // DuckDB >= 1.5 prints `[{]` for an empty result set (same guard as bundle-spec's codegen).
  return !out || out === '[{]' ? [] : JSON.parse(out)
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
  const ref = argValue('--ref') || DEFAULT_REF
  const bundleSpecRoot = path.join(checkoutRoot(), 'speckle-bundle-spec')

  if (!fs.existsSync(path.join(bundleSpecRoot, '.git'))) {
    console.error(
      `No speckle-bundle-spec checkout at ${bundleSpecRoot}.\n` +
        `Pass --checkout-root <path> or set ATLAS_ROOT.`
    )
    process.exitCode = 1
    return
  }

  let spec, commit
  try {
    spec = git(bundleSpecRoot, ['show', `${ref}:${SPEC_PATH}`])
    commit = git(bundleSpecRoot, ['log', '-1', '--format=%h, %cs', ref]).trim()
  } catch {
    console.error(
      `Could not read ${SPEC_PATH} at ${ref} in ${bundleSpecRoot}.\n` +
        `Fetch the checkout (git -C ${bundleSpecRoot} fetch) or pass --ref <tag|branch>.`
    )
    process.exitCode = 1
    return
  }

  let schemaVersion, relTypes, nodeKinds
  try {
    schemaVersion = query(spec, 'SELECT schema_version FROM meta')[0]?.schema_version
    relTypes = query(
      spec,
      'SELECT rel AS id, name, status, src_ns, dst_ns, description FROM rel_types ORDER BY rel'
    )
    nodeKinds = query(spec, 'SELECT kind AS id, name, status FROM node_kinds ORDER BY kind')
  } catch (err) {
    console.error(
      err.code === 'ENOENT'
        ? `\`${DUCKDB}\` not found. Install the duckdb CLI (brew install duckdb) or set DUCKDB_BIN.`
        : `DuckDB could not run ${SPEC_PATH} at ${ref}:\n${err.stderr || err.message}`
    )
    process.exitCode = 1
    return
  }

  const unknown = [...relTypes, ...nodeKinds].filter((r) => !STATUSES.has(r.status))
  if (!schemaVersion || !relTypes.length || !nodeKinds.length || unknown.length) {
    console.error(
      `${SPEC_PATH} at ${ref} has no meta row, an empty catalog, or a status outside ` +
        `${[...STATUSES].join(' | ')}${unknown.length ? ` (${unknown.map((r) => `${r.name}=${r.status}`).join(', ')})` : ''}.\n` +
        `The spec's catalog shape changed: update this check before trusting it.`
    )
    process.exitCode = 1
    return
  }

  if (!fs.existsSync(RELATIONS_MDX)) {
    console.error(`Could not find ${RELATIONS_MDX}.`)
    process.exitCode = 1
    return
  }

  const mdx = fs.readFileSync(RELATIONS_MDX, 'utf8')
  const live = relTypes.filter((r) => r.status === 'live')
  const liveNames = new Set(live.map((r) => r.name))
  const documented = documentedRelationNames(mdx)

  const undocumented = live.filter((r) => !documented.has(r.name))
  const stale = [...documented].filter((n) => !liveNames.has(n)).sort()

  console.log(
    `speckle-bundle-spec ${schemaVersion} at ${ref} (${commit}; ` +
      `${releaseState(bundleSpecRoot, ref, schemaVersion)}): ` +
      `${live.length} live relations, ${documented.size} named on the page.\n` +
      `Live node kinds: ${nodeKinds
        .filter((k) => k.status === 'live')
        .map((k) => k.name)
        .join(', ')}.\n`
  )

  if (!undocumented.length && !stale.length) {
    console.log('relations.mdx names match the live relation catalog. Nothing to do.')
    return
  }

  if (undocumented.length) {
    console.log('Live in the spec but not named on the page (new relations to document):')
    for (const r of undocumented) {
      console.log(`  - ${r.name}  (${r.src_ns} → ${r.dst_ns})  ${r.description ?? ''}`)
    }
    console.log()
  }

  if (stale.length) {
    console.log('Named on the page but not live in the spec:')
    for (const n of stale) {
      const r = relTypes.find((r) => r.name === n)
      console.log(
        `  - ${n}  (${r ? `${r.status} in the spec` : 'not in the catalog: renamed or a typo'})`
      )
    }
    console.log()
  }

  console.log('Name-only check. Draft rows and FAQ entries with the sync-object-model-docs skill.')
  if (!warnOnly) process.exitCode = 1
}

main()
