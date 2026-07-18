#!/usr/bin/env node
/**
 * Realign GFM tables for markdownlint MD060 style "aligned" (string-width aware).
 *
 * Usage:
 *   node scripts/align-md-tables.mjs [paths...]
 *   node scripts/align-md-tables.mjs developers/
 */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const requireFromRoot = createRequire(path.join(root, 'package.json'))

function loadStringWidth() {
  try {
    return requireFromRoot('string-width')
  } catch {
    // pnpm nests it under markdownlint
    const candidates = fs
      .readdirSync(path.join(root, 'node_modules/.pnpm'))
      .filter((d) => d.startsWith('string-width@'))
      .sort()
    for (const d of candidates.reverse()) {
      const pkg = path.join(root, 'node_modules/.pnpm', d, 'node_modules/string-width')
      if (fs.existsSync(pkg)) {
        return createRequire(path.join(pkg, 'package.json'))(pkg)
      }
    }
    throw new Error('string-width not found; run pnpm install')
  }
}

const stringWidthMod = loadStringWidth()
const stringWidth = stringWidthMod.default ?? stringWidthMod

function isSepCell(c) {
  const t = c.trim().replace(/ /g, '')
  return /^:?-{3,}:?$/.test(t)
}

function isSepRow(cells) {
  return cells.length > 0 && cells.every(isSepCell)
}

function parseRow(line) {
  const s = line.replace(/\n$/, '')
  if (!s.trim().startsWith('|')) return null
  let raw = s.trim()
  if (raw.startsWith('|')) raw = raw.slice(1)
  if (raw.endsWith('|')) raw = raw.slice(0, -1)
  return raw.split('|').map((c) => c.trim())
}

function padEndWidth(text, width) {
  const w = stringWidth(text)
  if (w >= width) return text
  return text + ' '.repeat(width - w)
}

function formatTable(rows) {
  const cols = Math.max(...rows.map((r) => r.length))
  const norm = rows.map((r) => {
    const copy = [...r]
    while (copy.length < cols) copy.push('')
    return copy
  })
  const widths = Array(cols).fill(3)
  for (const r of norm) {
    if (isSepRow(r)) continue
    for (let i = 0; i < cols; i++) {
      widths[i] = Math.max(widths[i], stringWidth(r[i]))
    }
  }
  return norm.map((r) => {
    if (isSepRow(r)) {
      return '| ' + widths.map((w) => '-'.repeat(w)).join(' | ') + ' |'
    }
    return '| ' + r.map((c, i) => padEndWidth(c, widths[i])).join(' | ') + ' |'
  })
}

function processText(text) {
  const lines = text.split(/(?<=\n)/)
  const out = []
  let i = 0
  let inFence = false
  while (i < lines.length) {
    const line = lines[i]
    if (line.trimStart().startsWith('```')) {
      inFence = !inFence
      out.push(line)
      i++
      continue
    }
    if (inFence) {
      out.push(line)
      i++
      continue
    }
    const cells = parseRow(line)
    if (!cells) {
      out.push(line)
      i++
      continue
    }
    const blockLines = [line]
    const blockRows = [cells]
    let j = i + 1
    while (j < lines.length) {
      const c2 = parseRow(lines[j])
      if (!c2) break
      blockLines.push(lines[j])
      blockRows.push(c2)
      j++
    }
    if (blockRows.length >= 2 && isSepRow(blockRows[1])) {
      const formatted = formatTable(blockRows)
      for (let k = 0; k < formatted.length; k++) {
        const endsNl = blockLines[Math.min(k, blockLines.length - 1)].endsWith('\n')
        out.push(formatted[k] + (endsNl || k < formatted.length - 1 ? '\n' : ''))
      }
      if (out.length && !out[out.length - 1].endsWith('\n') && text.endsWith('\n')) {
        out[out.length - 1] += '\n'
      }
      i = j
    } else {
      out.push(line)
      i++
    }
  }
  return out.join('')
}

function collectFiles(args) {
  const files = []
  for (const arg of args) {
    const p = path.resolve(arg)
    const st = fs.statSync(p)
    if (st.isFile() && /\.mdx?$/.test(p)) files.push(p)
    else if (st.isDirectory()) {
      const walk = (dir) => {
        for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
          const fp = path.join(dir, ent.name)
          if (ent.isDirectory()) {
            if (ent.name === 'node_modules' || ent.name === '.git') continue
            walk(fp)
          } else if (/\.mdx?$/.test(ent.name)) files.push(fp)
        }
      }
      walk(p)
    }
  }
  return files.sort()
}

const args = process.argv.slice(2)
const targets = args.length ? args : ['developers/']
const files = collectFiles(targets)
let changed = 0
for (const file of files) {
  const original = fs.readFileSync(file, 'utf8')
  const updated = processText(original)
  if (updated !== original) {
    fs.writeFileSync(file, updated)
    changed++
    console.log('aligned', path.relative(process.cwd(), file))
  }
}
console.log(`done: ${changed} file(s) updated of ${files.length}`)
