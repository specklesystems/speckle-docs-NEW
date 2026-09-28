import { decodeSgeo, SgeoPrimitiveType, type DecodedGeometry } from './decodeSgeo.js'

/**
 * SGEO decodes to typed arrays. The viewer's converter wants Speckle geometry
 * objects, so this is the adapter between the two: one decoded primitive in, one
 * `Objects.Geometry.*` object out, or `undefined` for a primitive this bridge does
 * not render.
 */
export interface SpeckleGeometry {
  id: string
  speckle_type: string
  units: string
  [key: string]: unknown
}

export interface GeometryReport {
  /** SGEO primitive types seen but not converted, with a count each. */
  skipped: Map<string, number>
}

export function newGeometryReport(): GeometryReport {
  return { skipped: new Map() }
}

export function sgeoToSpeckle(
  content: Uint8Array,
  id: string,
  report?: GeometryReport
): SpeckleGeometry | undefined {
  let decoded: DecodedGeometry
  try {
    decoded = decodeSgeo(content)
  } catch (error) {
    tally(report, `decode error: ${(error as Error).message}`)
    return undefined
  }
  return toSpeckle(decoded, id, report)
}

function toSpeckle(
  decoded: DecodedGeometry,
  id: string,
  report?: GeometryReport
): SpeckleGeometry | undefined {
  switch (decoded.kind) {
    case 'mesh':
      return {
        id,
        applicationId: id,
        speckle_type: 'Objects.Geometry.Mesh',
        units: decoded.units,
        vertices: Array.from(decoded.vertices),
        faces: Array.from(decoded.faces),
        ...(decoded.colors ? { colors: Array.from(decoded.colors) } : {})
      }
    case 'line':
      return {
        id,
        applicationId: id,
        speckle_type: 'Objects.Geometry.Line',
        units: decoded.units,
        start: point(decoded.start, decoded.units, `${id}-start`),
        end: point(decoded.end, decoded.units, `${id}-end`)
      }
    case 'polyline':
      return {
        id,
        applicationId: id,
        speckle_type: 'Objects.Geometry.Polyline',
        units: decoded.units,
        value: Array.from(decoded.value),
        closed: decoded.closed
      }
    case 'text':
      tally(report, 'text')
      return undefined
    default:
      tally(report, SgeoPrimitiveType[decoded.header.primitiveType] ?? 'unknown')
      return undefined
  }
}

function point([x, y, z]: [number, number, number], units: string, id: string): SpeckleGeometry {
  return { id, speckle_type: 'Objects.Geometry.Point', units, x, y, z }
}

function tally(report: GeometryReport | undefined, key: string): void {
  if (!report) return
  report.skipped.set(key, (report.skipped.get(key) ?? 0) + 1)
}
