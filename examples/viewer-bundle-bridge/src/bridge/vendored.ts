/* eslint-disable */
/**
 * VENDORED CODE — do not read for understanding, do not edit here.
 *
 * Two files from elsewhere in the Speckle stack, copied because neither is on
 * public npm. Both are mechanical: a generated catalog and a binary decoder.
 * Everything a reader of this sample needs to understand is in the other files
 * beside this one.
 *
 * To refresh either, replace its section wholesale from the source named in its
 * banner. Do not hand-merge.
 */

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 1 — bundle spec catalog
// Source: speckle-bundle-spec, generated/ts/bundleSpec.ts @ commit 82ae2e97
// Schema 1.2.0. Regenerated there from spec/bundle-spec.sql, never by hand.
// ═══════════════════════════════════════════════════════════════════════════

export const SCHEMA_VERSION = '1.2.0' as const

/** Live relation ids. */
export const Rel = {
  DISPLAY: 1,
  SOLID: 2,
  SUBELEMENT: 3,
  DEFINES: 4,
  HAS_MATERIAL: 5,
  HAS_COLOR: 6,
  ON_LEVEL: 7,
  DISPLAY_INSTANCE: 8,
  DEFINES_INSTANCE: 9,
  IN_COLLECTION: 10,
  IN_MODEL: 11,
  IN_ROOM: 12,
  IN_SYSTEM: 14,
  IN_GROUP: 17,
  IN_ASSEMBLY: 18,
  CONNECTS_TO: 21,
  HOSTED_ON: 22,
  BOUNDS: 23,
  PLACES: 24,
  DEFINES_MEMBER: 25,
  OBJECT_HAS_MATERIAL: 26,
  OBJECT_HAS_COLOR: 27,
  NODE_HAS_MATERIAL: 28,
  NODE_HAS_COLOR: 29,
  CENTERLINE: 30
} as const
export type RelName = keyof typeof Rel

/** Live node-kind ids. */
export const NodeKind = {
  DEFINITION: 1,
  INSTANCE: 2,
  MATERIAL: 3,
  COLOR: 4,
  LEVEL: 5,
  CONTAINER: 7
} as const
export type NodeKindName = keyof typeof NodeKind

export type RelTypeMeta = {
  id: number
  name: string
  srcNs: string | null
  dstNs: string | null
  status: 'live' | 'reserved' | 'retired'
  ordSemantics: string | null
}
/** Full catalog incl. reserved/retired (retired kept so ids are never reused). */
export const REL_TYPES: readonly RelTypeMeta[] = [
  {
    id: 1,
    name: 'DISPLAY',
    srcNs: 'object',
    dstNs: 'geometry',
    status: 'live',
    ordSemantics: 'ordinal'
  },
  {
    id: 2,
    name: 'SOLID',
    srcNs: 'object',
    dstNs: 'geometry',
    status: 'live',
    ordSemantics: 'ordinal'
  },
  {
    id: 3,
    name: 'SUBELEMENT',
    srcNs: 'object',
    dstNs: 'object',
    status: 'live',
    ordSemantics: 'ordinal'
  },
  {
    id: 4,
    name: 'DEFINES',
    srcNs: 'node',
    dstNs: 'geometry',
    status: 'live',
    ordSemantics: 'ordinal'
  },
  {
    id: 5,
    name: 'HAS_MATERIAL',
    srcNs: 'geometry',
    dstNs: 'node',
    status: 'live',
    ordSemantics: null
  },
  {
    id: 6,
    name: 'HAS_COLOR',
    srcNs: 'geometry',
    dstNs: 'node',
    status: 'live',
    ordSemantics: null
  },
  { id: 7, name: 'ON_LEVEL', srcNs: 'object', dstNs: 'node', status: 'live', ordSemantics: null },
  {
    id: 8,
    name: 'DISPLAY_INSTANCE',
    srcNs: 'object',
    dstNs: 'node',
    status: 'live',
    ordSemantics: 'ordinal'
  },
  {
    id: 9,
    name: 'DEFINES_INSTANCE',
    srcNs: 'node',
    dstNs: 'node',
    status: 'live',
    ordSemantics: 'ordinal'
  },
  {
    id: 10,
    name: 'IN_COLLECTION',
    srcNs: 'object',
    dstNs: 'node',
    status: 'live',
    ordSemantics: null
  },
  { id: 11, name: 'IN_MODEL', srcNs: 'object', dstNs: 'node', status: 'live', ordSemantics: null },
  { id: 12, name: 'IN_ROOM', srcNs: 'object', dstNs: 'object', status: 'live', ordSemantics: null },
  { id: 13, name: 'IN_SPACE', srcNs: null, dstNs: null, status: 'retired', ordSemantics: null },
  { id: 14, name: 'IN_SYSTEM', srcNs: 'object', dstNs: 'node', status: 'live', ordSemantics: null },
  { id: 15, name: 'IN_NETWORK', srcNs: null, dstNs: null, status: 'retired', ordSemantics: null },
  { id: 16, name: 'IN_LINE', srcNs: null, dstNs: null, status: 'retired', ordSemantics: null },
  { id: 17, name: 'IN_GROUP', srcNs: 'object', dstNs: 'node', status: 'live', ordSemantics: null },
  {
    id: 18,
    name: 'IN_ASSEMBLY',
    srcNs: 'object',
    dstNs: 'object',
    status: 'live',
    ordSemantics: 'ordinal'
  },
  {
    id: 19,
    name: 'IN_SUBASSEMBLY',
    srcNs: null,
    dstNs: null,
    status: 'retired',
    ordSemantics: null
  },
  { id: 20, name: 'XREF', srcNs: null, dstNs: null, status: 'retired', ordSemantics: null },
  {
    id: 21,
    name: 'CONNECTS_TO',
    srcNs: 'object',
    dstNs: 'object',
    status: 'live',
    ordSemantics: 'scope'
  },
  {
    id: 22,
    name: 'HOSTED_ON',
    srcNs: 'object',
    dstNs: 'object',
    status: 'live',
    ordSemantics: null
  },
  { id: 23, name: 'BOUNDS', srcNs: 'object', dstNs: 'object', status: 'live', ordSemantics: null },
  { id: 24, name: 'PLACES', srcNs: 'object', dstNs: 'node', status: 'live', ordSemantics: null },
  {
    id: 25,
    name: 'DEFINES_MEMBER',
    srcNs: 'node',
    dstNs: 'object',
    status: 'live',
    ordSemantics: 'ordinal'
  },
  {
    id: 26,
    name: 'OBJECT_HAS_MATERIAL',
    srcNs: 'object',
    dstNs: 'node',
    status: 'live',
    ordSemantics: null
  },
  {
    id: 27,
    name: 'OBJECT_HAS_COLOR',
    srcNs: 'object',
    dstNs: 'node',
    status: 'live',
    ordSemantics: null
  },
  {
    id: 28,
    name: 'NODE_HAS_MATERIAL',
    srcNs: 'node',
    dstNs: 'node',
    status: 'live',
    ordSemantics: null
  },
  {
    id: 29,
    name: 'NODE_HAS_COLOR',
    srcNs: 'node',
    dstNs: 'node',
    status: 'live',
    ordSemantics: null
  },
  {
    id: 30,
    name: 'CENTERLINE',
    srcNs: 'object',
    dstNs: 'geometry',
    status: 'live',
    ordSemantics: 'ordinal'
  }
]

/** Logical table → column names, generated from the DDL. */
export const TABLES = {
  camera_views: [
    'view',
    'name',
    'is_default',
    'ord',
    'pos_x',
    'pos_y',
    'pos_z',
    'forward_x',
    'forward_y',
    'forward_z',
    'up_x',
    'up_y',
    'up_z',
    'target_x',
    'target_y',
    'target_z',
    'units',
    'is_ortho',
    'fov',
    'lens_mm',
    'ortho_height',
    'aspect',
    'near',
    'far'
  ],
  eav: [
    'object_index',
    'path_index',
    'value_string',
    'value_double',
    'value_boolean',
    'unit',
    'internal_definition_name'
  ],
  geometries: ['geometryIndex', 'content', 'id', 'type'],
  model: ['path', 'value_string', 'value_double', 'value_boolean', 'unit'],
  nodes: [
    'id',
    'kind',
    'name',
    'def_ref',
    'transform',
    'units',
    'subtype',
    'argb',
    'opacity',
    'metalness',
    'roughness',
    'emissive',
    'ior',
    'elevation',
    'gh_topology'
  ],
  object_type: ['object_index', 'type_index'],
  objects: ['object_index', 'application_id'],
  paths: ['path_index', 'path'],
  property_set_definitions: [
    'set_name',
    'set_key',
    'set_description',
    'field_name',
    'field_bucket_id',
    'data_type',
    'default_string',
    'default_double',
    'default_boolean',
    'unit',
    'description',
    'applies_to'
  ],
  relations: ['rel', 'src', 'dst', 'ord'],
  scene_views: ['view', 'name', 'is_default', 'ord', 'source', 'ref'],
  structural_results: [
    'object_index',
    'element_name',
    'location',
    'result_type',
    'load_case',
    'component',
    'position_label',
    'station',
    'step',
    'value',
    'value_text'
  ],
  type_eav: [
    'type_index',
    'path_index',
    'value_string',
    'value_double',
    'value_boolean',
    'unit',
    'internal_definition_name'
  ],
  types: ['type_index', 'type_key']
} as const

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 2 — SGEO decoder
// Source: the Speckle viewer (Apache-2.0),
// packages/viewer/src/modules/loaders/Speckle/decodeSgeo.ts
// Postdates @speckle/viewer@2.31.14, which is why it is copied rather than
// imported. Re-copy it from the viewer when the format gains primitives.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Stage-0 SGEO decoder (viewer side).
 *
 * Decodes one SGEO blob (16-byte family header + per-primitive body) into plain
 * typed arrays the viewer's mesh pipeline can consume. MESH ONLY for now — every
 * other primitive_type throws so the gap is loud, not silent.
 *
 * Header (16 bytes, little-endian) — mirrors speckle-sharp-sdk
 * plans/speckle-4.0/sgeo-binary-format.md:
 *   0x00  4  magic "SGEO"
 *   0x04  1  version (=1)
 *   0x05  1  primitive_type
 *   0x06  2  flags (uint16 bitfield)
 *   0x08  2  units_code (uint16)
 *   0x0A  2  reserved
 *   0x0C  4  crc32(body)            <- NOT verified here (Stage-0)
 *   0x10  …  body
 *
 * NOTE: assumes `content` is RAW sgeo bytes. If geometries.parquet stores the
 * blob zstd-compressed at the value level (rather than via parquet column
 * compression), zstd-decompress before calling this (see SMSH `deblob`).
 */

const MAGIC = 0x4f454753 // "SGEO" read as little-endian uint32 (0x53 0x47 0x45 0x4f)
const HEADER_SIZE = 16

export enum SgeoPrimitiveType {
  Mesh = 0,
  Line = 1,
  Polyline = 2,
  Polycurve = 3,
  Curve = 4,
  Arc = 5,
  Circle = 6,
  Points = 7,
  Ellipse = 8,
  Spiral = 9,
  Box = 10,
  Region = 11,
  Text = 12
}

// flags bitfield (SgeoFlags in speckle-sharp-sdk Speckle.Objects/Utils/SgeoFormat.cs)
const FLAG_QUANTIZED = 1 << 0 // not produced today; treat as unsupported if seen
const FLAG_CLOSED = 1 << 1 // polyline/curve closed loop
const FLAG_HAS_NORMALS = 1 << 4
const FLAG_HAS_UVS = 1 << 5
const FLAG_HAS_COLORS = 1 << 6
const FLAG_SCREEN_ORIENTED = 1 << 9 // text is camera-aligned (plane axes ignored)
const FLAG_HAS_MAX_WIDTH = 1 << 10 // text has a wrap width

// units_code -> viewer unit string (Units.GetEncodingFromUnit on the SDK side)
const UNITS: Record<number, string> = {
  0: 'none',
  1: 'mm',
  2: 'cm',
  3: 'm',
  4: 'km',
  5: 'in',
  6: 'ft',
  7: 'yd',
  8: 'mi'
}

export interface SgeoHeader {
  version: number
  primitiveType: SgeoPrimitiveType
  flags: number
  unitsCode: number
  units: string
}

export interface DecodedMesh {
  header: SgeoHeader
  units: string
  vertices: Float64Array // xyz …
  faces: Int32Array // n-gon encoded [n,i0,i1,…]
  normals?: Float64Array
  uvs?: Float64Array
  colors?: Int32Array // ARGB
}

export interface DecodedLine {
  header: SgeoHeader
  units: string
  start: [number, number, number]
  end: [number, number, number]
}

export interface DecodedPolyline {
  header: SgeoHeader
  units: string
  value: Float64Array // flat xyz …
  closed: boolean
}

export interface DecodedText {
  header: SgeoHeader
  units: string
  value: string
  height: number // linear units, or px when units_code = 0 (none)
  maxWidth: number | null // null ⇒ no wrap
  alignmentH: number // 0 left, 1 center, 2 right
  alignmentV: number // 0 top, 1 center, 2 bottom
  screenOriented: boolean
  plane: SgeoPlane
}

/** Tagged union over the SGEO primitive types the viewer can render. */
export type DecodedGeometry =
  | ({ kind: 'mesh' } & DecodedMesh)
  | ({ kind: 'line' } & DecodedLine)
  | ({ kind: 'polyline' } & DecodedPolyline)
  | ({ kind: 'text' } & DecodedText)
  | { kind: 'unsupported'; header: SgeoHeader }

export function readSgeoHeader(bytes: Uint8Array): SgeoHeader {
  if (bytes.byteLength < HEADER_SIZE) {
    throw new Error(`[SGEO] blob too small: ${bytes.byteLength}B < ${HEADER_SIZE}B`)
  }
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const magic = dv.getUint32(0, true)
  if (magic !== MAGIC) {
    throw new Error(
      `[SGEO] bad magic 0x${magic.toString(16)} (expected "SGEO"). ` +
        `Is this an SGEO blob (not legacy SMSH / not zstd-compressed)?`
    )
  }
  const unitsCode = dv.getUint16(8, true)
  return {
    version: dv.getUint8(4),
    primitiveType: dv.getUint8(5) as SgeoPrimitiveType,
    flags: dv.getUint16(6, true),
    unitsCode,
    units: UNITS[unitsCode] ?? 'm'
  }
}

/**
 * Decode an SGEO mesh (primitive_type 0). Copies each channel out via slice() so
 * we never hit a typed-array alignment exception on odd offsets (same trick the
 * SMSH `deblob` uses) — fine for Stage-0 test volumes.
 */
export function decodeSgeoMesh(bytes: Uint8Array): DecodedMesh {
  const header = readSgeoHeader(bytes)
  if (header.primitiveType !== SgeoPrimitiveType.Mesh) {
    throw new Error(
      `[SGEO] Stage-0 decodes mesh only; got primitive_type ${header.primitiveType} (${
        SgeoPrimitiveType[header.primitiveType] ?? 'unknown'
      })`
    )
  }

  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const vertexCount = dv.getUint32(0x10, true)
  const faceIntCount = dv.getUint32(0x14, true)

  let off = 0x18 // body f64 block starts 8-aligned
  const align8 = (n: number) => (n + 7) & ~7

  const take = (start: number, byteLen: number) => bytes.slice(start, start + byteLen) // fresh 0-offset buffer

  const vBytes = take(off, vertexCount * 3 * 8)
  const vertices = new Float64Array(vBytes.buffer)
  off += vertexCount * 3 * 8

  const fBytes = take(off, faceIntCount * 4)
  const faces = new Int32Array(fBytes.buffer)
  off += faceIntCount * 4

  let normals: Float64Array | undefined
  if (header.flags & FLAG_HAS_NORMALS) {
    off = align8(off)
    normals = new Float64Array(take(off, vertexCount * 3 * 8).buffer)
    off += vertexCount * 3 * 8
  }

  let uvs: Float64Array | undefined
  if (header.flags & FLAG_HAS_UVS) {
    off = align8(off)
    uvs = new Float64Array(take(off, vertexCount * 2 * 8).buffer)
    off += vertexCount * 2 * 8
  }

  let colors: Int32Array | undefined
  if (header.flags & FLAG_HAS_COLORS) {
    colors = new Int32Array(take(off, vertexCount * 4).buffer)
    off += vertexCount * 4
  }

  return { header, units: header.units, vertices, faces, normals, uvs, colors }
}

/**
 * Decode an SGEO line (primitive_type 1). Body (8 f64, 64 B):
 *   0x10 domain.start · 0x18 domain.end · 0x20 start.xyz · 0x38 end.xyz
 * (matches SgeoEncoder.EncodeLine). DataView handles the f64 reads at any offset.
 */
export function decodeSgeoLine(bytes: Uint8Array): DecodedLine {
  const header = readSgeoHeader(bytes)
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const start: [number, number, number] = [
    dv.getFloat64(0x20, true),
    dv.getFloat64(0x28, true),
    dv.getFloat64(0x30, true)
  ]
  const end: [number, number, number] = [
    dv.getFloat64(0x38, true),
    dv.getFloat64(0x40, true),
    dv.getFloat64(0x48, true)
  ]
  return { header, units: header.units, start, end }
}

/**
 * Decode an SGEO polyline (primitive_type 2). Body (matches SgeoEncoder.EncodePolyline):
 *   0x10 u32 pointCount (= value.length/3) · 0x14 u32 pad · 0x18 f64[pointCount*3]
 * `closed` rides on the CLOSED flag.
 */
export function decodeSgeoPolyline(bytes: Uint8Array): DecodedPolyline {
  const header = readSgeoHeader(bytes)
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const pointCount = dv.getUint32(0x10, true)
  const value = new Float64Array(pointCount * 3)
  let off = 0x18
  for (let i = 0; i < value.length; i++) {
    value[i] = dv.getFloat64(off, true)
    off += 8
  }
  return {
    header,
    units: header.units,
    value,
    closed: (header.flags & FLAG_CLOSED) !== 0
  }
}

// ── curve family → tessellated to a polyline the line/polyline path renders ──

const CURVE_SEGMENTS = 64 // samples per arc/circle/ellipse (matches converter ~50)
export type Vec3 = [number, number, number]
export interface SgeoPlane {
  origin: Vec3
  normal: Vec3
  xdir: Vec3
  ydir: Vec3
}

const v3 = (dv: DataView, off: number): Vec3 => [
  dv.getFloat64(off, true),
  dv.getFloat64(off + 8, true),
  dv.getFloat64(off + 16, true)
]
const vsub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const vdot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const vlen = (a: Vec3): number => Math.sqrt(vdot(a, a))

/** SgeoEncoder.AddPlane order: origin, normal, xdir, ydir (4 vectors, 96 B). */
function readPlane(dv: DataView, off: number): SgeoPlane {
  return {
    origin: v3(dv, off),
    normal: v3(dv, off + 24),
    xdir: v3(dv, off + 48),
    ydir: v3(dv, off + 72)
  }
}

/** Sample point on a plane at radius/angle: origin + r·(cosθ·xdir + sinθ·ydir). */
function planePoint(p: SgeoPlane, rx: number, ry: number, t: number, out: number[]): void {
  const c = Math.cos(t)
  const s = Math.sin(t)
  out.push(
    p.origin[0] + rx * c * p.xdir[0] + ry * s * p.ydir[0],
    p.origin[1] + rx * c * p.xdir[1] + ry * s * p.ydir[1],
    p.origin[2] + rx * c * p.xdir[2] + ry * s * p.ydir[2]
  )
}

const TWO_PI = Math.PI * 2
const norm2pi = (a: number): number => ((a % TWO_PI) + TWO_PI) % TWO_PI
const inPlaneAngle = (pt: Vec3, p: SgeoPlane): number => {
  const d = vsub(pt, p.origin)
  return Math.atan2(vdot(d, p.ydir), vdot(d, p.xdir))
}

/** Arc as 3 points on a plane (origin = centre). Sweep start→end through mid. */
function tessellateArc(p: SgeoPlane, start: Vec3, mid: Vec3, end: Vec3): number[] {
  const r = vlen(vsub(start, p.origin))
  const a0 = inPlaneAngle(start, p)
  const dEnd = norm2pi(inPlaneAngle(end, p) - a0)
  const dMid = norm2pi(inPlaneAngle(mid, p) - a0)
  // mid inside the CCW sweep ⇒ go CCW; otherwise CW (the complement).
  const sweep = dMid <= dEnd ? dEnd : dEnd - TWO_PI
  const out: number[] = []
  for (let i = 0; i <= CURVE_SEGMENTS; i++) {
    planePoint(p, r, r, a0 + (sweep * i) / CURVE_SEGMENTS, out)
  }
  return out
}

function tessellateFullEllipse(p: SgeoPlane, rx: number, ry: number): number[] {
  const out: number[] = []
  for (let i = 0; i <= CURVE_SEGMENTS; i++) {
    planePoint(p, rx, ry, (TWO_PI * i) / CURVE_SEGMENTS, out)
  }
  return out
}

/** Append `pts` to `acc`, skipping its first point if it coincides with acc's last. */
function appendDedup(acc: number[], pts: number[]): void {
  let i = 0
  if (
    acc.length >= 3 &&
    pts.length >= 3 &&
    Math.abs(acc[acc.length - 3] - pts[0]) < 1e-9 &&
    Math.abs(acc[acc.length - 2] - pts[1]) < 1e-9 &&
    Math.abs(acc[acc.length - 1] - pts[2]) < 1e-9
  ) {
    i = 3
  }
  for (; i < pts.length; i++) acc.push(pts[i])
}

/** The flat polyline points for one decoded primitive (for polycurve concat). */
function pointsOf(g: DecodedGeometry): number[] {
  if (g.kind === 'line') return [...g.start, ...g.end]
  if (g.kind === 'polyline') return Array.from(g.value)
  return []
}

/**
 * Tessellate a curve-family SGEO blob to a polyline. Arc/Circle/Ellipse are sampled
 * analytically from their plane; Curve/Spiral read their leading connector-baked
 * displayValue polyline (STEER #5); polycurves recurse over their nested segment
 * blobs and concatenate.
 */
function tessellateCurve(bytes: Uint8Array, header: SgeoHeader): DecodedPolyline {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const closed = (header.flags & FLAG_CLOSED) !== 0
  const poly = (value: number[], c = closed): DecodedPolyline => ({
    header,
    units: header.units,
    value: Float64Array.from(value),
    closed: c
  })

  switch (header.primitiveType) {
    case SgeoPrimitiveType.Arc: {
      // plane(0x10,96B) · start(0x70) · mid(0x88) · end(0xA0)
      const plane = readPlane(dv, 0x10)
      return poly(tessellateArc(plane, v3(dv, 0x70), v3(dv, 0x88), v3(dv, 0xa0)), false)
    }
    case SgeoPrimitiveType.Circle: {
      // radius(0x10) · domain(0x18,0x20) · plane(0x28)
      const radius = dv.getFloat64(0x10, true)
      return poly(tessellateFullEllipse(readPlane(dv, 0x28), radius, radius), true)
    }
    case SgeoPrimitiveType.Ellipse: {
      // firstRadius(0x10) · secondRadius(0x18) · domain(0x20,0x28) · plane(0x30)
      const rx = dv.getFloat64(0x10, true)
      const ry = dv.getFloat64(0x18, true)
      return poly(tessellateFullEllipse(readPlane(dv, 0x30), rx, ry), true)
    }
    case SgeoPrimitiveType.Curve:
    case SgeoPrimitiveType.Spiral: {
      // STEER #5: Curve(4)/Spiral(9) LEAD with their connector-baked displayValue
      // polyline (the exact smooth curve the legacy viewer draws); the analytic
      // definition (NURBS knots/points/weights · spiral turns/pitch/axis) trails it
      // and is ignored by the render path. The leading bytes are a primitive-2
      // polyline body — u32 count@0x10, u32 pad@0x14, f64[count*3] points@0x18 —
      // read exactly like decodeSgeoPolyline. (def_off = 0x18 + count*3*8 if ever
      // an analytical reader needs the trailing definition.)
      const count = dv.getUint32(0x10, true)
      const out: number[] = []
      let off = 0x18
      for (let i = 0; i < count * 3; i++) {
        out.push(dv.getFloat64(off, true))
        off += 8
      }
      return poly(out)
    }
    case SgeoPrimitiveType.Polycurve: {
      // segCount(0x10) · pad · per seg: u32 blobLen · pad · blob · pad8.
      const segCount = dv.getUint32(0x10, true)
      const acc: number[] = []
      let off = 0x18
      for (let i = 0; i < segCount; i++) {
        const blobLen = dv.getUint32(off, true)
        off += 8 // u32 len + u32 pad
        const seg = bytes.subarray(off, off + blobLen)
        appendDedup(acc, pointsOf(decodeSgeo(seg)))
        off = (off + blobLen + 7) & ~7 // advance + Pad8
      }
      return poly(acc)
    }
    default:
      // Box(10)/Points(7)/Spiral(9) — not tessellated here.
      return poly([])
  }
}

/**
 * Decode an SGEO text (primitive_type 12). Body (matches SgeoEncoder.EncodeText):
 *   0x10 u32 alignmentH · 0x14 u32 alignmentV · 0x18 f64 height ·
 *   [f64 maxWidth if flag bit10] · plane (96 B) ·
 *   u32 value_byte_len · u32 pad · utf8 bytes · pad-to-8
 * `screenOriented` rides flag bit 9. The byte length counts BYTES, not chars.
 */
export function decodeSgeoText(bytes: Uint8Array): DecodedText {
  const header = readSgeoHeader(bytes)
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const alignmentH = dv.getUint32(0x10, true)
  const alignmentV = dv.getUint32(0x14, true)
  const height = dv.getFloat64(0x18, true)
  let off = 0x20
  let maxWidth: number | null = null
  if (header.flags & FLAG_HAS_MAX_WIDTH) {
    maxWidth = dv.getFloat64(off, true)
    off += 8
  }
  const plane = readPlane(dv, off)
  off += 96
  const byteLen = dv.getUint32(off, true)
  off += 8 // u32 len + u32 pad
  if (byteLen > bytes.byteLength - off) {
    throw new Error(
      `[SGEO] text byte length ${byteLen} exceeds the remaining buffer (${bytes.byteLength - off} B)`
    )
  }
  const value = new TextDecoder().decode(bytes.subarray(off, off + byteLen))
  return {
    header,
    units: header.units,
    value,
    height,
    maxWidth,
    alignmentH,
    alignmentV,
    screenOriented: (header.flags & FLAG_SCREEN_ORIENTED) !== 0,
    plane
  }
}

/**
 * Dispatch one SGEO blob by primitive type into the renderable union. The curve
 * family (Arc/Circle/Ellipse/Curve/Polycurve) is tessellated to a polyline so it
 * flows through the same placement path as lines. Genuinely unsupported
 * primitives (and the unused QUANTIZED encoding) return a `{kind:'unsupported'}`
 * marker rather than throwing, so the caller can tally + warn per class.
 */
export function decodeSgeo(bytes: Uint8Array): DecodedGeometry {
  const header = readSgeoHeader(bytes)
  if (header.flags & FLAG_QUANTIZED) return { kind: 'unsupported', header }
  switch (header.primitiveType) {
    case SgeoPrimitiveType.Mesh:
      return { kind: 'mesh', ...decodeSgeoMesh(bytes) }
    case SgeoPrimitiveType.Line:
      return { kind: 'line', ...decodeSgeoLine(bytes) }
    case SgeoPrimitiveType.Polyline:
      return { kind: 'polyline', ...decodeSgeoPolyline(bytes) }
    case SgeoPrimitiveType.Arc:
    case SgeoPrimitiveType.Circle:
    case SgeoPrimitiveType.Ellipse:
    case SgeoPrimitiveType.Curve:
    case SgeoPrimitiveType.Spiral:
    case SgeoPrimitiveType.Polycurve: {
      const p = tessellateCurve(bytes, header)
      // empty tessellation (e.g. a degenerate segment) ⇒ nothing to render
      return p.value.length >= 6 ? { kind: 'polyline', ...p } : { kind: 'unsupported', header }
    }
    case SgeoPrimitiveType.Text:
      return { kind: 'text', ...decodeSgeoText(bytes) }
    default:
      return { kind: 'unsupported', header }
  }
}
