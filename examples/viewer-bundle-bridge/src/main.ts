/**
 * A mini viewer app that loads either shape of version: a 2026.9 bundle through the
 * bridge, or an object graph from 2026.8 and earlier through the loader you already
 * have. The dispatch is the whole point — see `load()`.
 *
 * `?bundle=<url>` loads a bundle directory served over HTTP instead of a live
 * version, for trying the render path against a bundle you already have.
 */

import {
  CameraController,
  DefaultViewerParams,
  SelectionExtension,
  SpeckleLoader,
  Viewer
} from '@speckle/viewer'
import {
  fetchVersionRecord,
  isBundleVersion,
  listLocalBundle,
  type VersionRef
} from './bridge/artifacts.js'
import { loadBundleFiles, loadBundleVersion } from './bridge/bundleLoader.js'
import { ApplicationIdAuditExtension } from './applicationIdAudit.js'

// Swap this import for './bridge/projection-full.js' when your app reads properties.
import { projectBundle } from './bridge/projection-viewer-compatibility.js'

const container = document.getElementById('viewer') as HTMLDivElement
const form = document.getElementById('load-form') as HTMLFormElement
const status = document.getElementById('status') as HTMLPreElement

const viewer = new Viewer(container, { ...DefaultViewerParams, verbose: false })
await viewer.init()
viewer.createExtension(CameraController)
viewer.createExtension(SelectionExtension)

// An ordinary custom extension, created the same way as the built-in ones.
const audit = viewer.createExtension(ApplicationIdAuditExtension)

function say(message: string): void {
  status.textContent = `${status.textContent ?? ''}${message}\n`
}

audit.reportSelectionTo((ids) => say(`selected: ${ids}`))

function readForm(): { ref: VersionRef; token: string } {
  const data = new FormData(form)
  const value = (name: string) => String(data.get(name) ?? '').trim()
  return {
    ref: {
      serverUrl: value('serverUrl'),
      projectId: value('projectId'),
      modelId: value('modelId'),
      versionId: value('versionId')
    },
    token: value('token')
  }
}

function reportBundle(report: { skipped: Map<string, number> }, unknown: number[]): void {
  for (const [kind, count] of report.skipped) {
    say(`skipped ${count} × ${kind}`)
  }
  if (unknown.length) say(`unknown relation ids: ${unknown.join(', ')}`)
}

function reportAudit(): void {
  const { nodes, objects, withGeometry, sampleIds } = audit.audit()
  say(`tree: ${nodes} nodes, ${objects} objects, ${withGeometry} with geometry`)
  if (sampleIds.length) say(`applicationIds: ${sampleIds.join(', ')}`)
}

async function loadLocal(bundleUrl: string): Promise<void> {
  say(`local bundle at ${bundleUrl}`)
  const files = await listLocalBundle(bundleUrl)
  const { loader, report, unknownRelations } = await loadBundleFiles({
    tree: viewer.getWorldTree(),
    files,
    resource: bundleUrl,
    project: projectBundle
  })
  await viewer.loadObject(loader, true)
  reportBundle(report, unknownRelations)
  reportAudit()
  say('done')
}

async function load(): Promise<void> {
  status.textContent = ''

  const bundleUrl = new URLSearchParams(window.location.search).get('bundle')
  if (bundleUrl) return await loadLocal(bundleUrl)

  const { ref, token } = readForm()
  const version = await fetchVersionRecord(ref, token)
  say(`version ${version.id} · schemaVersion ${String(version.schemaVersion)}`)

  if (!isBundleVersion(version)) {
    say('object graph — loading through SpeckleLoader')
    const objectUrl = `${ref.serverUrl}/streams/${ref.projectId}/objects/${version.referencedObject ?? ''}`
    const loader = new SpeckleLoader(viewer.getWorldTree(), objectUrl, token)
    await viewer.loadObject(loader, true)
    reportAudit()
    say('done')
    return
  }

  say('bundle — loading through the bridge')
  const { loader, report, unknownRelations } = await loadBundleVersion({
    tree: viewer.getWorldTree(),
    ref,
    token,
    project: projectBundle
  })
  await viewer.loadObject(loader, true)
  reportBundle(report, unknownRelations)
  reportAudit()
  say('done')
}

form.addEventListener('submit', (event) => {
  event.preventDefault()
  load().catch((error: unknown) => say(`error: ${(error as Error).message}`))
})
