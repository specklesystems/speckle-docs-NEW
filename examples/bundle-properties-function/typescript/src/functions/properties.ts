import { app, type HttpRequest, type HttpResponseInit } from '@azure/functions'
import { MissingBundleFileError, versionProperties, type ArtifactFile } from '../properties.js'

const SPECKLE_URL = process.env.SPECKLE_URL ?? 'https://app.speckle.systems'

type PropertiesRequest = { projectId: string; modelId: string; versionId: string }

app.http('properties', {
  methods: ['POST'],
  authLevel: 'function',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    const { projectId, modelId, versionId } = (await req.json()) as PropertiesRequest
    const response = await fetch(
      `${SPECKLE_URL}/api/v2/projects/${projectId}/models/${modelId}/versions/${versionId}/artifacts`,
      { headers: { Authorization: `Bearer ${process.env.SPECKLE_TOKEN}` } }
    )
    if (!response.ok) return { status: response.status, body: await response.text() }
    const { files } = (await response.json()) as { files: ArtifactFile[] }

    try {
      return { jsonBody: await versionProperties(files) }
    } catch (err) {
      if (err instanceof MissingBundleFileError) return { status: 404, body: err.message }
      throw err
    }
  }
})
