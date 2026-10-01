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
  ExplodeExtension,
  SelectionExtension,
  SpeckleLoader,
  Viewer,
  type TreeNode
} from '@speckle/viewer'
import {
  fetchVersionRecord,
  isBundleVersion,
  listLocalBundle,
  type VersionRef
} from './bridge/artifacts.js'
import { loadBundleFiles, loadBundleVersion } from './bridge/bundleLoader.js'
import type { ProjectionOptions } from './bridge/projection.js'
import { BoxSelectExtension } from './extensions/boxSelect.js'
import { PropertiesHudExtension } from './extensions/propertiesHud.js'

// The HUD reads properties, so the projection has to carry them. An app that only
// draws leaves this off and never pays for the eav tables.
const PROJECTION: ProjectionOptions = { properties: true, referencePoint: true }

const container = document.getElementById('viewer') as HTMLDivElement
const form = document.getElementById('load-form') as HTMLFormElement
const status = document.getElementById('status') as HTMLPreElement
const explode = document.getElementById('explode') as HTMLInputElement
const boxToggle = document.getElementById('box-select') as HTMLInputElement

function say(message: string): void {
  status.textContent = `${status.textContent ?? ''}${message}\n`
}

// Attached before the viewer finishes initialising: a click made during startup is
// handled here and waits, rather than submitting the form natively and reloading
// the page.
form.addEventListener('submit', (event) => {
  event.preventDefault()
  load().catch((error: unknown) => say(`error: ${(error as Error).message}`))
})

const viewer = new Viewer(container, { ...DefaultViewerParams, verbose: false })
let hud: PropertiesHudExtension | undefined

const ready = viewer.init().then(() => {
  viewer.createExtension(CameraController)
  viewer.createExtension(SelectionExtension)

  // Neither of these is used by the Speckle web app: one ships with the viewer, one
  // is written here. Both work on bundle data, which is the claim worth testing.
  const exploder = viewer.createExtension(ExplodeExtension)
  const boxSelect = viewer.createExtension(BoxSelectExtension)
  // Injects the two above and listens to them itself; the app only feeds it a bundle.
  hud = viewer.createExtension(PropertiesHudExtension)

  boxSelect.reportSelectionTo((ids) =>
    say(ids.length ? `box selected: ${ids.length} objects` : 'box selected: nothing')
  )
  explode.addEventListener('input', () => exploder.setExplode(Number(explode.value)))
  boxToggle.addEventListener('change', () => {
    boxSelect.enabled = boxToggle.checked
    say(boxToggle.checked ? 'box select on — drag to select' : 'box select off')
  })
})

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

/** What actually arrived. Render views hang off nested geometry nodes, not atomic ones. */
function reportTree(): void {
  let nodes = 0
  let objects = 0
  let withGeometry = 0
  viewer.getWorldTree().walk((node: TreeNode) => {
    nodes++
    if (node.model.renderView) withGeometry++
    if (node.model.atomic) objects++
    return true
  })
  say(`tree: ${nodes} nodes, ${objects} objects, ${withGeometry} with geometry`)
}

async function loadLocal(bundleUrl: string): Promise<void> {
  say(`local bundle at ${bundleUrl}`)
  const files = await listLocalBundle(bundleUrl)
  const { loader, report, unknownRelations, bundle } = await loadBundleFiles({
    tree: viewer.getWorldTree(),
    files,
    resource: bundleUrl,
    projection: PROJECTION
  })
  await viewer.loadObject(loader, true)
  hud?.attach(bundle)
  reportBundle(report, unknownRelations)
  reportTree()
  say('done')
}

async function load(): Promise<void> {
  status.textContent = ''
  hud?.clear()
  await ready
  // Loading again otherwise adds a second copy of the model to the same tree.
  await viewer.unloadAll()

  const bundleUrl = new URLSearchParams(window.location.search).get('bundle')
  if (bundleUrl) return await loadLocal(bundleUrl)

  const { ref, token } = readForm()
  if (!token) say('no token — requesting anonymously, which only reads public projects')

  // A blank token is a real choice, not a missing one, so the failure has to say
  // which it was: an anonymous lookup of a private project returns no project at
  // all, which otherwise reads as a mistyped id.
  const version = await fetchVersionRecord(ref, token).catch((error: unknown) => {
    const message = (error as Error).message
    throw token ? error : new Error(`${message} — private projects need a personal access token`)
  })
  say(`version ${version.id} · schemaVersion ${String(version.schemaVersion)}`)

  if (!isBundleVersion(version)) {
    say('object graph — loading through SpeckleLoader')
    const objectUrl = `${ref.serverUrl}/streams/${ref.projectId}/objects/${version.referencedObject ?? ''}`
    const loader = new SpeckleLoader(viewer.getWorldTree(), objectUrl, token)
    await viewer.loadObject(loader, true)
    reportTree()
    say('done')
    return
  }

  say('bundle — loading through the bridge')
  const { loader, report, unknownRelations, bundle } = await loadBundleVersion({
    tree: viewer.getWorldTree(),
    ref,
    token,
    projection: PROJECTION
  })
  await viewer.loadObject(loader, true)
  hud?.attach(bundle)
  reportBundle(report, unknownRelations)
  reportTree()
  say('done')
}
