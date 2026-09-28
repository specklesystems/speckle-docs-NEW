/**
 * Read a bundle directory from disk and print what both projections make of it.
 * The same code path the browser takes, minus the network — the quickest way to
 * see what a producer put in a bundle and what this bridge does and does not
 * carry across.
 *
 *   pnpm inspect ./some-downloaded-bundle
 */
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { BundleTable, DownloadedBundle } from './src/bridge/artifacts.js'
import { readBundle } from './src/bridge/bundleReader.js'
import { projectBundle as projectCompat } from './src/bridge/projection-viewer-compatibility.js'
import { projectBundle as projectFull } from './src/bridge/projection-full.js'

const TABLE_SUFFIX: Record<BundleTable, string> = {
  objects: '.eav.objects.parquet',
  paths: '.eav.paths.parquet',
  eav: '.eav.eav.parquet',
  types: '.eav.types.parquet',
  type_eav: '.eav.type_eav.parquet',
  object_type: '.eav.object_type.parquet',
  model: '.eav.model.parquet',
  nodes: '.envelope.nodes.parquet',
  relations: '.envelope.relations.parquet',
  rel_types: '.envelope.rel_types.parquet',
  node_kinds: '.envelope.node_kinds.parquet',
  meta: '.envelope.meta.parquet',
  scene_views: '.envelope.scene_views.parquet'
}

const dir = process.argv[2]
const names = await readdir(dir)
const tables = new Map<BundleTable, ArrayBuffer>()
const geometryShards: ArrayBuffer[] = []

const buffer = async (name: string): Promise<ArrayBuffer> => {
  const b = await readFile(join(dir, name))
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer
}

for (const name of names) {
  if (/\.geometries(\.\d+)?\.parquet$/.test(name)) {
    geometryShards.push(await buffer(name))
    continue
  }
  for (const [table, suffix] of Object.entries(TABLE_SUFFIX)) {
    if (name.endsWith(suffix)) tables.set(table as BundleTable, await buffer(name))
  }
}

const downloaded: DownloadedBundle = { tables, geometryShards }
const bundle = await readBundle(downloaded)
console.log('units', JSON.stringify(bundle.units))
console.log('schemaVersion', bundle.schemaVersion, 'producedBy', bundle.producedBy)
console.log('objects', bundle.objectAppIds.size, [...bundle.objectAppIds.values()])
console.log('nodes', bundle.nodes.size, 'geometries', bundle.geometries.size)
console.log('unknown rels', [...bundle.relations.unknownRels])
console.log('display edges', [...bundle.relations.displayByObject])

for (const [label, project] of [
  ['compat', projectCompat],
  ['full', projectFull]
] as const) {
  const { root, report } = project(bundle)
  console.log(`\n== ${label} ==`)
  console.log('skipped', [...report.skipped])
  console.log(JSON.stringify(root, replacer, 1).slice(0, 4000))
}

function replacer(key: string, value: unknown): unknown {
  if ((key === 'vertices' || key === 'faces' || key === 'value') && Array.isArray(value)) {
    return `[${value.length} numbers]`
  }
  return value
}
