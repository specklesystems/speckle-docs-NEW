import type { BundleTable, DownloadedBundle } from './artifacts.js'
import { Rel } from './bundleSpec.js'
import {
  asBytes,
  asInt,
  asNumber,
  asString,
  bytesAsString,
  intAt,
  readParquet,
  readParquetBinary,
  type Row
} from './parquet.js'
import { PropertyTable } from './propertyTable.js'

export interface RelationRow {
  rel: number
  src: number
  dst: number
  ord: number
}

export interface BundleNode {
  kind: number
  name?: string
  defRef?: number
  transform?: string
  units?: string
  subtype?: string
  argb?: number
  opacity?: number
  metalness?: number
  roughness?: number
  emissive?: number
  ior?: number
  elevation?: number
}

export interface BundleGeometry {
  content: Uint8Array
  type?: string
}

/**
 * Relations grouped the way a projection consumes them. Single-valued relations
 * become a map, multi-valued ones a map of lists, and the ids this reader does not
 * know are collected rather than raised — a producer newer than the reader is
 * normal.
 */
export interface Relations {
  displayByObject: Map<number, RelationRow[]>
  objectByGeometry: Map<number, number>
  definesByDefinition: Map<number, number[]>
  definesInstanceByDefinition: Map<number, number[]>
  displayInstanceEdges: RelationRow[]
  materialByGeometry: Map<number, number>
  colorByGeometry: Map<number, number>
  colorByObject: Map<number, number>
  collectionByObject: Map<number, number>
  unknownRels: Set<number>
}

export interface Bundle {
  objectAppIds: Map<number, string>
  properties: PropertyTable
  nodes: Map<number, BundleNode>
  relations: Relations
  units: string
  geometries: Map<number, BundleGeometry>
  /** `meta.schema_version` is provenance. Never gate a load on it. */
  schemaVersion?: string
  producedBy?: string
}

export async function readBundle(downloaded: DownloadedBundle): Promise<Bundle> {
  const table = async (name: BundleTable) => {
    const buffer = downloaded.tables.get(name)
    return buffer ? await readParquet(buffer) : undefined
  }

  const [objects, paths, eav, nodes, relations, meta] = await Promise.all([
    table('objects'),
    table('paths'),
    table('eav'),
    table('nodes'),
    table('relations'),
    table('meta')
  ])

  if (!objects || !paths || !nodes || !relations) {
    throw new Error('bundle is missing a required table (objects, paths, nodes, relations)')
  }

  const properties = PropertyTable.load(eav, paths, 'object_index')
  const metaRow = meta?.[0]

  return {
    objectAppIds: readObjectAppIds(objects),
    properties,
    nodes: readNodes(nodes),
    relations: readRelations(relations),
    units: (properties.firstValueOf('units') as string | undefined) ?? '',
    geometries: await readGeometries(downloaded.geometryShards),
    schemaVersion: metaRow ? asString(metaRow.schema_version) : undefined,
    producedBy: metaRow ? asString(metaRow.produced_by) : undefined
  }
}

function readObjectAppIds(rows: Row[]): Map<number, string> {
  const result = new Map<number, string>()
  for (const row of rows) {
    const key = intAt(row, 'object_index')
    result.set(key, asString(row.application_id) ?? String(key))
  }
  return result
}

function readNodes(rows: Row[]): Map<number, BundleNode> {
  const result = new Map<number, BundleNode>()
  for (const row of rows) {
    result.set(intAt(row, 'id'), {
      kind: intAt(row, 'kind'),
      name: asString(row.name),
      defRef: asInt(row.def_ref),
      transform: asString(row.transform),
      units: asString(row.units),
      subtype: asString(row.subtype),
      argb: asInt(row.argb),
      opacity: asNumber(row.opacity),
      metalness: asNumber(row.metalness),
      roughness: asNumber(row.roughness),
      emissive: asInt(row.emissive),
      ior: asNumber(row.ior),
      elevation: asNumber(row.elevation)
    })
  }
  return result
}

function push(map: Map<number, number[]>, key: number, value: number): void {
  const list = map.get(key)
  if (list) list.push(value)
  else map.set(key, [value])
}

function readRelations(rows: Row[]): Relations {
  const r: Relations = {
    displayByObject: new Map(),
    objectByGeometry: new Map(),
    definesByDefinition: new Map(),
    definesInstanceByDefinition: new Map(),
    displayInstanceEdges: [],
    materialByGeometry: new Map(),
    colorByGeometry: new Map(),
    colorByObject: new Map(),
    collectionByObject: new Map(),
    unknownRels: new Set()
  }

  for (const row of rows) {
    const edge: RelationRow = {
      rel: intAt(row, 'rel'),
      src: intAt(row, 'src'),
      dst: intAt(row, 'dst'),
      ord: intAt(row, 'ord')
    }
    switch (edge.rel) {
      case Rel.DISPLAY: {
        const list = r.displayByObject.get(edge.src)
        if (list) list.push(edge)
        else r.displayByObject.set(edge.src, [edge])
        r.objectByGeometry.set(edge.dst, edge.src)
        break
      }
      case Rel.DEFINES:
        push(r.definesByDefinition, edge.src, edge.dst)
        break
      case Rel.DEFINES_INSTANCE:
        push(r.definesInstanceByDefinition, edge.src, edge.dst)
        break
      case Rel.DISPLAY_INSTANCE:
        r.displayInstanceEdges.push(edge)
        break
      // HAS_MATERIAL and HAS_COLOR start from a geometry or an object, and `ord`
      // says which. Read it before resolving the source key.
      case Rel.HAS_MATERIAL:
        if (edge.ord !== 1) r.materialByGeometry.set(edge.src, edge.dst)
        break
      case Rel.HAS_COLOR:
        if (edge.ord !== 1) r.colorByGeometry.set(edge.src, edge.dst)
        break
      case Rel.IN_COLLECTION:
        r.collectionByObject.set(edge.src, edge.dst)
        break
      // Carried by the bundle, and read by a consumer that does more than render.
      // Listed so they are not reported as vocabulary this reader does not know.
      case Rel.SOLID:
      case Rel.CENTERLINE:
      case Rel.DEFINES_MEMBER:
      case Rel.PLACES:
      case Rel.OBJECT_HAS_MATERIAL:
      case Rel.OBJECT_HAS_COLOR:
      case Rel.NODE_HAS_MATERIAL:
      case Rel.NODE_HAS_COLOR:
      case Rel.IN_MODEL:
      case Rel.ON_LEVEL:
      case Rel.IN_ROOM:
      case Rel.IN_GROUP:
      case Rel.IN_SYSTEM:
      case Rel.IN_ASSEMBLY:
      case Rel.SUBELEMENT:
      case Rel.CONNECTS_TO:
      case Rel.HOSTED_ON:
      case Rel.BOUNDS:
        break
      default:
        r.unknownRels.add(edge.rel)
    }
  }

  for (const list of r.displayByObject.values()) list.sort((a, b) => a.ord - b.ord)
  return r
}

async function readGeometries(shards: ArrayBuffer[]): Promise<Map<number, BundleGeometry>> {
  const result = new Map<number, BundleGeometry>()
  for (const shard of shards) {
    for (const row of await readParquetBinary(shard)) {
      const content = asBytes(row.content)
      if (!content) continue
      result.set(intAt(row, 'geometryIndex'), {
        content,
        type: bytesAsString(row.type)
      })
    }
  }
  return result
}

/** 16 row-major doubles, comma-separated, as the nodes table stores them. */
export function parseTransform(transform: string | undefined): number[] | undefined {
  if (!transform) return undefined
  const values = transform.split(',').map((part) => Number(part.trim()))
  if (values.length !== 16 || values.some((v) => Number.isNaN(v))) return undefined
  return values
}
