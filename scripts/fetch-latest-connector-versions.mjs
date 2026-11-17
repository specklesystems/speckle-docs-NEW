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

function markdownTable(headers, rows) {
  const widths = headers.map((header, index) =>
    Math.max(header.length, 3, ...rows.map((row) => row[index].length))
  )
  const line = (cells) =>
    `| ${cells.map((cell, index) => cell.padEnd(widths[index])).join(' | ')} |`

  return [line(headers), line(widths.map((width) => '-'.repeat(width))), ...rows.map(line)].join(
    '\n'
  )
}

function artifactLink(release, format) {
  const artifact = release.artifacts.find((candidate) => candidate.format === format)
  return artifact ? `[${artifact.version}](${artifact.downloadUrl})` : '—'
}

export function renderConnectorVersionsPage(snapshot) {
  const checkedAt = new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'UTC',
    hour12: false
  }).format(new Date(snapshot.generatedAt))
  const rows = snapshot.releases.map((release) => [
    release.products.join(' and '),
    artifactLink(release, 'exe'),
    artifactLink(release, 'zip'),
    artifactLink(release, 'pkg')
  ])
  const table = markdownTable(['Connector', 'Windows EXE', 'Windows ZIP', 'macOS PKG'], rows)

  return `---
title: Check the latest connector versions
description: Current stable Speckle connector versions for Windows EXE, Windows ZIP and macOS PKG installers.
---

{/* Generated by pnpm versions:connectors:page. Do not edit the version table manually. */}

Use this page to check whether an installed Speckle connector is current. The versions below come
from the same release feeds as [Speckle Releases](https://releases.speckle.systems/) and exclude
prereleases. The feeds were checked on ${checkedAt} UTC.

<Note>
  This page is intentionally absent from the documentation navigation. Bookmark or share its direct
  link when you need to check a connector version.
</Note>

## Choose the installer format

Use the EXE for a standard Windows installation. Use the ZIP for manual or centrally managed
Windows installation. PKG installers are listed only where a separate macOS feed exists.

${table}
`
}

function parseCliOptions(args) {
  const options = { format: 'json', outputPath: null }

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (argument !== '--format' && argument !== '--output') {
      throw new Error(`Unknown argument: ${argument}`)
    }

    const value = args[index + 1]
    if (!value || value.startsWith('--')) {
      throw new Error(`${argument} requires a value`)
    }
    index += 1

    if (argument === '--format') options.format = value
    if (argument === '--output') options.outputPath = value
  }

  if (!['json', 'mdx'].includes(options.format)) {
    throw new Error(`Unsupported output format: ${options.format}`)
  }
  return options
}

export async function runCli(
  args = process.argv.slice(2),
  {
    createSnapshot = createConnectorVersionSnapshot,
    writeFile = fs.writeFile,
    stdout = process.stdout
  } = {}
) {
  const { format, outputPath } = parseCliOptions(args)
  const snapshot = await createSnapshot()
  const output =
    format === 'mdx'
      ? renderConnectorVersionsPage(snapshot)
      : `${JSON.stringify(snapshot, null, 2)}\n`

  if (outputPath) {
    await writeFile(path.resolve(outputPath), output, 'utf8')
  } else {
    stdout.write(output)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli().catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
}
