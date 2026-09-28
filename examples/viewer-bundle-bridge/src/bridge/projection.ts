/**
 * Project a bundle onto the object shape the published viewer already converts: a
 * Collection root, one object per `applicationId` carrying its display geometry,
 * and instance, material and colour proxies.
 *
 * Rendering is unconditional. Properties and the reference point are options,
 * because an app that only draws pays nothing for data it never reads.
 */

import { decodeSgeo, SgeoPrimitiveType, type DecodedGeometry } from './decodeSgeo.js'
import { mergeProperties, parseTransform, type Bundle, type BundleNode } from './bundleReader.js'
import { NodeKind } from './bundleSpec.js'

/**
 * The shape `@speckle/objectloader2` and the viewer's converter expect. `id` is
 * required — the converter skips objects without one — and the last dotted segment
 * of `speckle_type` is what selects a converter, so the proxy types have to keep
 * their exact tails.
 */
export interface BaseObject {
  id: string
  speckle_type: string
  [key: string]: unknown
}

const SpeckleType = {
  Collection: 'Speckle.Core.Models.Collections.Collection',
  DataObject: 'Objects.Data.DataObject',
  RenderMaterial: 'Objects.Other.RenderMaterial',
  RenderMaterialProxy: 'Objects.Other.RenderMaterialProxy',
  ColorProxy: 'Speckle.Core.Models.Proxies.ColorProxy',
  InstanceProxy: 'Speckle.Core.Models.Instances.InstanceProxy',
  InstanceDefinitionProxy: 'Speckle.Core.Models.Instances.InstanceDefinitionProxy'
} as const

const IDENTITY: number[] = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]

export interface ProjectionOptions {
  /** Merge instance and type-level properties onto every object. */
  properties?: boolean
  /** Carry the model's reference point onto the root. */
  referencePoint?: boolean
}

export interface GeometryReport {
  /** SGEO primitive types seen but not converted, with a count each. */
  skipped: Map<string, number>
}

export interface ProjectionResult {
  root: BaseObject
  report: GeometryReport
}

export function projectBundle(bundle: Bundle, options: ProjectionOptions = {}): ProjectionResult {
  const report: GeometryReport = { skipped: new Map() }
  const relations = bundle.relations
  const { root, collectionByNode } = collectionTree(bundle)
  const materials = materialProxies(bundle)

  const placementsByObject = new Map<number, number[]>()
  for (const edge of relations.displayInstanceEdges) {
    const list = placementsByObject.get(edge.src)
    if (list) list.push(edge.dst)
    else placementsByObject.set(edge.src, [edge.dst])
  }

  for (const [objectKey, appId] of [...bundle.objectAppIds].sort((a, b) => a[0] - b[0])) {
    const collectionKey = relations.collectionByObject.get(objectKey)
    const host = collectionKey === undefined ? root : (collectionByNode.get(collectionKey) ?? root)
    const elements = host.elements as BaseObject[]

    const placements = placementsByObject.get(objectKey)
    if (placements?.length) {
      // A placed object is drawn by its definition, not by its own geometry.
      placements.forEach((instanceKey, index) => {
        const instance = bundle.nodes.get(instanceKey)
        if (!instance) return
        const placementId = index === 0 ? appId : `${appId}-instance-${index}`
        elements.push(instanceProxy(placementId, instance))
      })
      continue
    }

    const object = geometryObject(bundle, objectKey, appId, report, options)
    if (object) elements.push(object)
  }

  attachMaterials(bundle, materials, root)
  attachColors(bundle, root)
  attachInstanceDefinitions(bundle, root, report)

  if (options.referencePoint) {
    const transform = referencePointTransform(bundle)
    if (transform) root.referencePointTransform = transform
  }
  root.units = bundle.units
  root.version = 4
  return { root, report }
}

function collectionTree(bundle: Bundle): {
  root: BaseObject
  collectionByNode: Map<number, BaseObject>
} {
  const root: BaseObject = {
    id: 'bundle-root',
    applicationId: 'bundle-root',
    speckle_type: SpeckleType.Collection,
    name: 'Received model',
    elements: [] as BaseObject[]
  }

  const collectionByNode = new Map<number, BaseObject>()
  for (const [key, node] of bundle.nodes) {
    if (node.kind !== NodeKind.CONTAINER) continue
    const id = `coll-${key}`
    collectionByNode.set(key, {
      id,
      applicationId: id,
      speckle_type: SpeckleType.Collection,
      name: node.name ?? 'Layer',
      elements: [] as BaseObject[]
    })
  }

  // Containers nest through their parent reference column, not through a relation.
  for (const [key, collection] of collectionByNode) {
    const parentKey = bundle.nodes.get(key)?.defRef
    const parent = parentKey === undefined ? undefined : collectionByNode.get(parentKey)
    ;((parent ?? root).elements as BaseObject[]).push(collection)
  }
  return { root, collectionByNode }
}

function materialProxies(bundle: Bundle): Map<number, BaseObject> {
  const proxies = new Map<number, BaseObject>()
  for (const [key, node] of bundle.nodes) {
    if (node.kind !== NodeKind.MATERIAL) continue
    const id = `mat-${key}`
    proxies.set(key, {
      id,
      applicationId: id,
      speckle_type: SpeckleType.RenderMaterialProxy,
      value: {
        id: `${id}-value`,
        applicationId: id,
        speckle_type: SpeckleType.RenderMaterial,
        name: node.name ?? 'material',
        diffuse: node.argb ?? -1,
        opacity: node.opacity ?? 1,
        metalness: node.metalness ?? 0,
        roughness: node.roughness ?? 1,
        emissive: node.emissive ?? 0
      },
      objects: [] as string[]
    })
  }
  return proxies
}

/**
 * Material fills from specific to general: HAS_MATERIAL on the geometry, then
 * OBJECT_HAS_MATERIAL on the object, then NODE_HAS_MATERIAL on the object's
 * container. The most specific one found wins, so apply them general first.
 */
function attachMaterials(
  bundle: Bundle,
  materials: Map<number, BaseObject>,
  root: BaseObject
): void {
  const relations = bundle.relations
  const materialByObjectKey = new Map<number, number>()

  for (const [objectKey, containerKey] of relations.collectionByObject) {
    const fromNode = relations.materialByNode.get(containerKey)
    if (fromNode !== undefined) materialByObjectKey.set(objectKey, fromNode)
  }
  for (const [objectKey, materialKey] of relations.materialByObject) {
    materialByObjectKey.set(objectKey, materialKey)
  }
  for (const [geometryKey, materialKey] of relations.materialByGeometry) {
    const objectKey = relations.objectByGeometry.get(geometryKey)
    if (objectKey !== undefined) materialByObjectKey.set(objectKey, materialKey)
  }

  for (const [objectKey, materialKey] of materialByObjectKey) {
    const proxy = materials.get(materialKey)
    const appId = bundle.objectAppIds.get(objectKey)
    if (!proxy || !appId) continue
    const targets = proxy.objects as string[]
    if (!targets.includes(appId)) targets.push(appId)
  }

  const used = [...materials.values()].filter((p) => (p.objects as string[]).length > 0)
  if (used.length) root.renderMaterialProxies = used
}

/**
 * Colour is presentational and follows the same order: OBJECT_HAS_COLOR overrides
 * HAS_COLOR on the geometry, and NODE_HAS_COLOR is the container default.
 */
function attachColors(bundle: Bundle, root: BaseObject): void {
  const relations = bundle.relations
  const colorByObjectKey = new Map<number, number>()

  for (const [objectKey, containerKey] of relations.collectionByObject) {
    const fromNode = relations.colorByNode.get(containerKey)
    if (fromNode !== undefined) colorByObjectKey.set(objectKey, fromNode)
  }
  for (const [geometryKey, colorKey] of relations.colorByGeometry) {
    const objectKey = relations.objectByGeometry.get(geometryKey)
    if (objectKey !== undefined) colorByObjectKey.set(objectKey, colorKey)
  }
  for (const [objectKey, colorKey] of relations.colorByObject) {
    colorByObjectKey.set(objectKey, colorKey)
  }

  const targetsByColor = new Map<number, string[]>()
  for (const [objectKey, colorKey] of colorByObjectKey) {
    const appId = bundle.objectAppIds.get(objectKey)
    if (!appId) continue
    const targets = targetsByColor.get(colorKey)
    if (targets) {
      if (!targets.includes(appId)) targets.push(appId)
    } else {
      targetsByColor.set(colorKey, [appId])
    }
  }

  const proxies: BaseObject[] = []
  for (const [colorKey, targets] of targetsByColor) {
    const node = bundle.nodes.get(colorKey)
    if (node?.argb === undefined) continue
    const id = `color-${colorKey}`
    proxies.push({
      id,
      applicationId: id,
      speckle_type: SpeckleType.ColorProxy,
      value: node.argb,
      name: node.name ?? id,
      objects: targets
    })
  }
  if (proxies.length) root.colorProxies = proxies
}

function instanceProxy(appId: string, instance: BundleNode): BaseObject {
  return {
    id: appId,
    applicationId: appId,
    speckle_type: SpeckleType.InstanceProxy,
    definitionId: `def-${instance.defRef ?? -1}`,
    transform: parseTransform(instance.transform) ?? [...IDENTITY],
    maxDepth: 0,
    units: instance.units ?? 'none'
  }
}

function attachInstanceDefinitions(bundle: Bundle, root: BaseObject, report: GeometryReport): void {
  const relations = bundle.relations
  const depthByDefinition = definitionDepths(bundle)
  const proxies: BaseObject[] = []

  for (const [definitionKey, node] of bundle.nodes) {
    if (node.kind !== NodeKind.DEFINITION) continue
    const members: string[] = []

    for (const geometryKey of relations.definesByDefinition.get(definitionKey) ?? []) {
      const objectKey = relations.objectByGeometry.get(geometryKey)
      const appId = objectKey === undefined ? undefined : bundle.objectAppIds.get(objectKey)
      if (appId) {
        if (!members.includes(appId)) members.push(appId)
        continue
      }
      // Definition geometry with no owning object still has to be carried, or the
      // definition expands to nothing.
      const geometry = bundle.geometries.get(geometryKey)
      const memberId = `def-geo-${geometryKey}`
      if (!geometry || members.includes(memberId)) continue
      // The carrier and its display geometry must not share an applicationId: the
      // converter counts consumable definition members by applicationId and stops
      // early once the count is met, so a duplicate loses a later member.
      const decoded = sgeoToSpeckle(geometry.content, `${memberId}-geo`, report)
      if (!decoded) continue
      ;(root.elements as BaseObject[]).push({
        id: memberId,
        applicationId: memberId,
        speckle_type: SpeckleType.DataObject,
        name: 'geometry',
        displayValue: [decoded],
        properties: {}
      })
      members.push(memberId)
    }

    for (const instanceKey of relations.definesInstanceByDefinition.get(definitionKey) ?? []) {
      const instance = bundle.nodes.get(instanceKey)
      if (!instance) continue
      const nestedId = `nested-inst-${instanceKey}`
      ;(root.elements as BaseObject[]).push(instanceProxy(nestedId, instance))
      if (!members.includes(nestedId)) members.push(nestedId)
    }

    const id = `def-${definitionKey}`
    proxies.push({
      id,
      applicationId: id,
      speckle_type: SpeckleType.InstanceDefinitionProxy,
      name: node.name ?? `Definition ${definitionKey}`,
      objects: members,
      maxDepth: depthByDefinition.get(definitionKey) ?? 0
    })
  }
  if (proxies.length) root.instanceDefinitionProxies = proxies
}

/** Deepest nesting level per definition, 0 at a top-level placement. */
function definitionDepths(bundle: Bundle): Map<number, number> {
  const depth = new Map<number, number>()
  const nested = bundle.relations.definesInstanceByDefinition

  const propagate = (definitionKey: number, d: number, onStack: Set<number>): void => {
    if (onStack.has(definitionKey)) return
    onStack.add(definitionKey)
    if ((depth.get(definitionKey) ?? -1) < d) {
      depth.set(definitionKey, d)
      for (const instanceKey of nested.get(definitionKey) ?? []) {
        const instance = bundle.nodes.get(instanceKey)
        if (instance?.defRef !== undefined) propagate(instance.defRef, d + 1, onStack)
      }
    }
    onStack.delete(definitionKey)
  }

  for (const edge of bundle.relations.displayInstanceEdges) {
    const instance = bundle.nodes.get(edge.dst)
    if (instance?.defRef !== undefined) propagate(instance.defRef, 0, new Set())
  }
  return depth
}

function geometryObject(
  bundle: Bundle,
  objectKey: number,
  appId: string,
  report: GeometryReport,
  options: ProjectionOptions
): BaseObject | undefined {
  const displays: BaseObject[] = []
  for (const edge of bundle.relations.displayByObject.get(objectKey) ?? []) {
    const geometry = bundle.geometries.get(edge.dst)
    if (!geometry) continue
    const decoded = sgeoToSpeckle(geometry.content, `${appId}-geo-${edge.dst}`, report)
    if (decoded) displays.push(decoded)
  }
  if (!displays.length) return undefined

  let properties: Record<string, unknown> = {}
  if (options.properties) {
    const typeKey = bundle.typeIndexByObject.get(objectKey)
    const typeLevel =
      typeKey === undefined ? {} : bundle.typeProperties.nested(typeKey, 'properties')
    properties = mergeProperties(typeLevel, bundle.properties.nested(objectKey, 'properties'))
  }

  return {
    id: appId,
    applicationId: appId,
    speckle_type: SpeckleType.DataObject,
    name: bundle.properties.getString(objectKey, 'name') ?? appId,
    displayValue: displays,
    properties
  }
}

/** Linear-unit scale to feet, for the reference point's legacy layout. */
const TO_FEET: Record<string, number> = {
  mm: 1 / 304.8,
  cm: 1 / 30.48,
  m: 1 / 0.3048,
  km: 1000 / 0.3048,
  in: 1 / 12,
  ft: 1,
  yd: 3,
  mi: 5280
}

/**
 * Only a bundle whose sender applied its datum to stored geometry carries one: the
 * rigid inverse of `modelPlacement.transform`, basis columns first, translation at
 * 12–14, in feet. When `appliedToGeometry` is false the app applies the transform
 * itself; no rows at all means the internal origin.
 */
function referencePointTransform(bundle: Bundle): { transform: number[] } | undefined {
  if (bundle.modelProperties.get('modelPlacement.appliedToGeometry') !== true) {
    return undefined
  }
  const raw = bundle.modelProperties.get('modelPlacement.transform')
  const d = parseTransform(typeof raw === 'string' ? raw : undefined)
  if (!d) return undefined

  const units = String(bundle.modelProperties.get('modelPlacement.units') ?? bundle.units)
  const toFeet = TO_FEET[units] ?? 1
  const tx = d[3] * toFeet
  const ty = d[7] * toFeet
  const tz = d[11] * toFeet

  return {
    transform: [
      d[0],
      d[1],
      d[2],
      0,
      d[4],
      d[5],
      d[6],
      0,
      d[8],
      d[9],
      d[10],
      0,
      -(d[0] * tx + d[4] * ty + d[8] * tz),
      -(d[1] * tx + d[5] * ty + d[9] * tz),
      -(d[2] * tx + d[6] * ty + d[10] * tz),
      1
    ]
  }
}

// ── SGEO to Speckle geometry ────────────────────────────────────────────────

/**
 * SGEO decodes to typed arrays. The viewer's converter wants Speckle geometry
 * objects, so this is the adapter between the two: one decoded primitive in, one
 * `Objects.Geometry.*` object out, or `undefined` for a primitive this bridge does
 * not render.
 */
function sgeoToSpeckle(
  content: Uint8Array,
  id: string,
  report: GeometryReport
): BaseObject | undefined {
  let decoded: DecodedGeometry
  try {
    decoded = decodeSgeo(content)
  } catch (error) {
    tally(report, `decode error: ${(error as Error).message}`)
    return undefined
  }

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

function point([x, y, z]: [number, number, number], units: string, id: string): BaseObject {
  return { id, speckle_type: 'Objects.Geometry.Point', units, x, y, z }
}

function tally(report: GeometryReport, key: string): void {
  report.skipped.set(key, (report.skipped.get(key) ?? 0) + 1)
}
