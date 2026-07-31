#!/usr/bin/env node
/**
 * Image and video framing check.
 *
 * House style is that screenshots, diagrams, and videos sit inside a <Frame>,
 * which gives them a consistent border, caption slot, and zoom behaviour.
 * The tree is already ~98% consistent, so this check exists to stop drift
 * rather than to force a migration.
 *
 * Flags <img>, <video>, and markdown ![]() that are not inside a <Frame>.
 *
 * Exemptions live in scripts/frame-allowlist.txt, one file path per line.
 * The allowlist is file-level rather than line-level so it does not churn
 * every time a page is edited.
 *
 * Usage:
 *   node scripts/check-frames.mjs
 *   node scripts/check-frames.mjs --warn-only
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const ALLOWLIST = path.join(__dirname, 'frame-allowlist.txt')

/**
 * `legacy/` is frozen historical content, migrated as-is and not held to
 * current authoring conventions.
 */
const SKIP_DIRS = ['node_modules', 'legacy', '.git', '.mintlify']

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || SKIP_DIRS.includes(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (entry.name.endsWith('.mdx')) out.push(full)
  }
  return out
}

/** Character ranges covered by a <Frame>…</Frame>, nesting-aware. */
function frameSpans(text) {
  const spans = []
  for (const open of text.matchAll(/<Frame\b/g)) {
    let depth = 0
    for (const tag of text.slice(open.index).matchAll(/<Frame\b|<\/Frame>/g)) {
      depth += tag[0].startsWith('</') ? -1 : 1
      if (depth === 0) {
        spans.push([open.index, open.index + tag.index + tag[0].length])
        break
      }
    }
  }
  return spans
}

function loadAllowlist() {
  if (!fs.existsSync(ALLOWLIST)) return new Set()
  return new Set(
    fs
      .readFileSync(ALLOWLIST, 'utf8')
      .split('\n')
      .map((line) => line.replace(/#.*$/, '').trim())
      .filter(Boolean)
  )
}

function main() {
  const warnOnly = process.argv.includes('--warn-only')
  const allowed = loadAllowlist()
  const findings = []
  let total = 0
  let framed = 0

  for (const file of walk(root)) {
    const rel = path.relative(root, file).split(path.sep).join('/')
    const text = fs.readFileSync(file, 'utf8')
    const spans = frameSpans(text)

    for (const match of text.matchAll(/<img\b|<video\b|!\[[^\]]*\]\(/g)) {
      total++
      if (spans.some(([a, b]) => match.index >= a && match.index < b)) {
        framed++
        continue
      }
      if (allowed.has(rel)) continue
      findings.push({
        file: rel,
        line: text.slice(0, match.index).split('\n').length,
        kind: match[0].startsWith('!') ? 'markdown image' : match[0].replace('<', '') + ' tag'
      })
    }
  }

  console.log(`Checked ${total} images and videos — ${framed} inside a <Frame>.\n`)

  if (!findings.length) {
    console.log('No unframed images or videos.')
    return
  }

  console.log(`${findings.length} not inside a <Frame>:\n`)
  for (const f of findings) console.log(`  ${f.file}:${f.line}  (${f.kind})`)
  console.log(
    '\nWrap it in <Frame> — add a caption if the image carries meaning.\n' +
      'If an image is deliberately unframed (inline icon, badge, logo),\n' +
      'add the file to scripts/frame-allowlist.txt with a reason.'
  )

  if (!warnOnly) process.exitCode = 1
}

main()
