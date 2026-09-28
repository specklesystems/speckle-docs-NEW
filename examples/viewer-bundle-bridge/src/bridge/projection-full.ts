/**
 * Path 2 — full. Everything projection-viewer-compatibility.ts does, plus the
 * parts an app needs when it interacts with the data rather than only rendering it:
 *
 *   • instance and type-level properties, merged and nested
 *   • a solids preference (SOLID, rel 2) with the display mesh as the fallback
 *   • the complete-carriage floor: every object reaches the tree, geometry or not
 *   • the full appearance precedence (rels 26–29) and CENTERLINE (30) kept out of
 *     the render path
 *   • the model's reference point
 *
 * Same function names in the same order as the path 1 file, so a projection fix is
 * mechanical to apply twice. Use this one when your app reads properties, and path 1
 * when it only draws.
 */

import { IDENTITY, SpeckleType, type BaseObject } from './baseTypes.js'
import { parseTransform, type Bundle, type BundleNode } from './bundleReader.js'
import { NodeKind } from './bundleSpec.js'
import { mergeProperties } from './propertyTable.js'
import { newGeometryReport, sgeoToSpeckle, type GeometryReport } from './sgeoToSpeckle.js'

export interface ProjectionOptions {
  /**
   * Prefer a SOLID over the display mesh. Only turn this on when your app can read
   * the solid's format; the display mesh is what every consumer can draw.
   */
  preferSolids?: boolean
}

export interface ProjectionResult {
  root: BaseObject
  report: GeometryReport
}

export function projectBundle(bundle: Bundle, options: ProjectionOptions = {}): ProjectionResult {
  const report = newGeometryReport()
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
      placements.forEach((instanceKey, index) => {
        const instance = bundle.nodes.get(instanceKey)
        if (!instance) return
        const placementId = index === 0 ? appId : `${appId}-instance-${index}`
        elements.push(instanceProxy(placementId, instance))
      })
      continue
    }

    // Complete carriage: an object with no geometry is still an object with
    // properties, so it reaches the tree with an empty displayValue rather than
    // being dropped.
    elements.push(geometryObject(bundle, objectKey, appId, report, options))
  }

  attachMaterials(bundle, materials, root)
  attachColors(bundle, root)
  attachInstanceDefinitions(bundle, root, report)

  const referencePoint = referencePointTransform(bundle)
  if (referencePoint) root.referencePointTransform = referencePoint
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
        emissive: node.emissive ?? 0,
        ...(node.ior === undefined ? {} : { ior: node.ior })
      },
      objects: [] as string[]
    })
  }
  return proxies
}

/**
 * Material fills from specific to general: HAS_MATERIAL on the geometry, then
 * OBJECT_HAS_MATERIAL on the object, then NODE_HAS_MATERIAL on the object's
 * container. The first one found wins for that object.
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
 * Colour is presentational and follows the same specific-to-general order:
 * OBJECT_HAS_COLOR overrides HAS_COLOR on the geometry, and NODE_HAS_COLOR is the
 * container default.
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

    // DEFINES_MEMBER joins a definition to the carrier objects holding its
    // members' properties and grouping. Path 1 has no properties, so it has no use
    // for them; here they are what makes a placed instance inspectable.
    for (const objectKey of relations.definesMemberByDefinition.get(definitionKey) ?? []) {
      const appId = bundle.objectAppIds.get(objectKey)
      if (appId && !members.includes(appId)) members.push(appId)
    }

    for (const geometryKey of relations.definesByDefinition.get(definitionKey) ?? []) {
      const objectKey = relations.objectByGeometry.get(geometryKey)
      const appId = objectKey === undefined ? undefined : bundle.objectAppIds.get(objectKey)
      if (appId) {
        if (!members.includes(appId)) members.push(appId)
        continue
      }
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
        if (instance?.defRef !== undefined) {
          propagate(instance.defRef, d + 1, onStack)
        }
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
): BaseObject {
  const displays: BaseObject[] = []

  const solidKeys = options.preferSolids
    ? (bundle.relations.solidByObject.get(objectKey) ?? [])
    : []
  for (const geometryKey of solidKeys) {
    const geometry = bundle.geometries.get(geometryKey)
    if (!geometry) continue
    const decoded = sgeoToSpeckle(geometry.content, `${appId}-solid-${geometryKey}`, report)
    if (decoded) displays.push(decoded)
  }

  // Fall back to the display mesh whenever the solids preference produced nothing.
  if (!displays.length) {
    for (const edge of bundle.relations.displayByObject.get(objectKey) ?? []) {
      const geometry = bundle.geometries.get(edge.dst)
      if (!geometry) continue
      const decoded = sgeoToSpeckle(geometry.content, `${appId}-geo-${edge.dst}`, report)
      if (decoded) displays.push(decoded)
    }
  }

  const typeKey = bundle.typeIndexByObject.get(objectKey)
  const typeLevel = typeKey === undefined ? {} : bundle.typeProperties.nested(typeKey, 'properties')

  const object: BaseObject = {
    id: appId,
    applicationId: appId,
    speckle_type: SpeckleType.DataObject,
    name: bundle.properties.getString(objectKey, 'name') ?? appId,
    displayValue: displays,
    properties: mergeProperties(typeLevel, bundle.properties.nested(objectKey, 'properties'))
  }

  // The root scalars sit beside `properties.*`, not under it.
  const type = bundle.properties.getString(objectKey, 'type')
  if (type) object.type = type
  const units = bundle.properties.getString(objectKey, 'units')
  if (units) object.units = units

  // CENTERLINE (rel 30) is carried for the object but is never a body. Keep it
  // beside the display geometry so an app can draw it as a line if it wants to.
  const centerlines = bundle.relations.centerlineByObject.get(objectKey) ?? []
  if (centerlines.length) object.centerlineGeometryKeys = centerlines

  return object
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
