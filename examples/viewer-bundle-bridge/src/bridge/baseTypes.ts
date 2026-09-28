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

export const SpeckleType = {
  Collection: 'Speckle.Core.Models.Collections.Collection',
  DataObject: 'Objects.Data.DataObject',
  RenderMaterial: 'Objects.Other.RenderMaterial',
  RenderMaterialProxy: 'Objects.Other.RenderMaterialProxy',
  ColorProxy: 'Speckle.Core.Models.Proxies.ColorProxy',
  InstanceProxy: 'Speckle.Core.Models.Instances.InstanceProxy',
  InstanceDefinitionProxy: 'Speckle.Core.Models.Instances.InstanceDefinitionProxy'
} as const

export const IDENTITY: number[] = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]

/** Backstop next to the per-path cycle guard when definitions nest definitions. */
export const MAX_INSTANCE_DEPTH = 64
