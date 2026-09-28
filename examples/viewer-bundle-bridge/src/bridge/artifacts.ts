/**
 * Step 1 and 2 of a bundle load: read the version record, then list and download
 * the version's artifacts. Both are documented endpoints — nothing here reaches
 * into viewer internals.
 */

export interface VersionRef {
  serverUrl: string
  projectId: string
  modelId: string
  versionId: string
}

export interface VersionRecord {
  id: string
  schemaVersion: number | null
  referencedObject: string | null
  sourceApplication: string | null
  message: string | null
}

export interface ArtifactFile {
  name: string
  url: string
  expiresAt?: string
}

/**
 * The tables this bridge reads to render. A bundle carries more — type-level
 * properties, model-scoped properties, scene views, and the `rel_types` and
 * `node_kinds` catalogs. This sample takes its vocabulary from the pinned copy of
 * the spec in bundleSpec.ts instead, and downloads nothing it does not read.
 */
export type BundleTable = 'objects' | 'paths' | 'eav' | 'nodes' | 'relations' | 'meta'

const TABLE_SUFFIX: Record<BundleTable, string> = {
  objects: '.eav.objects.parquet',
  paths: '.eav.paths.parquet',
  eav: '.eav.eav.parquet',
  nodes: '.envelope.nodes.parquet',
  relations: '.envelope.relations.parquet',
  meta: '.envelope.meta.parquet'
}

const GEOMETRY_SHARD = /\.geometries(\.\d+)?\.parquet$/

export interface DownloadedBundle {
  tables: Map<BundleTable, ArrayBuffer>
  geometryShards: ArrayBuffer[]
}

/**
 * An empty bearer is not the same as no bearer: the server answers `Bearer ` with
 * 403, so a public project fails for a reader who has not pasted a token. Send the
 * header only when there is something to send.
 */
function bearer(token?: string): Record<string, string> {
  return token ? { authorization: `Bearer ${token}` } : {}
}

const VERSION_QUERY = `
  query VersionShape($projectId: String!, $modelId: String!, $versionId: String!) {
    project(id: $projectId) {
      model(id: $modelId) {
        version(id: $versionId) {
          id
          schemaVersion
          referencedObject
          sourceApplication
          message
        }
      }
    }
  }
`

export async function fetchVersionRecord(ref: VersionRef, token?: string): Promise<VersionRecord> {
  const response = await fetch(new URL('/graphql', ref.serverUrl), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...bearer(token)
    },
    body: JSON.stringify({
      query: VERSION_QUERY,
      variables: {
        projectId: ref.projectId,
        modelId: ref.modelId,
        versionId: ref.versionId
      }
    })
  })
  if (!response.ok) {
    throw new Error(`version query failed: ${response.status} ${response.statusText}`)
  }
  const body = (await response.json()) as {
    errors?: { message: string }[]
    data?: { project?: { model?: { version?: VersionRecord | null } | null } | null }
  }
  if (body.errors?.length) throw new Error(body.errors.map((e) => e.message).join('; '))
  const version = body.data?.project?.model?.version
  if (!version) throw new Error('version not found')
  return version
}

/**
 * A bundle version carries `schemaVersion: 3` and a `bundle.` reference. Anything
 * else is an object graph from 2026.8 or earlier and belongs to the loader you
 * already have.
 */
export function isBundleVersion(version: VersionRecord): boolean {
  return version.schemaVersion === 3 && (version.referencedObject ?? '').startsWith('bundle.')
}

export async function listArtifacts(ref: VersionRef, token?: string): Promise<ArtifactFile[]> {
  const path = `/api/v2/projects/${ref.projectId}/models/${ref.modelId}/versions/${ref.versionId}/artifacts`
  const response = await fetch(new URL(path, ref.serverUrl), {
    headers: bearer(token)
  })
  if (!response.ok) {
    throw new Error(`artifacts listing failed: ${response.status} ${response.statusText}`)
  }
  const body = (await response.json()) as { files?: ArtifactFile[] }
  if (!body.files?.length) throw new Error('artifacts listing returned no files')
  return body.files
}

/**
 * The same listing shape for a bundle directory you already have on disk and are
 * serving over HTTP, so the load path can be exercised without a server. The
 * directory needs a `files.json` holding an array of its file names.
 */
export async function listLocalBundle(baseUrl: string): Promise<ArtifactFile[]> {
  // Resolve against the document so a relative path like `/bundle` works too.
  const base = new URL(
    baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`,
    typeof window === 'undefined' ? undefined : window.location.href
  )
  const response = await fetch(new URL('files.json', base))
  if (!response.ok) {
    throw new Error(`no files.json at ${base.toString()}: ${response.status}`)
  }
  const names = (await response.json()) as string[]
  return names.map((name) => ({ name, url: new URL(name, base).toString() }))
}

/**
 * Presigned URLs take no Authorization header, and sending one makes some object
 * stores reject the request.
 */
async function download(file: ArtifactFile): Promise<ArrayBuffer> {
  const response = await fetch(file.url)
  if (!response.ok) {
    throw new Error(`download failed for ${file.name}: ${response.status}`)
  }
  return await response.arrayBuffer()
}

export async function downloadBundle(
  files: ArtifactFile[],
  options: { includeGeometry?: boolean } = {}
): Promise<DownloadedBundle> {
  const includeGeometry = options.includeGeometry ?? true
  const wanted: { table: BundleTable; file: ArtifactFile }[] = []
  const shardFiles: ArtifactFile[] = []

  for (const file of files) {
    if (GEOMETRY_SHARD.test(file.name)) {
      if (includeGeometry) shardFiles.push(file)
      continue
    }
    // Match the end of the name, never a stem built from the version id: a Revit
    // upload lists as `acme-b-zz-m3-wa-ar.rvt.envelope.nodes.parquet`, and only the
    // viewer's own artifacts are named after the version.
    for (const [table, suffix] of Object.entries(TABLE_SUFFIX)) {
      if (file.name.endsWith(suffix)) wanted.push({ table: table as BundleTable, file })
    }
  }

  // Every shard, not just shard zero: a reader that stops at zero silently drops
  // geometry above the shard cap.
  shardFiles.sort((a, b) => a.name.localeCompare(b.name))

  const tables = new Map<BundleTable, ArrayBuffer>()
  await Promise.all(
    wanted.map(async ({ table, file }) => {
      tables.set(table, await download(file))
    })
  )
  const geometryShards = await Promise.all(shardFiles.map(download))

  return { tables, geometryShards }
}
