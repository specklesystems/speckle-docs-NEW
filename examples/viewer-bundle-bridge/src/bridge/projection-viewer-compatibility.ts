/**
 * Path 1 — viewer compatibility. Projects a bundle onto the object shape the
 * published viewer already converts: a Collection root, one object per
 * `applicationId` carrying its display geometry, instance and material and colour
 * proxies. Objects carry `applicationId` and a name, and no properties.
 *
 * Relations read: DISPLAY (1), DEFINES (4), HAS_MATERIAL (5), HAS_COLOR (6),
 * DISPLAY_INSTANCE (8), DEFINES_INSTANCE (9), IN_COLLECTION (10). Everything else
 * in the bundle is carried but not read — see projection-full.ts, which is this
 * file plus properties, solids and the complete-carriage floor. The two are kept
 * function-for-function alignable on purpose: a fix here applies there mechanically.
 */

import { IDENTITY, SpeckleType, type BaseObject } from './baseTypes.js'
import { parseTransform, type Bundle, type BundleNode } from './bundleReader.js'
import { NodeKind } from './bundleSpec.js'
import { newGeometryReport, sgeoToSpeckle, type GeometryReport } from './sgeoToSpeckle.js'

export interface ProjectionResult {
  root: BaseObject
  report: GeometryReport
}

export function projectBundle(bundle: Bundle): ProjectionResult {
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
      // A placed object is drawn by its definition, not by its own geometry.
      placements.forEach((instanceKey, index) => {
        const instance = bundle.nodes.get(instanceKey)
        if (!instance) return
        const placementId = index === 0 ? appId : `${appId}-instance-${index}`
        elements.push(instanceProxy(placementId, instance))
      })
      continue
    }

    const object = geometryObject(bundle, objectKey, appId, report)
    if (object) elements.push(object)
  }

  attachMaterials(bundle, materials, root)
  attachColors(bundle, root)
  attachInstanceDefinitions(bundle, root, report)

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

function attachMaterials(
  bundle: Bundle,
  materials: Map<number, BaseObject>,
  root: BaseObject
): void {
  for (const [geometryKey, materialKey] of bundle.relations.materialByGeometry) {
    const proxy = materials.get(materialKey)
    const objectKey = bundle.relations.objectByGeometry.get(geometryKey)
    const appId = objectKey === undefined ? undefined : bundle.objectAppIds.get(objectKey)
    if (!proxy || !appId) continue
    const targets = proxy.objects as string[]
    if (!targets.includes(appId)) targets.push(appId)
  }
  const used = [...materials.values()].filter((p) => (p.objects as string[]).length > 0)
  if (used.length) root.renderMaterialProxies = used
}

function attachColors(bundle: Bundle, root: BaseObject): void {
  const targetsByColor = new Map<number, string[]>()
  for (const [geometryKey, colorKey] of bundle.relations.colorByGeometry) {
    const objectKey = bundle.relations.objectByGeometry.get(geometryKey)
    const appId = objectKey === undefined ? undefined : bundle.objectAppIds.get(objectKey)
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
  report: GeometryReport
): BaseObject | undefined {
  const displays: BaseObject[] = []
  for (const edge of bundle.relations.displayByObject.get(objectKey) ?? []) {
    const geometry = bundle.geometries.get(edge.dst)
    if (!geometry) continue
    const decoded = sgeoToSpeckle(geometry.content, `${appId}-geo-${edge.dst}`, report)
    if (decoded) displays.push(decoded)
  }
  if (!displays.length) return undefined

  return {
    id: appId,
    applicationId: appId,
    speckle_type: SpeckleType.DataObject,
    name: bundle.properties.getString(objectKey, 'name') ?? appId,
    displayValue: displays,
    properties: {}
  }
}
