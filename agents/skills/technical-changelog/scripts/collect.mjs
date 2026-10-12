#!/usr/bin/env node

import { execFile as execFileCallback } from 'node:child_process'
import { access, lstat, mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execFile = promisify(execFileCallback)
const PAGE_SIZE = 100
const DEFAULT_MAX_PAGES = 20
const REMOTE_MANIFEST = {
  repo: 'specklesystems/speckle-atlas',
  ref: 'main',
  path: 'atlas/manifest.toml'
}
const INCLUDED_STACKS = ['server', 'sdk', 'connector', 'infra']
const EXCLUDED_REPOS = new Set(['speckle-docs-NEW', 'speckle-security-assessments'])
const DEV_MAIN_REPOS = new Set(['speckle-sharp-connectors', 'speckle-converters'])

function fail(message) {
  throw new Error(`technical-changelog collect: ${message}`)
}

export function validateWindow(fromValue, toValue) {
  const utcInstant = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/
  if (!utcInstant.test(fromValue || '') || !utcInstant.test(toValue || '')) {
    fail('WINDOW_FROM and WINDOW_TO must be explicit UTC ISO-8601 instants ending in Z')
  }
  const from = new Date(fromValue)
  const to = new Date(toValue)
  if (!Number.isFinite(from.valueOf()) || !Number.isFinite(to.valueOf()) || from >= to) {
    fail('WINDOW_FROM must be earlier than WINDOW_TO')
  }
  return { from: from.toISOString(), to: to.toISOString() }
}

export function withinWindow(value, window) {
  if (!value) return false
  const instant = new Date(value).toISOString()
  return instant >= window.from && instant < window.to
}

export function parseManifest(source) {
  const repos = new Map()
  const stacks = new Map()
  let section = ''

  for (const originalLine of source.split(/\r?\n/)) {
    const line = originalLine.replace(/\s+#.*$/, '').trim()
    if (!line) continue
    const sectionMatch = line.match(/^\[([^\]]+)\]$/)
    if (sectionMatch) {
      section = sectionMatch[1]
      continue
    }
    const assignment = line.match(/^([A-Za-z0-9_-]+)\s*=\s*"([^"]+)"$/)
    if (!assignment) continue
    const [, key, value] = assignment
    if (section === 'repos') repos.set(key, value)
    if (section === 'stacks') stacks.set(key, value.split(/\s+/).filter(Boolean))
  }

  if (repos.size === 0 || stacks.size === 0)
    fail('atlas manifest has no [repos] or [stacks] entries')
  return { repos, stacks }
}

export function selectRepositories(manifest) {
  const names = new Set()
  for (const stack of INCLUDED_STACKS) {
    const members = manifest.stacks.get(stack)
    if (!members) fail(`atlas manifest is missing the ${stack} stack`)
    for (const name of members) if (!EXCLUDED_REPOS.has(name)) names.add(name)
  }

  return [...names].sort().map((name) => {
    const remote = manifest.repos.get(name)
    const match = remote?.match(/^git@github\.com:(specklesystems\/[A-Za-z0-9_.-]+)\.git$/)
    if (!match) fail(`selected repo ${name} has no validated specklesystems GitHub SSH remote`)
    return { name, slug: match[1] }
  })
}

export function classifyPullRequest(repo, baseRefName, headRefName) {
  if (DEV_MAIN_REPOS.has(repo)) {
    if (baseRefName === 'dev') return 'candidate'
    if (baseRefName === 'main' && headRefName === 'dev') return 'landed-boundary'
    return 'other'
  }
  return baseRefName === 'main' ? 'landed' : 'other'
}

function trimBody(value, limit) {
  return (value || '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<img[^>]*>/gi, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\r/g, '')
    .trim()
    .slice(0, limit)
}

async function defaultRunGh(args) {
  const ghBinary = process.env.GH_BIN || 'gh'
  const { stdout } = await execFile(ghBinary, args, { maxBuffer: 32 * 1024 * 1024 })
  return stdout
}

async function fileExists(candidate) {
  try {
    await access(candidate)
    return true
  } catch {
    return false
  }
}

export async function resolveManifest({
  startDir = process.cwd(),
  env = process.env,
  read = readFile,
  exists = fileExists,
  runGh = defaultRunGh
} = {}) {
  const explicit = []
  if (env.ATLAS_MANIFEST) explicit.push(path.resolve(env.ATLAS_MANIFEST))
  if (env.ATLAS_ROOT) explicit.push(path.resolve(env.ATLAS_ROOT, 'atlas/manifest.toml'))

  for (const candidate of explicit) {
    if (!(await exists(candidate))) fail(`configured atlas manifest does not exist: ${candidate}`)
    const content = await read(candidate, 'utf8')
    parseManifest(content)
    return { content, source: candidate }
  }

  let cursor = path.resolve(startDir)
  while (true) {
    const candidate = path.join(cursor, 'atlas/manifest.toml')
    if (await exists(candidate)) {
      const content = await read(candidate, 'utf8')
      parseManifest(content)
      return { content, source: candidate }
    }
    const parent = path.dirname(cursor)
    if (parent === cursor) break
    cursor = parent
  }

  const endpoint = `repos/${REMOTE_MANIFEST.repo}/contents/${REMOTE_MANIFEST.path}?ref=${REMOTE_MANIFEST.ref}`
  const content = await runGh(['api', '-H', 'Accept: application/vnd.github.raw+json', endpoint])
  parseManifest(content)
  return {
    content,
    source: `github:${REMOTE_MANIFEST.repo}@${REMOTE_MANIFEST.ref}/${REMOTE_MANIFEST.path}`
  }
}

export async function paginate({
  endpoint,
  runGh = defaultRunGh,
  maxPages = DEFAULT_MAX_PAGES,
  stopAfterPage = () => false
}) {
  const rows = []
  for (let page = 1; page <= maxPages; page += 1) {
    const separator = endpoint.includes('?') ? '&' : '?'
    const raw = await runGh(['api', `${endpoint}${separator}per_page=${PAGE_SIZE}&page=${page}`])
    const batch = JSON.parse(raw)
    if (!Array.isArray(batch)) fail(`GitHub endpoint did not return an array: ${endpoint}`)
    rows.push(...batch)
    if (batch.length < PAGE_SIZE || stopAfterPage(batch)) return rows
  }
  fail(`GitHub pagination exceeded ${maxPages} pages: ${endpoint}`)
}

async function collectRepository(repository, window, runGh, maxPages) {
  await runGh(['api', `repos/${repository.slug}`, '--jq', '.full_name'])

  const pulls = await paginate({
    endpoint: `repos/${repository.slug}/pulls?state=closed&sort=updated&direction=desc`,
    runGh,
    maxPages,
    stopAfterPage: (batch) =>
      Boolean(batch.at(-1)?.updated_at && batch.at(-1).updated_at < window.from)
  })
  const releases = await paginate({
    endpoint: `repos/${repository.slug}/releases`,
    runGh,
    maxPages
  })

  return {
    pulls: pulls
      .filter((pull) => pull.merged_at && withinWindow(pull.merged_at, window))
      .map((pull) => ({
        repo: repository.name,
        number: pull.number,
        title: pull.title,
        url: pull.html_url,
        mergedAt: pull.merged_at,
        mergeCommitSha: pull.merge_commit_sha,
        headRefName: pull.head?.ref,
        baseRefName: pull.base?.ref,
        state: classifyPullRequest(repository.name, pull.base?.ref, pull.head?.ref),
        author: pull.user?.login,
        labels: (pull.labels || []).map((label) => label.name).sort(),
        body: trimBody(pull.body, 3000)
      })),
    releases: releases
      .filter(
        (release) =>
          withinWindow(release.published_at, window) || withinWindow(release.updated_at, window)
      )
      .map((release) => ({
        repo: repository.name,
        id: release.id,
        name: release.name,
        tagName: release.tag_name,
        targetCommitish: release.target_commitish,
        url: release.html_url,
        draft: Boolean(release.draft),
        prerelease: Boolean(release.prerelease),
        publishedAt: release.published_at,
        updatedAt: release.updated_at,
        windowReason: withinWindow(release.published_at, window) ? 'published' : 'updated',
        assets: (release.assets || [])
          .map((asset) => ({ name: asset.name, url: asset.browser_download_url }))
          .sort((a, b) => a.name.localeCompare(b.name)),
        body: trimBody(release.body, 6000)
      }))
  }
}

function jsonLines(rows) {
  return rows.map((row) => JSON.stringify(row)).join('\n') + (rows.length ? '\n' : '')
}

export async function writeEvidenceAtomically(outputDir, files) {
  const target = path.resolve(outputDir)
  if (target === path.parse(target).root) fail('OUTPUT_DIR cannot be a filesystem root')
  if (await fileExists(target)) {
    const info = await lstat(target)
    if (!info.isDirectory() || info.isSymbolicLink()) fail('OUTPUT_DIR must be a real directory')
  }

  const parent = path.dirname(target)
  await mkdir(parent, { recursive: true })
  const stage = await mkdtemp(path.join(parent, '.technical-changelog-stage-'))
  const backups = []
  const installed = []

  try {
    for (const [name, content] of Object.entries(files)) {
      await writeFile(path.join(stage, name), content, 'utf8')
    }
    await mkdir(target, { recursive: true })
    for (const name of Object.keys(files)) {
      const destination = path.join(target, name)
      if (await fileExists(destination)) {
        const backup = path.join(parent, `.technical-changelog-backup-${process.pid}-${name}`)
        await rename(destination, backup)
        backups.push({ destination, backup })
      }
      await rename(path.join(stage, name), destination)
      installed.push(destination)
    }
    for (const { backup } of backups) await rm(backup, { force: true })
  } catch (error) {
    for (const destination of installed.reverse()) await rm(destination, { force: true })
    for (const { destination, backup } of backups.reverse()) {
      if (await fileExists(backup)) await rename(backup, destination)
    }
    throw error
  } finally {
    await rm(stage, { recursive: true, force: true })
  }
}

export async function collectEvidence({ env = process.env, runGh = defaultRunGh } = {}) {
  const window = validateWindow(env.WINDOW_FROM, env.WINDOW_TO)
  if (!env.OUTPUT_DIR) fail('OUTPUT_DIR is required')
  const maxPages = Number(env.MAX_PAGES || DEFAULT_MAX_PAGES)
  if (!Number.isInteger(maxPages) || maxPages < 1) fail('MAX_PAGES must be a positive integer')

  const resolved = await resolveManifest({ env, runGh })
  const repositories = selectRepositories(parseManifest(resolved.content))
  const pullRows = []
  const releaseRows = []

  for (const repository of repositories) {
    const collected = await collectRepository(repository, window, runGh, maxPages)
    pullRows.push(...collected.pulls)
    releaseRows.push(...collected.releases)
  }

  pullRows.sort(
    (a, b) =>
      a.mergedAt.localeCompare(b.mergedAt) || a.repo.localeCompare(b.repo) || a.number - b.number
  )
  releaseRows.sort(
    (a, b) =>
      (a.publishedAt || a.updatedAt).localeCompare(b.publishedAt || b.updatedAt) ||
      a.repo.localeCompare(b.repo) ||
      a.tagName.localeCompare(b.tagName)
  )

  const metadata = {
    schemaVersion: 1,
    window,
    manifestSource: resolved.source,
    repositories,
    counts: { pullRequests: pullRows.length, releases: releaseRows.length }
  }
  await writeEvidenceAtomically(env.OUTPUT_DIR, {
    'prs.jsonl': jsonLines(pullRows),
    'releases.jsonl': jsonLines(releaseRows),
    'metadata.json': `${JSON.stringify(metadata, null, 2)}\n`
  })
  return metadata
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  try {
    const metadata = await collectEvidence()
    process.stdout.write(
      `Collected ${metadata.counts.pullRequests} pull requests and ${metadata.counts.releases} releases from ${metadata.repositories.length} repositories.\n`
    )
  } catch (error) {
    process.stderr.write(`${error.message}\n`)
    process.exitCode = 1
  }
}
