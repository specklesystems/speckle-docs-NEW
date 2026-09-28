import { ObjectLoader2Factory, type ObjectLoader2 } from '@speckle/objectloader2'
import { SpeckleLoader, type WorldTree } from '@speckle/viewer'
import {
  downloadBundle,
  fetchVersionRecord,
  isBundleVersion,
  listArtifacts,
  type ArtifactFile,
  type VersionRef
} from './artifacts.js'
import type { BaseObject } from './baseTypes.js'
import { readBundle } from './bundleReader.js'
import type { GeometryReport } from './sgeoToSpeckle.js'

/**
 * A loader for an already-projected bundle. Everything asynchronous happens before
 * construction, so the only thing the override does is hand the objects to
 * `ObjectLoader2Factory` instead of to the objects endpoints. The base class passes
 * `resourceData` straight through to `initObjectLoader`, which is how the root
 * reaches it before any subclass field exists — the same route
 * `SpeckleOfflineLoader` uses.
 *
 * Everything downstream — extensions, filtering, selection, camera — is untouched
 * public viewer API.
 */
export class BundleLoader extends SpeckleLoader {
  constructor(targetTree: WorldTree, resource: string, root: BaseObject) {
    super(targetTree, resource, undefined, undefined, root)
  }

  protected initObjectLoader(
    _resource: string,
    _authToken?: string,
    _enableCaching?: boolean,
    resourceData?: unknown
  ): ObjectLoader2 {
    const root = resourceData as BaseObject | undefined
    if (!root) throw new Error('BundleLoader was constructed without a projected root')
    return ObjectLoader2Factory.createFromObjects([root])
  }
}

export interface LoadedBundle {
  loader: BundleLoader
  report: GeometryReport
  /** Relation ids the reader did not know. Report them; never fail on them. */
  unknownRelations: number[]
}

export type Projector<TOptions> = (
  bundle: Awaited<ReturnType<typeof readBundle>>,
  options?: TOptions
) => { root: BaseObject; report: GeometryReport }

/**
 * The whole load, end to end: version record, artifacts, parquet, projection,
 * loader. Pass whichever projection you dropped in.
 */
export async function loadBundleVersion<TOptions>(params: {
  tree: WorldTree
  ref: VersionRef
  token: string
  project: Projector<TOptions>
  projectionOptions?: TOptions
  includeGeometry?: boolean
}): Promise<LoadedBundle> {
  const { tree, ref, token, project } = params

  const version = await fetchVersionRecord(ref, token)
  if (!isBundleVersion(version)) {
    throw new Error(
      `version ${version.id} is not a bundle (schemaVersion ${String(version.schemaVersion)}); use your existing loader`
    )
  }

  const files = await listArtifacts(ref, token)
  const resource = `${ref.serverUrl}/projects/${ref.projectId}/models/${ref.modelId}@${ref.versionId}`
  return await loadBundleFiles({ ...params, files, resource })
}

/**
 * The half of the load that starts from an artifact listing: parquet, projection,
 * loader. Split out so a bundle you already have — downloaded, or served from disk
 * through `listLocalBundle` — takes the same path a live version does.
 */
export async function loadBundleFiles<TOptions>(params: {
  tree: WorldTree
  files: ArtifactFile[]
  resource: string
  project: Projector<TOptions>
  projectionOptions?: TOptions
  includeGeometry?: boolean
}): Promise<LoadedBundle> {
  const downloaded = await downloadBundle(params.files, {
    includeGeometry: params.includeGeometry ?? true
  })
  const bundle = await readBundle(downloaded)
  const { root, report } = params.project(bundle, params.projectionOptions)

  return {
    loader: new BundleLoader(params.tree, params.resource, root),
    report,
    unknownRelations: [...bundle.relations.unknownRels]
  }
}
