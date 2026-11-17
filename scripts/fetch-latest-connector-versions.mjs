#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const FEED_BASE_URL = 'https://releases.speckle.dev/manager2/feeds'

export const CONNECTOR_FEEDS = [
  { id: 'revit', products: ['Revit'] },
  { id: 'rhino', products: ['Rhino', 'Grasshopper'], macos: true },
  { id: 'autocad', products: ['AutoCAD'] },
  { id: 'civil3d', products: ['Civil 3D'] },
  { id: 'plant3d', products: ['Plant 3D'] },
  { id: 'sketchup', products: ['SketchUp'], macos: true },
  { id: 'archicad', products: ['Archicad'] },
  { id: 'teklastructures', products: ['Tekla Structures'] },
  { id: 'etabs', products: ['ETABS'] },
  { id: 'powerbi', products: ['Power BI'] },
  { id: 'blender', products: ['Blender'], macos: true },
  { id: 'tsd', products: ['Tekla Structural Designer'] },
  { id: 'navisworks', products: ['Navisworks'] },
  { id: 'desktop-services', products: ['Desktop Services'] }
]

function feedUrl(id, macos = false) {
  return `${FEED_BASE_URL}/${id}${macos ? '-mac' : ''}-v3.json`
}

function normalizeVersion(version) {
  return version.startsWith('v') ? version.slice(1) : version
}

function versionParts(version) {
  const core = normalizeVersion(version).split(/[+-]/, 1)[0]
  if (!/^\d+(?:\.\d+)+$/.test(core)) {
    throw new Error(`Unsupported release version: ${version}`)
  }
  return core.split('.').map(Number)
}

export function compareVersions(left, right) {
  const a = versionParts(left)
  const b = versionParts(right)
  const length = Math.max(a.length, b.length)

  for (let index = 0; index < length; index += 1) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0)
    if (difference !== 0) return difference
  }
  return 0
}

function isOptionalString(value) {
  return value === null || value === undefined || typeof value === 'string'
}

function validateRelease(release, source) {
  if (
    !release ||
    typeof release.Number !== 'string' ||
    typeof release.Date !== 'string' ||
    typeof release.Prerelease !== 'boolean' ||
    !isOptionalString(release.Url) ||
    !isOptionalString(release.BuildArtifact)
  ) {
    throw new Error(`Invalid release in ${source}`)
  }

  if (Number.isNaN(Date.parse(release.Date))) {
    throw new Error(`Invalid release date in ${source}: ${release.Date}`)
  }

  versionParts(release.Number)
}

export function selectLatestStable(feed, source = 'release feed', downloadField = 'Url') {
  if (!feed || !Array.isArray(feed.Versions)) {
    throw new Error(`Invalid release feed: ${source}`)
  }

  for (const release of feed.Versions) validateRelease(release, source)

  const stable = feed.Versions.filter(
    (release) =>
      !release.Prerelease &&
      typeof release[downloadField] === 'string' &&
      release[downloadField].length > 0
  )
  if (stable.length === 0) {
    throw new Error(`No stable releases with ${downloadField} in ${source}`)
  }

  return stable.reduce((latest, release) =>
    compareVersions(release.Number, latest.Number) > 0 ? release : latest
  )
}

function createArtifact(release, sourceUrl, platform, format, downloadField) {
  return {
    platform,
    format,
    version: normalizeVersion(release.Number),
    releasedAt: new Date(release.Date).toISOString(),
    downloadUrl: release[downloadField],
    sourceUrl
  }
}

async function fetchFeed(id, fetchImpl, macos = false) {
  const source = feedUrl(id, macos)
  const response = await fetchImpl(source, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(15_000)
  })

  if (!response.ok) {
    throw new Error(`Could not fetch ${source}: HTTP ${response.status}`)
  }

  return { source, feed: await response.json() }
}

export async function createConnectorVersionSnapshot({
  fetchImpl = fetch,
  now = () => new Date(),
  connectors = CONNECTOR_FEEDS
} = {}) {
  const releases = await Promise.all(
    connectors.map(async ({ id, products, macos = false }) => {
      const { source, feed } = await fetchFeed(id, fetchImpl)
      const executable = selectLatestStable(feed, source, 'Url')
      const zip = selectLatestStable(feed, source, 'BuildArtifact')
      const artifacts = [
        createArtifact(executable, source, 'windows', 'exe', 'Url'),
        createArtifact(zip, source, 'windows', 'zip', 'BuildArtifact')
      ]

      if (macos) {
        const { source: macSource, feed: macFeed } = await fetchFeed(id, fetchImpl, true)
        const pkg = selectLatestStable(macFeed, macSource, 'Url')
        artifacts.push(createArtifact(pkg, macSource, 'macos', 'pkg', 'Url'))
      }

      return {
        id,
        products,
        artifacts
      }
    })
  )

  return {
    schemaVersion: 2,
    generatedAt: now().toISOString(),
    releases
  }
}

function parseOutputPath(args) {
  const outputIndex = args.indexOf('--output')
  if (outputIndex === -1) return null

  const outputPath = args[outputIndex + 1]
  if (!outputPath || outputPath.startsWith('--')) {
    throw new Error('--output requires a file path')
  }
  return outputPath
}

async function main(args = process.argv.slice(2)) {
  const outputPath = parseOutputPath(args)
  const snapshot = await createConnectorVersionSnapshot()
  const json = `${JSON.stringify(snapshot, null, 2)}\n`

  if (outputPath) {
    await fs.writeFile(path.resolve(outputPath), json, 'utf8')
    return
  }

  process.stdout.write(json)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
}
