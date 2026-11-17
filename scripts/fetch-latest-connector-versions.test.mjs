import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CONNECTOR_FEEDS,
  compareVersions,
  createConnectorVersionSnapshot,
  selectLatestStable
} from './fetch-latest-connector-versions.mjs'

function release(
  Number,
  {
    prerelease = false,
    date = '2026-01-01T00:00:00Z',
    url = `https://example.test/${Number}.exe`,
    buildArtifact = `https://example.test/${Number}.zip`
  } = {}
) {
  return {
    Number,
    Url: url,
    BuildArtifact: buildArtifact,
    Date: date,
    Prerelease: prerelease
  }
}

test('compares the version grammar used by the release feeds numerically', () => {
  assert.ok(compareVersions('2026.10.0', '2026.9.10') > 0)
  assert.ok(compareVersions('2026.9.1', '3.24.1') > 0)
  assert.equal(compareVersions('2026.9.1+4', '2026.9.1'), 0)
  assert.equal(compareVersions('v3.1.0-alpha.1', '3.1.0'), 0)
  assert.equal(compareVersions('3.1', '3.1.0'), 0)
  assert.ok(compareVersions('3.1.1', '3.1') > 0)
  assert.throws(() => compareVersions('2026', '2026.9.1'), /Unsupported release version/)
  assert.throws(() => compareVersions('latest', '2026.9.1'), /Unsupported release version/)
})

test('mirrors the public page inventory of 14 feeds and 15 product names', () => {
  assert.deepEqual(CONNECTOR_FEEDS, [
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
  ])
  assert.equal(new Set(CONNECTOR_FEEDS.map(({ id }) => id)).size, CONNECTOR_FEEDS.length)
  assert.equal(CONNECTOR_FEEDS.flatMap(({ products }) => products).length, 15)
  assert.deepEqual(
    CONNECTOR_FEEDS.filter(({ macos }) => macos).map(({ id }) => id),
    ['rhino', 'sketchup', 'blender']
  )
})

test('selects the latest stable release that provides the requested artifact', () => {
  const feed = {
    Versions: [
      release('2026.9.2'),
      release('2026.9.6', { buildArtifact: null }),
      release('2026.10.0-beta.1', {
        prerelease: true,
        date: '2026-11-01T00:00:00Z'
      })
    ]
  }

  assert.equal(selectLatestStable(feed, 'test feed', 'Url').Number, '2026.9.6')
  assert.equal(selectLatestStable(feed, 'test feed', 'BuildArtifact').Number, '2026.9.2')
})

test('rejects malformed feeds and channels without a stable artifact', () => {
  assert.throws(() => selectLatestStable({}), /Invalid release feed/)
  assert.throws(
    () => selectLatestStable({ Versions: [release('2026.9.1', { url: 42 })] }),
    /Invalid release/
  )
  assert.throws(
    () =>
      selectLatestStable(
        { Versions: [release('2026.10.0-beta.1', { prerelease: true })] },
        'test feed',
        'Url'
      ),
    /No stable releases with Url/
  )
})

test('creates independent Windows EXE, Windows ZIP, and macOS PKG artifacts', async () => {
  const feeds = new Map([
    [
      'https://releases.speckle.dev/manager2/feeds/rhino-v3.json',
      {
        Versions: [
          release('2026.9.5', { date: '2026-11-10T16:00:00Z' }),
          release('2026.9.6', {
            date: '2026-11-12T16:23:22Z',
            buildArtifact: null
          })
        ]
      }
    ],
    [
      'https://releases.speckle.dev/manager2/feeds/rhino-mac-v3.json',
      {
        Versions: [
          release('2026.9.4', {
            date: '2026-11-09T12:00:00Z',
            url: 'https://example.test/rhino-2026.9.4.pkg',
            buildArtifact: null
          })
        ]
      }
    ]
  ])
  const fetchImpl = async (url) => ({
    ok: feeds.has(url),
    status: feeds.has(url) ? 200 : 404,
    json: async () => feeds.get(url)
  })

  const snapshot = await createConnectorVersionSnapshot({
    fetchImpl,
    now: () => new Date('2026-11-17T17:30:00Z'),
    connectors: [{ id: 'rhino', products: ['Rhino', 'Grasshopper'], macos: true }]
  })

  assert.deepEqual(snapshot, {
    schemaVersion: 2,
    generatedAt: '2026-11-17T17:30:00.000Z',
    releases: [
      {
        id: 'rhino',
        products: ['Rhino', 'Grasshopper'],
        artifacts: [
          {
            platform: 'windows',
            format: 'exe',
            version: '2026.9.6',
            releasedAt: '2026-11-12T16:23:22.000Z',
            downloadUrl: 'https://example.test/2026.9.6.exe',
            sourceUrl: 'https://releases.speckle.dev/manager2/feeds/rhino-v3.json'
          },
          {
            platform: 'windows',
            format: 'zip',
            version: '2026.9.5',
            releasedAt: '2026-11-10T16:00:00.000Z',
            downloadUrl: 'https://example.test/2026.9.5.zip',
            sourceUrl: 'https://releases.speckle.dev/manager2/feeds/rhino-v3.json'
          },
          {
            platform: 'macos',
            format: 'pkg',
            version: '2026.9.4',
            releasedAt: '2026-11-09T12:00:00.000Z',
            downloadUrl: 'https://example.test/rhino-2026.9.4.pkg',
            sourceUrl: 'https://releases.speckle.dev/manager2/feeds/rhino-mac-v3.json'
          }
        ]
      }
    ]
  })
})

test('normalizes a leading v in every emitted artifact version', async () => {
  const fetchImpl = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ Versions: [release('v3.1.0')] })
  })

  const snapshot = await createConnectorVersionSnapshot({
    fetchImpl,
    connectors: [{ id: 'powerbi', products: ['Power BI'] }]
  })

  assert.deepEqual(
    snapshot.releases[0].artifacts.map(({ version }) => version),
    ['3.1.0', '3.1.0']
  )
})

test('fails the complete snapshot when one source cannot be resolved', async () => {
  const fetchImpl = async () => ({ ok: false, status: 503 })

  await assert.rejects(
    createConnectorVersionSnapshot({
      fetchImpl,
      connectors: [{ id: 'rhino', products: ['Rhino', 'Grasshopper'], macos: true }]
    }),
    /HTTP 503/
  )
})
