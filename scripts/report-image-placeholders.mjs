#!/usr/bin/env node
/**
 * Catalogue IMAGE_PLACEHOLDER comments — outstanding screenshots and clips.
 *
 * Always succeeds. This is a shot list, not a gate. Capture later replaces
 * each comment with a <Frame>; until then CI reports the backlog.
 *
 * Usage:
 *   node scripts/report-image-placeholders.mjs
 *   node scripts/report-image-placeholders.mjs --markdown
 *   node scripts/report-image-placeholders.mjs --markdown --annotate
 *
 * Optional DIFF_RANGE (env or --diff BASE...HEAD) adds a PR delta.
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const SKIP_DIRS = [
  'node_modules',
  '.git',
  '.mintlify',
  'legacy',
  'classic',
  'snippets',
  '.universal-ai-config',
  '.cursor',
  '.claude'
]

const PLACEHOLDER_RE = /\{\/\*\s*IMAGE[_\s-]?PLACEHOLDER:\s*(.*?)\s*\*\/\}/i
const ANNOTATION_CAP = 10

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || SKIP_DIRS.includes(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (entry.name.endsWith('.mdx')) out.push(full)
  }
  return out
}

function bucket(rel) {
  const parts = rel.split('/')
  if (parts[0] === 'next') {
    if (parts.length === 2) return 'next'
    return `next/${parts[1]}`
  }
  return parts[0]
}

function extractFromText(text, file) {
  const hits = []
  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(PLACEHOLDER_RE)
    if (match) hits.push({ file, line: i + 1, text: match[1].trim() })
  }
  return hits
}

function extractFromLine(line) {
  const match = line.match(PLACEHOLDER_RE)
  return match ? match[1].trim() : null
}

function argValue(flag) {
  const index = process.argv.indexOf(flag)
  if (index === -1 || index === process.argv.length - 1) return ''
  return process.argv[index + 1]
}

function diffRange() {
  return argValue('--diff') || process.env.DIFF_RANGE || ''
}

function diffPlaceholders(range) {
  const added = []
  const removed = []
  if (!range) return { added, removed }

  let raw = ''
  try {
    raw = execFileSync('git', ['diff', '-U0', range, '--', '*.mdx'], {
      encoding: 'utf8',
      cwd: root,
      stdio: ['ignore', 'pipe', 'ignore']
    })
  } catch {
    return { added, removed }
  }

  let file = ''
  for (const line of raw.split('\n')) {
    if (line.startsWith('+++ b/')) {
      file = line.slice(6)
      continue
    }
    if (line.startsWith('+++ /dev/null')) {
      file = ''
      continue
    }
    const isPlus = line.startsWith('+') && !line.startsWith('+++')
    const isMinus = line.startsWith('-') && !line.startsWith('---')
    if (!isPlus && !isMinus) continue
    const text = extractFromLine(line.slice(1))
    if (!text || !file) continue
    if (isPlus) added.push({ file, text })
    else removed.push({ file, text })
  }
  return { added, removed }
}

function groupBy(items, keyFn) {
  const groups = new Map()
  for (const item of items) {
    const key = keyFn(item)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(item)
  }
  return groups
}

function pad(value, width) {
  return String(value).padEnd(width)
}

function encodeAnnot(value) {
  return value.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A')
}

function countsByBucket(hits) {
  const counts = new Map()
  for (const hit of hits) {
    const key = bucket(hit.file)
    counts.set(key, (counts.get(key) || 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
}

function formatPlain(hits, delta) {
  const files = new Set(hits.map((hit) => hit.file))
  const lines = []
  lines.push(
    `${hits.length} outstanding screenshot${hits.length === 1 ? '' : 's'} in ${files.size} page${
      files.size === 1 ? '' : 's'
    }.`
  )
  lines.push('')

  if (delta.added.length || delta.removed.length) {
    lines.push(`This PR: +${delta.added.length} added, −${delta.removed.length} removed.`)
    lines.push('')
  }

  const counts = countsByBucket(hits)
  const treeWidth = Math.max(4, ...counts.map(([tree]) => tree.length))
  for (const [tree, count] of counts) {
    lines.push(`  ${pad(tree, treeWidth)}  ${count}`)
  }
  lines.push('')

  const byFile = groupBy(hits, (hit) => hit.file)
  for (const file of [...byFile.keys()].sort()) {
    lines.push(file)
    for (const hit of byFile.get(file)) {
      lines.push(`  ${String(hit.line).padStart(4)}  ${hit.text}`)
    }
    lines.push('')
  }

  lines.push('Replace each comment with a <Frame> plus the captured asset.')
  return lines.join('\n')
}

function formatMarkdown(hits, delta) {
  const files = new Set(hits.map((hit) => hit.file))
  const lines = []
  lines.push('## Image placeholders')
  lines.push('')
  lines.push(
    'Outstanding visual assets marked `{/* IMAGE_PLACEHOLDER: … */}`. Informational — does not block merge.'
  )
  lines.push('')
  lines.push(
    `**${hits.length} placeholder${hits.length === 1 ? '' : 's'}** across **${files.size} page${
      files.size === 1 ? '' : 's'
    }**.`
  )
  lines.push('')

  if (delta.added.length || delta.removed.length) {
    lines.push('### This PR')
    lines.push('')
    lines.push(`+${delta.added.length} added, −${delta.removed.length} removed.`)
    lines.push('')
    if (delta.added.length) {
      lines.push('Added:')
      lines.push('')
      for (const item of delta.added) {
        lines.push(`- \`${item.file}\` — ${item.text}`)
      }
      lines.push('')
    }
    if (delta.removed.length) {
      lines.push('Removed:')
      lines.push('')
      for (const item of delta.removed) {
        lines.push(`- \`${item.file}\` — ${item.text}`)
      }
      lines.push('')
    }
  }

  const counts = countsByBucket(hits)
  if (counts.length) {
    const treeWidth = Math.max('Tree'.length, ...counts.map(([tree]) => tree.length))
    const countWidth = Math.max('Count'.length, ...counts.map(([, count]) => String(count).length))
    lines.push('| ' + pad('Tree', treeWidth) + ' | ' + pad('Count', countWidth) + ' |')
    lines.push('| ' + '-'.repeat(treeWidth) + ' | ' + '-'.repeat(countWidth) + ' |')
    for (const [tree, count] of counts) {
      lines.push('| ' + pad(tree, treeWidth) + ' | ' + pad(String(count), countWidth) + ' |')
    }
    lines.push('')
  }

  if (!hits.length) {
    lines.push('No outstanding screenshots.')
    return lines.join('\n')
  }

  lines.push('### Catalogue')
  lines.push('')
  const byFile = groupBy(hits, (hit) => hit.file)
  for (const file of [...byFile.keys()].sort()) {
    const fileHits = byFile.get(file)
    lines.push(`#### \`${file}\` (${fileHits.length})`)
    lines.push('')
    for (const hit of fileHits) {
      lines.push(`- L${hit.line}: ${hit.text}`)
    }
    lines.push('')
  }

  lines.push('Replace each comment with a `<Frame>` plus the captured asset.')
  return lines.join('\n')
}

function annotate(hits) {
  const slice = hits.slice(0, ANNOTATION_CAP)
  for (const hit of slice) {
    const message = encodeAnnot(`IMAGE_PLACEHOLDER: ${hit.text}`)
    console.log(`::notice file=${hit.file},line=${hit.line}::${message}`)
  }
  if (hits.length > ANNOTATION_CAP) {
    console.log(
      `::notice::${hits.length - ANNOTATION_CAP} more IMAGE_PLACEHOLDER comments — see the job summary.`
    )
  }
}

function main() {
  const markdown = process.argv.includes('--markdown')
  const doAnnotate = process.argv.includes('--annotate')
  const hits = []

  for (const file of walk(root)) {
    const rel = path.relative(root, file).split(path.sep).join('/')
    hits.push(...extractFromText(fs.readFileSync(file, 'utf8'), rel))
  }

  hits.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line)
  const delta = diffPlaceholders(diffRange())
  const report = markdown ? formatMarkdown(hits, delta) : formatPlain(hits, delta)

  if (doAnnotate) {
    const changed = new Set(delta.added.map((item) => `${item.file}\0${item.text}`))
    const prHits = changed.size ? hits.filter((hit) => changed.has(`${hit.file}\0${hit.text}`)) : []
    if (prHits.length) annotate(prHits)
  }

  console.log(report)

  const summaryPath = process.env.GITHUB_STEP_SUMMARY
  if (summaryPath)
    fs.appendFileSync(summaryPath, `${markdown ? report : formatMarkdown(hits, delta)}\n`)
}

main()
