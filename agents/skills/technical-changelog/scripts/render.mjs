#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const STATUSES = new Set(['available', 'prerelease', 'landed'])
const EVIDENCE_KINDS = new Set(['implementation', 'release', 'package', 'installer', 'deployment'])
const SCOPE_BOUNDARIES = new Map([
  ['library-release', new Set(['release', 'package'])],
  ['package-release', new Set(['release', 'package'])],
  ['connector-release', new Set(['release', 'installer'])],
  ['converter-image', new Set(['release'])],
  ['server-release', new Set(['release'])],
  ['hosted-deployment', new Set(['deployment'])]
])
function fail(message) {
  throw new Error(`technical-changelog render: ${message}`)
}

function loadChangeKinds() {
  const taxonomy = JSON.parse(
    readFileSync(new URL('../assets/change-kinds.json', import.meta.url), 'utf8')
  )
  if (!Number.isInteger(taxonomy.version) || !Array.isArray(taxonomy.kinds))
    fail('change-kind taxonomy must have a numeric version and kinds array')

  const kinds = new Map()
  for (const [index, kind] of taxonomy.kinds.entries()) {
    if (!kind || !/^[a-z]+(?:-[a-z]+)*$/.test(kind.id || ''))
      fail(`change-kind taxonomy kinds[${index}].id must use lowercase kebab-case`)
    if (typeof kind.label !== 'string' || !kind.label.trim())
      fail(`change-kind taxonomy kinds[${index}].label is required`)
    if (kinds.has(kind.id)) fail(`duplicate change kind: ${kind.id}`)
    kinds.set(kind.id, kind.label.trim())
  }
  if (!kinds.size) fail('change-kind taxonomy must contain at least one kind')
  return kinds
}

const CHANGE_KINDS = loadChangeKinds()
const CHANGE_KIND_ORDER = new Map([...CHANGE_KINDS.keys()].map((kind, index) => [kind, index]))

function loadGroupingTemplate() {
  const template = JSON.parse(
    readFileSync(new URL('../assets/groupings.json', import.meta.url), 'utf8')
  )
  if (
    !Number.isInteger(template.version) ||
    !Array.isArray(template.areas) ||
    !template.areas.length
  )
    fail('groupings template must have a numeric version and at least one area')

  const areaNames = new Set()
  const componentAreas = new Map()
  const areas = []
  for (const [areaIndex, area] of template.areas.entries()) {
    if (!area || typeof area.name !== 'string' || !area.name.trim())
      fail(`groupings template areas[${areaIndex}].name is required`)
    if (areaNames.has(area.name)) fail(`duplicate grouping area: ${area.name}`)
    areaNames.add(area.name)
    if (!Array.isArray(area.components) || !area.components.length)
      fail(`groupings template area ${area.name} must contain components`)
    const components = []
    for (const [componentIndex, component] of area.components.entries()) {
      if (
        !component ||
        typeof component.name !== 'string' ||
        !component.name.trim() ||
        typeof component.covers !== 'string' ||
        !component.covers.trim()
      )
        fail(
          `groupings template area ${area.name} components[${componentIndex}] requires name and covers`
        )
      const name = component.name.trim()
      if (componentAreas.has(name)) fail(`grouping component ${name} appears in more than one area`)
      componentAreas.set(name, area.name)
      components.push(name)
    }
    areas.push({ ...area, components })
  }
  return { ...template, areas, areaNames, componentAreas }
}

const GROUPINGS = loadGroupingTemplate()

function validHttps(value) {
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

function validateUtcWindow(window) {
  const utcInstant = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/
  if (!window || !utcInstant.test(window.from || '') || !utcInstant.test(window.to || '')) {
    fail('window.from and window.to must be UTC ISO-8601 instants ending in Z')
  }
  if (new Date(window.from) >= new Date(window.to))
    fail('window.from must be earlier than window.to')
}

function validUtcInstant(value) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value || '')
}

export function validatePlan(plan, expectedWeek) {
  if (!plan || typeof plan !== 'object' || Array.isArray(plan))
    fail('changelog.json must contain an object')
  if (!/^\d{4}-W\d{2}$/.test(plan.week || '')) fail('week must use YYYY-Www')
  if (expectedWeek && plan.week !== expectedWeek)
    fail(`plan week ${plan.week} does not match CHANGELOG_WEEK ${expectedWeek}`)
  validateUtcWindow(plan.window)
  if (!Array.isArray(plan.entries)) fail('entries must be an array')

  const ids = new Set()
  const entries = plan.entries.map((entry, index) => {
    const prefix = `entries[${index}]`
    if (!entry || typeof entry !== 'object' || Array.isArray(entry))
      fail(`${prefix} must be an object`)
    for (const field of [
      'id',
      'status',
      'kind',
      'area',
      'component',
      'summary',
      'date',
      'scope'
    ]) {
      if (typeof entry[field] !== 'string' || !entry[field].trim())
        fail(`${prefix}.${field} is required`)
    }
    if (ids.has(entry.id)) fail(`duplicate entry id: ${entry.id}`)
    ids.add(entry.id)
    if (!STATUSES.has(entry.status))
      fail(`${prefix}.status must be available, prerelease, or landed`)
    if (
      !entry.publication ||
      entry.publication.basis !== 'technical-behavior' ||
      typeof entry.publication.rationale !== 'string' ||
      !entry.publication.rationale.trim()
    )
      fail(`${prefix}.publication must record a technical-behavior basis and reviewable rationale`)
    if (!CHANGE_KINDS.has(entry.kind))
      fail(`${prefix}.kind must be defined in assets/change-kinds.json`)
    if (!GROUPINGS.areaNames.has(entry.area))
      fail(`${prefix}.area must name a template product area`)
    if (GROUPINGS.componentAreas.get(entry.component) !== entry.area)
      fail(`${prefix}.component must belong to ${entry.area} in the groupings template`)
    if (!SCOPE_BOUNDARIES.has(entry.scope))
      fail(`${prefix}.scope must name a supported availability boundary`)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) fail(`${prefix}.date must use YYYY-MM-DD`)
    if (!Array.isArray(entry.evidence) || entry.evidence.length === 0)
      fail(`${prefix}.evidence must not be empty`)

    const evidence = entry.evidence.map((source, sourceIndex) => {
      if (!source || typeof source.label !== 'string' || !source.label.trim()) {
        fail(`${prefix}.evidence[${sourceIndex}].label is required`)
      }
      if (!validHttps(source.url)) fail(`${prefix}.evidence[${sourceIndex}].url must be HTTPS`)
      if (!EVIDENCE_KINDS.has(source.kind)) {
        fail(`${prefix}.evidence[${sourceIndex}].kind is unsupported`)
      }
      if (source.public !== undefined && typeof source.public !== 'boolean')
        fail(`${prefix}.evidence[${sourceIndex}].public must be boolean`)
      if (source.public) fail(`${prefix}.evidence[${sourceIndex}] cannot publish evidence links`)
      if (source.targetBranch !== undefined && typeof source.targetBranch !== 'string')
        fail(`${prefix}.evidence[${sourceIndex}].targetBranch must be a string`)
      return {
        label: source.label.trim(),
        url: source.url,
        kind: source.kind,
        targetBranch: source.targetBranch?.trim(),
        public: !!source.public
      }
    })

    if (!Array.isArray(entry.requirements) || entry.requirements.length === 0)
      fail(`${prefix}.requirements must not be empty`)
    const requirements = entry.requirements.map((requirement, requirementIndex) => {
      const requirementPrefix = `${prefix}.requirements[${requirementIndex}]`
      if (
        !requirement ||
        typeof requirement.component !== 'string' ||
        !requirement.component.trim()
      )
        fail(`${requirementPrefix}.component is required`)
      if (!validHttps(requirement.evidenceUrl))
        fail(`${requirementPrefix}.evidenceUrl must be HTTPS`)
      if (!evidence.some((source) => source.url === requirement.evidenceUrl))
        fail(`${requirementPrefix}.evidenceUrl must also appear in evidence`)
      return { component: requirement.component.trim(), evidenceUrl: requirement.evidenceUrl }
    })

    if (entry.status === 'available' || entry.status === 'prerelease') {
      if (
        entry.scope !== 'hosted-deployment' &&
        (typeof entry.version !== 'string' || !entry.version.trim())
      )
        fail(`${prefix}.version is required for ${entry.status}`)
      if (!entry.availability || !validHttps(entry.availability.evidenceUrl))
        fail(`${prefix}.availability.evidenceUrl must be HTTPS for ${entry.status}`)
      if (!validUtcInstant(entry.availability.occurredAt))
        fail(`${prefix}.availability.occurredAt must be an authoritative UTC event time`)
      const boundary = evidence.find((source) => source.url === entry.availability.evidenceUrl)
      if (!boundary) fail(`${prefix}.availability.evidenceUrl must also appear in evidence`)
      const webAppMainMerge =
        entry.area === 'Web app' &&
        entry.scope === 'hosted-deployment' &&
        boundary.kind === 'implementation' &&
        boundary.targetBranch === 'main'
      if (!SCOPE_BOUNDARIES.get(entry.scope).has(boundary.kind) && !webAppMainMerge) {
        fail(`${prefix}.availability evidence kind does not prove scope ${entry.scope}`)
      }
      const occurredAt = new Date(entry.availability.occurredAt)
      if (occurredAt < new Date(plan.window.from) || occurredAt >= new Date(plan.window.to))
        fail(`${prefix}.availability.occurredAt must fall inside the changelog window`)
    } else if (entry.availability) {
      fail(`${prefix}.availability contradicts landed status`)
    }

    return {
      ...entry,
      id: entry.id.trim(),
      component: entry.component.trim(),
      summary: entry.summary.trim().replace(/[.\s]+$/, ''),
      version: entry.version?.trim(),
      evidence,
      requirements
    }
  })

  entries.sort(
    (a, b) =>
      b.date.localeCompare(a.date) ||
      a.component.localeCompare(b.component) ||
      a.id.localeCompare(b.id)
  )
  return { week: plan.week, month: plan.window.to.slice(0, 7), window: plan.window, entries }
}

function entryText(entry) {
  const version = entry.version ? ` Version ${entry.version}.` : ''
  return `${entry.summary}.${version}`
}

function publicEntry(entry) {
  return {
    sourceHash: createHash('sha256').update(entry.id).digest('hex'),
    status: entry.status,
    kind: entry.kind,
    area: entry.area,
    component: entry.component,
    text: entryText(entry),
    date: entry.date
  }
}

const STATUS_ORDER = new Map([
  ['available', 0],
  ['prerelease', 1],
  ['landed', 2]
])

function componentSection(entries) {
  const items = [...entries]
    .sort(
      (a, b) =>
        CHANGE_KIND_ORDER.get(a.kind) - CHANGE_KIND_ORDER.get(b.kind) ||
        b.date.localeCompare(a.date) ||
        STATUS_ORDER.get(a.status) - STATUS_ORDER.get(b.status) ||
        a.sourceHash.localeCompare(b.sourceHash)
    )
    .map((entry) => `- **${CHANGE_KINDS.get(entry.kind)}:** ${entry.text}`)
    .join('\n\n')
  return items
}

export function renderPage(ledger) {
  const monthDate = new Date(`${ledger.month}-01T00:00:00Z`)
  const monthLabel = new Intl.DateTimeFormat('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(monthDate)
  for (const [index, entry] of ledger.entries.entries()) {
    if (GROUPINGS.componentAreas.get(entry.component) !== entry.area)
      fail(`ledger entries[${index}] does not match the groupings template`)
    if (!CHANGE_KINDS.has(entry.kind)) fail(`ledger entries[${index}].kind is unsupported`)
  }
  return `${[
    '---',
    `title: 'Changelog — ${monthLabel}'`,
    `description: 'Speckle changes for ${monthLabel}.'`,
    `sidebarTitle: '${monthLabel}'`,
    '---',
    '',
    GROUPINGS.areas
      .filter((area) => ledger.entries.some((entry) => entry.area === area.name))
      .map((area) => {
        const areaEntries = ledger.entries.filter((entry) => entry.area === area.name)
        return `## ${area.name}\n\n${area.components
          .filter((component) => areaEntries.some((entry) => entry.component === component))
          .map(
            (component) =>
              `### ${component}\n\n${componentSection(
                areaEntries.filter((entry) => entry.component === component)
              )}`
          )
          .join('\n\n')}`
      })
      .join('\n\n'),
    ''
  ].join('\n')}\n`
}

function monthFromPath(value) {
  return path.basename(value, '.mdx')
}

export function updateChangelogNavigation(existing, months) {
  const uniqueMonths = [...new Set(months)].sort().reverse()
  if (existing === null) fail('navigation/changelog.json is required')
  const navigation = JSON.parse(existing)
  if (navigation.dropdown !== 'Changelog')
    fail('navigation/changelog.json must define the Changelog dropdown')
  navigation.pages = uniqueMonths.map((month) => `technical-changelog/${month}`)
  return `${JSON.stringify(navigation, null, 2)}\n`
}

export function mergeLedger(existing, plan) {
  const ledger = existing || { month: plan.month, runs: [], entries: [] }
  if (ledger.month !== plan.month) fail(`ledger month ${ledger.month} does not match ${plan.month}`)
  const priorRun = ledger.runs.find((run) => run.week === plan.week)
  if (priorRun && JSON.stringify(priorRun.window) !== JSON.stringify(plan.window))
    fail(`week ${plan.week} already has a different window in ${plan.month}`)

  const bySource = new Map()
  for (const entry of ledger.entries) {
    if (typeof entry.sourceHash !== 'string' || !entry.sourceHash)
      fail('persisted entry sourceHash is required')
    if (bySource.has(entry.sourceHash))
      fail(`duplicate persisted sourceHash: ${entry.sourceHash}`)
    const { slug: _legacySlug, ...currentEntry } = entry
    bySource.set(entry.sourceHash, currentEntry)
  }
  for (const entry of plan.entries) {
    const next = publicEntry(entry)
    bySource.set(next.sourceHash, next)
  }
  const runs = priorRun ? ledger.runs : [...ledger.runs, { week: plan.week, window: plan.window }]
  return { month: plan.month, runs, entries: [...bySource.values()] }
}

async function atomicWrite(filename, content) {
  await mkdir(path.dirname(filename), { recursive: true })
  const temporary = `${filename}.tmp-${process.pid}`
  await writeFile(temporary, content, 'utf8')
  await rename(temporary, filename)
}

async function readOptional(filename) {
  try {
    return await readFile(filename, 'utf8')
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}

export async function render({ input, docsRoot, expectedWeek }) {
  const raw = await readFile(input, 'utf8')
  const plan = validatePlan(JSON.parse(raw), expectedWeek)
  const changelogDir = path.join(docsRoot, 'technical-changelog')
  const ledgerDir = path.join(docsRoot, 'technical-changelog-data')
  const ledgerPath = path.join(ledgerDir, `${plan.month}.json`)
  const pagePath = path.join(changelogDir, `${plan.month}.mdx`)
  const navigationPath = path.join(docsRoot, 'navigation', 'changelog.json')
  const existingLedger = await readOptional(ledgerPath)
  const existingNavigation = await readOptional(navigationPath)
  const existingPages = []

  try {
    for (const name of await readdir(changelogDir)) {
      if (/^\d{4}-\d{2}\.mdx$/.test(name)) existingPages.push(monthFromPath(name))
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }

  const ledger = mergeLedger(existingLedger ? JSON.parse(existingLedger) : null, plan)
  const renderedPage = renderPage(ledger)
  await atomicWrite(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`)
  await atomicWrite(pagePath, renderedPage)
  await atomicWrite(
    navigationPath,
    updateChangelogNavigation(existingNavigation, [...existingPages, plan.month])
  )
  return { pagePath, navigationPath, entries: plan.entries.length }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  try {
    const input =
      process.env.CHANGELOG_INPUT ||
      (process.env.OUTPUT_DIR && path.join(process.env.OUTPUT_DIR, 'changelog.json'))
    if (!input) fail('CHANGELOG_INPUT or OUTPUT_DIR is required')
    if (!process.env.CHANGELOG_WEEK) fail('CHANGELOG_WEEK is required')
    const result = await render({
      input: path.resolve(input),
      docsRoot: path.resolve(process.env.DOCS_ROOT || process.cwd()),
      expectedWeek: process.env.CHANGELOG_WEEK
    })
    process.stdout.write(`Rendered ${result.entries} entries to ${result.pagePath}.\n`)
  } catch (error) {
    process.stderr.write(`${error.message}\n`)
    process.exitCode = 1
  }
}
