import { timingSafeEqual } from 'node:crypto'
import { MissingBundleFileError, versionProperties, type ArtifactFile } from './properties.js'

// Outside /tmp a Lambda's file system is read-only, and DuckDB installs its httpfs
// extension under HOME.
process.env.HOME = '/tmp'

const SPECKLE_URL = process.env.SPECKLE_URL ?? 'https://app.speckle.systems'

/** The fields of a Lambda function URL event that the handler reads. */
export type FunctionUrlEvent = {
  headers?: Record<string, string | undefined>
  body?: string
  isBase64Encoded?: boolean
}

type PropertiesRequest = { projectId: string; modelId: string; versionId: string }

const respond = (statusCode: number, body: string, contentType = 'text/plain') => ({
  statusCode,
  headers: { 'Content-Type': contentType },
  body
})

const keyMatches = (given: string, expected: string) => {
  const a = Buffer.from(given)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

export const handler = async (event: FunctionUrlEvent) => {
  // A function URL with auth type NONE is public, so callers must send the shared key.
  const expected = process.env.FUNCTION_KEY
  if (!expected) return respond(500, 'FUNCTION_KEY is not set')
  if (!keyMatches(event.headers?.['x-api-key'] ?? '', expected)) {
    return respond(401, 'Missing or wrong x-api-key header')
  }

  const raw = event.isBase64Encoded
    ? Buffer.from(event.body ?? '', 'base64').toString()
    : (event.body ?? '{}')
  const { projectId, modelId, versionId } = JSON.parse(raw) as PropertiesRequest

  const response = await fetch(
    `${SPECKLE_URL}/api/v2/projects/${projectId}/models/${modelId}/versions/${versionId}/artifacts`,
    { headers: { Authorization: `Bearer ${process.env.SPECKLE_TOKEN}` } }
  )
  if (!response.ok) return respond(response.status, await response.text())
  const { files } = (await response.json()) as { files: ArtifactFile[] }

  try {
    return respond(200, JSON.stringify(await versionProperties(files)), 'application/json')
  } catch (err) {
    if (err instanceof MissingBundleFileError) return respond(404, err.message)
    throw err
  }
}
