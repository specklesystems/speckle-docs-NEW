import { parquetReadObjects } from 'hyparquet'
import { compressors } from 'hyparquet-compressors'
import type { BundleTable, DownloadedBundle } from './artifacts.js'
import { Rel } from './bundleSpec.js'

// ── parquet ─────────────────────────────────────────────────────────────────

export type Row = Record<string, unknown>

/**
 * Bundle parquet is zstd-compressed, which hyparquet does not decode on its own —
 * hence the `compressors` argument on every read.
 */
async function readParquet(file: ArrayBuffer): Promise<Row[]> {
  return (await parquetReadObjects({ file, compressors })) as Row[]
}

/**
 * The geometry table's `content` column is a BYTE_ARRAY with no string logical
 * type, and hyparquet decodes every BYTE_ARRAY as UTF-8 by default — which
 * silently mangles SGEO blobs. Read that table with `utf8: false` and decode the
 * genuinely textual columns yourself.
 */
async function readParquetBinary(file: ArrayBuffer): Promise<Row[]> {
  return (await parquetReadObjects({ file, compressors, utf8: false })) as Row[]
}

const decoder = new TextDecoder()

function asInt(value: unknown): number | undefined {
  if (typeof value === 'number') return value
  if (typeof value === 'bigint') return Number(value)
  return undefined
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function asBytes(value: unknown): Uint8Array | undefined {
  if (value instanceof Uint8Array) return value
  if (value instanceof ArrayBuffer) return new Uint8Array(value)
  return undefined
}

function bytesAsString(value: unknown): string | undefined {
  if (typeof value === 'string') return value
  const bytes = asBytes(value)
  return bytes ? decoder.decode(bytes) : undefined
}

/** Dense integer keys are never null in a valid bundle; 0 keeps the reader total. */
function intAt(row: Row, column: string): number {
  return asInt(row[column]) ?? 0
}

// ── properties ──────────────────────────────────────────────────────────────

export type PropValue = string | number | boolean

/**
 * The eav tables as a lookup. Each row sets exactly one of the string, number and
 * boolean columns, so reading a value means coalescing the three. Paths are
 * interned in their own table and are dotted, not nested.
 */
export class PropertyTable {
  private readonly byKey = new Map<number, Map<string, PropValue>>()

  static load(eavRows: Row[] | undefined, pathRows: Row[], keyColumn: string): PropertyTable {
    const table = new PropertyTable()
    if (!eavRows?.length) return table

    const pathById = new Map<number, string>()
    for (const row of pathRows) {
      const path = asString(row.path)
      if (path) pathById.set(intAt(row, 'path_index'), path)
    }

    for (const row of eavRows) {
      const path = pathById.get(intAt(row, 'path_index'))
      if (!path) continue
      const value = coalesce(row)
      if (value === undefined) continue
      const key = intAt(row, keyColumn)
      let values = table.byKey.get(key)
      if (!values) {
        values = new Map<string, PropValue>()
        table.byKey.set(key, values)
      }
      values.set(path, value)
    }
    return table
  }

  get(key: number, path: string): PropValue | undefined {
    return this.byKey.get(key)?.get(path)
  }

  getString(key: number, path: string): string | undefined {
    const value = this.get(key, path)
    return typeof value === 'string' ? value : undefined
  }

  /**
   * The rows under a dotted prefix, rebuilt into nested objects with the prefix
   * stripped. `properties.Constraints.Base Offset` under prefix `properties`
   * becomes `{ Constraints: { 'Base Offset': … } }`.
   */
  nested(key: number, prefix?: string): Record<string, unknown> {
    const root: Record<string, unknown> = {}
    const values = this.byKey.get(key)
    if (!values) return root
    const head = prefix ? `${prefix}.` : ''

    for (const [path, value] of values) {
      if (head && !path.startsWith(head)) continue
      const parts = path.slice(head.length).split('.')
      let cursor = root
      for (const part of parts.slice(0, -1)) {
        const child = cursor[part]
        if (child && typeof child === 'object' && !Array.isArray(child)) {
          cursor = child as Record<string, unknown>
        } else {
          const created: Record<string, unknown> = {}
          cursor[part] = created
          cursor = created
        }
      }
      cursor[parts[parts.length - 1]] = value
    }
    return root
  }

  /** The first value any key carries at `path` — used to find the model's units. */
  firstValueOf(path: string): PropValue | undefined {
    for (const values of this.byKey.values()) {
      const value = values.get(path)
      if (value !== undefined) return value
    }
    return undefined
  }
}

function coalesce(row: Row): PropValue | undefined {
  if (typeof row.value_boolean === 'boolean') return row.value_boolean
  if (typeof row.value_double === 'number') return row.value_double
  return asString(row.value_string)
}

/** Type-level rows are the base; instance rows overlay them. */
export function mergeProperties(
  typeLevel: Record<string, unknown>,
  instance: Record<string, unknown>
): Record<string, unknown> {
  const merged = { ...typeLevel }
  overlay(merged, instance)
  return merged
}

function overlay(target: Record<string, unknown>, source: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(source)) {
    const existing = target[key]
    if (isPlainObject(value) && isPlainObject(existing)) {
      const clone = { ...existing }
      overlay(clone, value)
      target[key] = clone
    } else {
      target[key] = value
    }
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// ── the bundle ──────────────────────────────────────────────────────────────

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
  argb?: number
  opacity?: number
  metalness?: number
  roughness?: number
  emissive?: number
  ior?: number
}

export interface BundleGeometry {
  content: Uint8Array
  type?: string
}

/**
 * Relations grouped the way the projection consumes them. The ids this reader does
 * not know are collected rather than raised — a producer newer than the reader is
 * normal.
 */
export interface Relations {
  displayByObject: Map<number, RelationRow[]>
  objectByGeometry: Map<number, number>
  definesByDefinition: Map<number, number[]>
  definesInstanceByDefinition: Map<number, number[]>
  displayInstanceEdges: RelationRow[]
  materialByGeometry: Map<number, number>
  materialByObject: Map<number, number>
  materialByNode: Map<number, number>
  colorByGeometry: Map<number, number>
  colorByObject: Map<number, number>
  colorByNode: Map<number, number>
  collectionByObject: Map<number, number>
  unknownRels: Set<number>
}

export interface Bundle {
  objectAppIds: Map<number, string>
  /** The inverse, for going from a viewer selection back to the bundle's tables. */
  objectKeyByAppId: Map<string, number>
  properties: PropertyTable
  typeProperties: PropertyTable
  typeIndexByObject: Map<number, number>
  nodes: Map<number, BundleNode>
  relations: Relations
  units: string
  modelProperties: Map<string, PropValue>
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

  const [objects, paths, eav, typeEav, objectType, model, nodes, relations, meta] =
    await Promise.all([
      table('objects'),
      table('paths'),
      table('eav'),
      table('type_eav'),
      table('object_type'),
      table('model'),
      table('nodes'),
      table('relations'),
      table('meta')
    ])

  if (!objects || !paths || !nodes || !relations) {
    throw new Error('bundle is missing a required table (objects, paths, nodes, relations)')
  }

  const properties = PropertyTable.load(eav, paths, 'object_index')
  const objectAppIds = readObjectAppIds(objects)
  const metaRow = meta?.[0]

  return {
    objectAppIds,
    objectKeyByAppId: new Map([...objectAppIds].map(([key, appId]) => [appId, key])),
    properties,
    typeProperties: PropertyTable.load(typeEav, paths, 'type_index'),
    typeIndexByObject: readTypeIndex(objectType),
    nodes: readNodes(nodes),
    relations: readRelations(relations),
    units: (properties.firstValueOf('units') as string | undefined) ?? '',
    modelProperties: readModelProperties(model),
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

function readTypeIndex(rows: Row[] | undefined): Map<number, number> {
  const result = new Map<number, number>()
  for (const row of rows ?? []) {
    result.set(intAt(row, 'object_index'), intAt(row, 'type_index'))
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
      argb: asInt(row.argb),
      opacity: asInt(row.opacity),
      metalness: asInt(row.metalness),
      roughness: asInt(row.roughness),
      emissive: asInt(row.emissive),
      ior: asInt(row.ior)
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
    materialByObject: new Map(),
    materialByNode: new Map(),
    colorByGeometry: new Map(),
    colorByObject: new Map(),
    colorByNode: new Map(),
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
      case Rel.OBJECT_HAS_MATERIAL:
        r.materialByObject.set(edge.src, edge.dst)
        break
      case Rel.OBJECT_HAS_COLOR:
        r.colorByObject.set(edge.src, edge.dst)
        break
      case Rel.NODE_HAS_MATERIAL:
        r.materialByNode.set(edge.src, edge.dst)
        break
      case Rel.NODE_HAS_COLOR:
        r.colorByNode.set(edge.src, edge.dst)
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

function readModelProperties(rows: Row[] | undefined): Map<string, PropValue> {
  const result = new Map<string, PropValue>()
  for (const row of rows ?? []) {
    const path = asString(row.path)
    if (!path) continue
    const value = coalesce(row)
    if (value !== undefined) result.set(path, value)
  }
  return result
}

async function readGeometries(shards: ArrayBuffer[]): Promise<Map<number, BundleGeometry>> {
  const result = new Map<number, BundleGeometry>()
  for (const shard of shards) {
    for (const row of await readParquetBinary(shard)) {
      const content = asBytes(row.content)
      if (!content) continue
      result.set(intAt(row, 'geometryIndex'), { content, type: bytesAsString(row.type) })
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

/**
 * Everything the bundle knows about one object, keyed the way a viewer selection
 * hands it to you. This is the round trip the bridge is really about: an
 * `applicationId` out of the viewer, the producer's own data back.
 */
export function propertiesOf(bundle: Bundle, applicationId: string): Record<string, unknown> {
  const key = bundle.objectKeyByAppId.get(applicationId)
  if (key === undefined) return {}
  const typeKey = bundle.typeIndexByObject.get(key)
  const typeLevel = typeKey === undefined ? {} : bundle.typeProperties.nested(typeKey, 'properties')
  return mergeProperties(typeLevel, bundle.properties.nested(key, 'properties'))
}

/** The root scalars sit beside `properties.*`, not under it. */
export function scalarsOf(bundle: Bundle, applicationId: string): Record<string, PropValue> {
  const key = bundle.objectKeyByAppId.get(applicationId)
  if (key === undefined) return {}
  const out: Record<string, PropValue> = {}
  for (const path of ['name', 'speckle_type', 'type', 'units', 'category', 'level']) {
    const value = bundle.properties.get(key, path)
    if (value !== undefined) out[path] = value
  }
  return out
}
