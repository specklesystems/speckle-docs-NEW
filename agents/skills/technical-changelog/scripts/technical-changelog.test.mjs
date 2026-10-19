import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, symlink, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {
  classifyPullRequest,
  collectEvidence,
  paginate,
  parseManifest,
  resolveManifest,
  selectRepositories,
  validateWindow,
  withinWindow,
  writeEvidenceAtomically
} from './collect.mjs'
import {
  mergeLedger,
  render,
  renderPage,
  updateChangelogNavigation,
  validatePlan
} from './render.mjs'

const manifestSource = `[repos]
speckle-server-internal = "git@github.com:specklesystems/speckle-server-internal.git"
speckle-sharp-connectors = "git@github.com:specklesystems/speckle-sharp-connectors.git"
speckle-docs-NEW = "git@github.com:specklesystems/speckle-docs-NEW.git"
speckle-security-assessments = "git@github.com:specklesystems/speckle-security-assessments.git"

[stacks]
server = "speckle-server-internal speckle-docs-NEW"
sdk = "speckle-server-internal"
connector = "speckle-sharp-connectors speckle-docs-NEW"
infra = "speckle-security-assessments speckle-server-internal"
`

const basePlan = {
  week: '2026-W41',
  window: { from: '2026-10-02T14:00:00Z', to: '2026-10-09T14:00:00Z' },
  entries: [
    {
      id: 'speckle-sharp-connectors#1',
      status: 'available',
      kind: 'feature',
      publication: {
        basis: 'technical-behavior',
        rationale: 'Adds a capability users can exercise in the connector.'
      },
      area: 'Integrations',
      component: 'Desktop connectors',
      summary: 'Adds one capability',
      scope: 'connector-release',
      version: '2026.9.1',
      date: '2026-10-05',
      availability: {
        evidenceUrl:
          'https://github.com/specklesystems/speckle-sharp-connectors/releases/tag/2026.9.1',
        occurredAt: '2026-10-05T10:00:00Z'
      },
      requirements: [
        {
          component: 'connector',
          evidenceUrl: 'https://github.com/specklesystems/speckle-sharp-connectors/pull/1'
        }
      ],
      evidence: [
        {
          label: 'PR #1',
          url: 'https://github.com/specklesystems/speckle-sharp-connectors/pull/1',
          kind: 'implementation'
        },
        {
          label: 'Release 2026.9.1',
          url: 'https://github.com/specklesystems/speckle-sharp-connectors/releases/tag/2026.9.1',
          kind: 'release'
        }
      ]
    }
  ]
}

const navigationSource = JSON.stringify(
  {
    dropdown: 'Changelog',
    icon: 'history',
    global: { anchors: [] },
    pages: ['technical-changelog/2026-09']
  },
  null,
  2
)

async function seedNavigation(docsRoot) {
  await mkdir(path.join(docsRoot, 'navigation'), { recursive: true })
  await writeFile(path.join(docsRoot, 'navigation', 'changelog.json'), `${navigationSource}\n`)
}

test('window is half-open and requires explicit UTC instants', () => {
  const window = validateWindow('2026-10-02T14:00:00Z', '2026-10-09T14:00:00Z')
  assert.equal(withinWindow('2026-10-02T14:00:00Z', window), true)
  assert.equal(withinWindow('2026-10-09T13:59:59Z', window), true)
  assert.equal(withinWindow('2026-10-09T14:00:00Z', window), false)
  assert.throws(() => validateWindow('2026-10-02', '2026-10-09T14:00:00Z'), /explicit UTC/)
})

test('manifest selection is the documented stack union and exclusions', () => {
  const selected = selectRepositories(parseManifest(manifestSource))
  assert.deepEqual(selected, [
    { name: 'speckle-server-internal', slug: 'specklesystems/speckle-server-internal' },
    { name: 'speckle-sharp-connectors', slug: 'specklesystems/speckle-sharp-connectors' }
  ])
})

test('grouping taxonomy gives every home a boundary and covers the persisted ledger', async () => {
  const taxonomy = JSON.parse(
    await readFile(new URL('../assets/groupings.json', import.meta.url), 'utf8')
  )
  const components = taxonomy.areas.flatMap((area) =>
    area.components.map((component) => ({ ...component, area: area.name }))
  )
  assert.equal(new Set(components.map((component) => component.name)).size, components.length)
  assert.ok(components.every((component) => component.name.trim() && component.covers.trim()))

  const ledger = JSON.parse(
    await readFile(
      new URL('../../../../technical-changelog-data/2026-10.json', import.meta.url),
      'utf8'
    )
  )
  const homes = new Set(components.map((component) => `${component.area}\0${component.name}`))
  for (const entry of ledger.entries) {
    assert.ok(
      homes.has(`${entry.area}\0${entry.component}`),
      `${entry.sourceHash} has no taxonomy home`
    )
  }
})

test('connector dev PRs are candidates and only dev-to-main is the landed boundary', () => {
  assert.equal(classifyPullRequest('speckle-sharp-connectors', 'dev', 'feature/a'), 'candidate')
  assert.equal(classifyPullRequest('speckle-sharp-connectors', 'main', 'dev'), 'landed-boundary')
  assert.equal(classifyPullRequest('speckle-sharp-connectors', 'main', 'hotfix'), 'other')
  assert.equal(classifyPullRequest('speckle-server-internal', 'main', 'feature/a'), 'landed')
})

test('pagination reads the final partial page', async () => {
  const pages = []
  const runGh = async (args) => {
    const endpoint = args[1]
    pages.push(endpoint)
    const page = Number(new URL(`https://example.test/${endpoint}`).searchParams.get('page'))
    return JSON.stringify(
      page === 1 ? Array.from({ length: 100 }, (_, id) => ({ id })) : [{ id: 100 }]
    )
  }
  const rows = await paginate({
    endpoint: 'repos/specklesystems/example/releases',
    runGh,
    maxPages: 3
  })
  assert.equal(rows.length, 101)
  assert.equal(pages.length, 2)
})

test('pagination stops after a full page crosses the evidence window', async () => {
  let calls = 0
  const rows = await paginate({
    endpoint: 'repos/specklesystems/example/pulls?state=closed',
    maxPages: 3,
    runGh: async () => {
      calls += 1
      return JSON.stringify(
        Array.from({ length: 100 }, (_, id) => ({
          id,
          updated_at: id === 99 ? '2026-10-01T00:00:00Z' : '2026-10-10T00:00:00Z'
        }))
      )
    },
    stopAfterPage: (batch) => batch.at(-1).updated_at < '2026-10-02T00:00:00Z'
  })
  assert.equal(rows.length, 100)
  assert.equal(calls, 1)
})

test('remote manifest fallback is pinned and validated', async () => {
  let called
  const resolved = await resolveManifest({
    startDir: '/definitely/missing',
    env: {},
    exists: async () => false,
    runGh: async (args) => {
      called = args
      return manifestSource
    }
  })
  assert.deepEqual(called, [
    'api',
    '-H',
    'Accept: application/vnd.github.raw+json',
    'repos/specklesystems/speckle-atlas/contents/atlas/manifest.toml?ref=main'
  ])
  assert.equal(resolved.source, 'github:specklesystems/speckle-atlas@main/atlas/manifest.toml')
})

test('collection failure leaves no partial dataset', async () => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'technical-changelog-test-'))
  const manifest = path.join(temporary, 'manifest.toml')
  const output = path.join(temporary, 'out')
  await writeFile(manifest, manifestSource)

  const runGh = async (args) => {
    const endpoint = args[1]
    if (endpoint.endsWith('--impossible')) return '[]'
    if (endpoint.includes('/releases')) throw new Error('release API unavailable')
    if (endpoint.includes('/pulls?')) return '[]'
    return 'specklesystems/repo'
  }

  await assert.rejects(
    collectEvidence({
      env: {
        ATLAS_MANIFEST: manifest,
        WINDOW_FROM: '2026-10-02T14:00:00Z',
        WINDOW_TO: '2026-10-09T14:00:00Z',
        OUTPUT_DIR: output,
        MAX_PAGES: '1'
      },
      runGh
    }),
    /release API unavailable/
  )
  await assert.rejects(readFile(path.join(output, 'prs.jsonl')), { code: 'ENOENT' })
})

test('atomic evidence replacement preserves unrelated files', async () => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'technical-changelog-atomic-'))
  const output = path.join(temporary, 'out')
  await writeEvidenceAtomically(output, { 'prs.jsonl': 'old\n', 'metadata.json': '{}\n' })
  await writeFile(path.join(output, 'changelog.json'), '{"human":true}\n')
  await writeEvidenceAtomically(output, { 'prs.jsonl': 'new\n', 'metadata.json': '{"new":true}\n' })
  assert.equal(await readFile(path.join(output, 'prs.jsonl'), 'utf8'), 'new\n')
  assert.equal(await readFile(path.join(output, 'changelog.json'), 'utf8'), '{"human":true}\n')
})

test('atomic evidence writer rejects a symlink output directory', async () => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'technical-changelog-symlink-'))
  const target = path.join(temporary, 'target')
  const link = path.join(temporary, 'link')
  await writeFile(target, 'not a directory')
  await symlink(target, link)
  await assert.rejects(writeEvidenceAtomically(link, { 'prs.jsonl': '' }), /real directory/)
})

test('renderer permits several changes to cite the same release', () => {
  const shared = structuredClone(basePlan)
  shared.entries.push({
    ...structuredClone(shared.entries[0]),
    id: 'speckle-sharp-connectors#2',
    kind: 'fix',
    summary: 'Fixes another behavior'
  })
  shared.entries.reverse()
  const validated = validatePlan(shared, '2026-W41')
  const page = renderPage(mergeLedger(null, validated))
  assert.equal(validated.entries.length, 2)
  assert.match(page, /## Integrations/)
  assert.match(page, /title: 'Changelog — October 2026'/)
  assert.doesNotMatch(page, /Technical changelog|Released and landed/)
  assert.equal(page.match(/### Desktop connectors/g)?.length, 1)
  assert.match(page, /Adds one capability/)
  assert.match(page, /Fixes another behavior/)
  assert.ok(page.indexOf('Adds one capability') < page.indexOf('Fixes another behavior'))
  assert.doesNotMatch(page, /Scope:/)
  assert.doesNotMatch(page, /pull\/1/)
  assert.doesNotMatch(page, /github\.com/)
  assert.doesNotMatch(page, /<div id=|\{#|\/commit\//)
})

test('renderer uses grouping template order rather than entry order', () => {
  const mixed = structuredClone(basePlan)
  const dashboard = structuredClone(mixed.entries[0])
  dashboard.id = 'bashboards#1'
  dashboard.status = 'landed'
  dashboard.area = 'Web app'
  dashboard.component = 'Dashboards'
  dashboard.scope = 'hosted-deployment'
  delete dashboard.version
  delete dashboard.availability
  mixed.entries.unshift(dashboard)
  const page = renderPage(mergeLedger(null, validatePlan(mixed, '2026-W41')))
  assert.ok(page.indexOf('## Web app') < page.indexOf('## Integrations'))
})

test('renderer rejects duplicate change ids', () => {
  const duplicate = structuredClone(basePlan)
  duplicate.entries.push(structuredClone(duplicate.entries[0]))
  assert.throws(() => validatePlan(duplicate, '2026-W41'), /duplicate entry id/)
})

test('renderer rejects duplicate persisted source hashes', () => {
  const validated = validatePlan(basePlan, '2026-W41')
  const ledger = mergeLedger(null, validated)
  ledger.entries.push(structuredClone(ledger.entries[0]))
  assert.throws(() => mergeLedger(ledger, validated), /duplicate persisted sourceHash/)
})

test('renderer rejects unknown product areas', () => {
  const invalid = structuredClone(basePlan)
  invalid.entries[0].area = 'Miscellaneous'
  assert.throws(() => validatePlan(invalid, '2026-W41'), /area must name a template product area/)
})

test('renderer rejects components outside their template area', () => {
  const invalid = structuredClone(basePlan)
  invalid.entries[0].component = 'Dashboards'
  assert.throws(
    () => validatePlan(invalid, '2026-W41'),
    /component must belong to Integrations in the groupings template/
  )
})

test('renderer rejects an availability boundary that cannot prove the declared scope', () => {
  const mismatch = structuredClone(basePlan)
  mismatch.entries[0].scope = 'hosted-deployment'
  assert.throws(
    () => validatePlan(mismatch, '2026-W41'),
    /availability evidence kind does not prove scope hosted-deployment/
  )
})

test('web app main merge proves hosted availability without a version', () => {
  const webApp = structuredClone(basePlan)
  webApp.entries[0].area = 'Web app'
  webApp.entries[0].component = 'Model Health'
  webApp.entries[0].scope = 'hosted-deployment'
  delete webApp.entries[0].version
  webApp.entries[0].availability.evidenceUrl = webApp.entries[0].evidence[0].url
  webApp.entries[0].evidence[0].targetBranch = 'main'
  assert.doesNotThrow(() => validatePlan(webApp, '2026-W41'))
})

test('main merge availability exception is limited to hosted web surfaces', () => {
  const server = structuredClone(basePlan)
  server.entries[0].area = 'Server'
  server.entries[0].component = 'Enterprise Server'
  server.entries[0].scope = 'hosted-deployment'
  delete server.entries[0].version
  server.entries[0].availability.evidenceUrl = server.entries[0].evidence[0].url
  server.entries[0].evidence[0].targetBranch = 'main'
  assert.throws(
    () => validatePlan(server, '2026-W41'),
    /availability evidence kind does not prove scope hosted-deployment/
  )

  const connector = structuredClone(basePlan)
  connector.entries[0].area = 'Web app'
  connector.entries[0].component = 'Model Health'
  connector.entries[0].evidence[0].targetBranch = 'main'
  connector.entries[0].availability.evidenceUrl = connector.entries[0].evidence[0].url
  assert.throws(
    () => validatePlan(connector, '2026-W41'),
    /availability evidence kind does not prove scope connector-release/
  )
})

test('renderer rejects availability outside the closed window', () => {
  const outside = structuredClone(basePlan)
  outside.entries[0].availability.occurredAt = '2026-10-02T13:59:59Z'
  assert.throws(() => validatePlan(outside, '2026-W41'), /must fall inside the changelog window/)
})

test('renderer requires every component requirement to cite collected evidence', () => {
  const incomplete = structuredClone(basePlan)
  incomplete.entries[0].requirements.push({
    component: 'hosted application',
    evidenceUrl: 'https://github.com/specklesystems/gitOps/pull/999'
  })
  assert.throws(
    () => validatePlan(incomplete, '2026-W41'),
    /requirements\[1\].evidenceUrl must also appear in evidence/
  )
})

test('renderer rejects publishing any evidence link', () => {
  const implementation = structuredClone(basePlan)
  implementation.entries[0].evidence[0].public = true
  assert.throws(() => validatePlan(implementation, '2026-W41'), /cannot publish evidence links/)

  const release = structuredClone(basePlan)
  release.entries[0].evidence[1].public = true
  assert.throws(() => validatePlan(release, '2026-W41'), /cannot publish evidence links/)
})

test('renderer requires a supported public change kind', () => {
  const missing = structuredClone(basePlan)
  delete missing.entries[0].kind
  assert.throws(() => validatePlan(missing, '2026-W41'), /entries\[0\]\.kind is required/)

  const unsupported = structuredClone(basePlan)
  unsupported.entries[0].kind = 'update'
  assert.throws(
    () => validatePlan(unsupported, '2026-W41'),
    /kind must be defined in assets\/change-kinds.json/
  )
})

test('renderer rejects commercial decisions regardless of their component home', () => {
  const commercial = structuredClone(basePlan)
  commercial.entries[0].area = 'Web app'
  commercial.entries[0].component = 'Plans'
  commercial.entries[0].summary = 'Moves an integration out of the Team plan'
  commercial.entries[0].publication = {
    basis: 'commercial-decision',
    rationale: 'Changes packaging rather than technical product behavior.'
  }
  assert.throws(
    () => validatePlan(commercial, '2026-W41'),
    /publication must record a technical-behavior basis and reviewable rationale/
  )

  const technical = structuredClone(commercial)
  technical.entries[0].summary = 'Usage charts can be exported as CSV'
  technical.entries[0].publication = {
    basis: 'technical-behavior',
    rationale: 'Adds an exercisable capability to the usage interface.'
  }
  assert.doesNotThrow(() => validatePlan(technical, '2026-W41'))
})

test('landed entries render without implementation links or trailing whitespace', () => {
  const landed = structuredClone(basePlan)
  landed.entries[0].status = 'landed'
  delete landed.entries[0].availability
  delete landed.entries[0].version
  const page = renderPage(mergeLedger(null, validatePlan(landed, '2026-W41')))
  assert.doesNotMatch(page, /pull\/1/)
  assert.doesNotMatch(page, /Available:|Landed; availability not verified:/)
  assert.match(page, /- \*\*Feature:\*\* Adds one capability/)
  assert.doesNotMatch(page, /Scope:/)
})

test('monthly navigation update preserves changelog metadata and is idempotent', () => {
  const once = updateChangelogNavigation(navigationSource, ['2026-09', '2026-10'])
  const twice = updateChangelogNavigation(once, ['2026-09', '2026-10'])
  assert.equal(once, twice)
  const parsed = JSON.parse(once)
  assert.equal(parsed.dropdown, 'Changelog')
  assert.equal(parsed.icon, 'history')
  assert.deepEqual(parsed.global, { anchors: [] })
  assert.deepEqual(parsed.pages, ['technical-changelog/2026-10', 'technical-changelog/2026-09'])
  assert.throws(
    () => updateChangelogNavigation('{"dropdown":"User Guides"}', ['2026-10']),
    /must define the Changelog dropdown/
  )
})

test('render is idempotent end to end', async () => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'technical-changelog-render-'))
  const input = path.join(temporary, 'changelog.json')
  const docsRoot = path.join(temporary, 'docs')
  await seedNavigation(docsRoot)
  await writeFile(input, JSON.stringify(basePlan))

  const first = await render({ input, docsRoot, expectedWeek: '2026-W41' })
  const firstPage = await readFile(first.pagePath, 'utf8')
  const firstNavigation = await readFile(first.navigationPath, 'utf8')
  await render({ input, docsRoot, expectedWeek: '2026-W41' })

  assert.equal(await readFile(first.pagePath, 'utf8'), firstPage)
  assert.equal(await readFile(first.navigationPath, 'utf8'), firstNavigation)
})

test('rerender updates an entry through its stable private id', async () => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'technical-changelog-key-'))
  const input = path.join(temporary, 'changelog.json')
  const docsRoot = path.join(temporary, 'docs')
  await seedNavigation(docsRoot)
  await writeFile(input, JSON.stringify(basePlan))
  await render({ input, docsRoot, expectedWeek: '2026-W41' })

  const updated = structuredClone(basePlan)
  updated.entries[0].summary = 'Updates the same capability'
  await writeFile(input, JSON.stringify(updated))
  const result = await render({ input, docsRoot, expectedWeek: '2026-W41' })
  const page = await readFile(result.pagePath, 'utf8')
  assert.match(page, /Updates the same capability/)
  assert.doesNotMatch(page, /Adds one capability/)
})

test('weekly runs accumulate on the month containing the check end date', async () => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'technical-changelog-monthly-'))
  const input = path.join(temporary, 'changelog.json')
  const docsRoot = path.join(temporary, 'docs')
  await seedNavigation(docsRoot)
  await writeFile(input, JSON.stringify(basePlan))
  const first = await render({ input, docsRoot, expectedWeek: '2026-W41' })

  const next = structuredClone(basePlan)
  next.week = '2026-W42'
  next.window = { from: '2026-10-09T14:00:00Z', to: '2026-10-16T14:00:00Z' }
  next.entries[0].id = 'speckle-sharp-connectors#2'
  next.entries[0].summary = 'Adds another capability'
  next.entries[0].date = '2026-10-12'
  next.entries[0].availability.occurredAt = '2026-10-12T10:00:00Z'
  await writeFile(input, JSON.stringify(next))
  const second = await render({ input, docsRoot, expectedWeek: '2026-W42' })
  const page = await readFile(second.pagePath, 'utf8')

  assert.equal(first.pagePath, second.pagePath)
  assert.match(second.pagePath, /2026-10\.mdx$/)
  assert.match(page, /Adds one capability/)
  assert.match(page, /Adds another capability/)
  assert.equal(page.match(/## Integrations/g)?.length, 1)
  assert.equal(page.match(/### Desktop connectors/g)?.length, 1)
  assert.doesNotMatch(page, /github\.com|\/pull\/|\/commit\//)
})

test('a cross-month check belongs to the month containing WINDOW_TO', () => {
  const crossing = structuredClone(basePlan)
  crossing.week = '2026-W44'
  crossing.window = { from: '2026-10-29T14:00:00Z', to: '2026-11-05T14:00:00Z' }
  crossing.entries[0].date = '2026-10-30'
  crossing.entries[0].availability.occurredAt = '2026-10-30T10:00:00Z'
  assert.equal(validatePlan(crossing, '2026-W44').month, '2026-11')
})
