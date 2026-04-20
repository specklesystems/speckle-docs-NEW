/**
 * Fix MDX parser issues inside Mint wrapper blocks by normalising indentation of
 * JSX bodies that mix markdown lists with components.
 *
 * Targets:
 * - `<AccordionGroup>` … each non–self-closing `<Accordion>…</Accordion>`
 * - `<Steps>` … each non–self-closing `<Step>…</Step>`
 *
 * Rule (matches English connector pages): body lines use the same leading spaces
 * as the opening tag line, plus two spaces. Relative indents preserved via
 * dedent-then-add.
 *
 * Pass order: `<Steps>` blocks first, then `<AccordionGroup>`, so nested blocks
 * are still reachable.
 *
 * Usage:
 *   node scripts/reindent-accordion-mdx.mjs [--write] [file.mdx ...]
 *   node scripts/reindent-accordion-mdx.mjs --write   # all es MDX files
 *
 * Without --write, prints which files would change only.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import fs from 'node:fs/promises'
import nodePath from 'node:path'
import nodeUrl from 'node:url'

const REPO_ROOT = nodePath.dirname(nodePath.dirname(nodeUrl.fileURLToPath(import.meta.url)))

const WRITE = process.argv.includes('--write')
const args = process.argv.slice(2).filter((a) => a !== '--write')

/**
 * @param {string[]} lines
 * @returns {string[]}
 */
function dedentLogicalLines(lines) {
  const meaningful = lines.filter((l) => l.trim().length > 0)
  if (meaningful.length === 0) return lines.map(() => '')
  let min = Infinity
  for (const l of meaningful) {
    const m = /^[\t ]*/.exec(l)
    const n = m ? m[0].length : 0
    if (n < min) min = n
  }
  if (!Number.isFinite(min) || min === Infinity) min = 0
  return lines.map((l) => {
    if (!l.trim()) return ''
    return l.slice(min)
  })
}

/**
 * @param {string} body raw between `>` and closing tag
 * @param {string} tagLineIndent spaces/tabs before `<Tag` on its line
 */
function reindentTaggedBody(body, tagLineIndent) {
  const pad = `${tagLineIndent}  `
  let rawLines = body.split(/\r?\n/)
  while (rawLines.length > 0 && rawLines[0].trim() === '') rawLines.shift()
  while (rawLines.length > 0 && rawLines[rawLines.length - 1].trim() === '') rawLines.pop()
  const dedented = dedentLogicalLines(rawLines)
  const out = dedented.map((l) => (l === '' ? '' : `${pad}${l}`))
  return `\n${out.join('\n')}\n`
}

/**
 * @param {string} inner
 * @param {'Accordion' | 'Step'} tag
 */
function processInnerTaggedBlocks(inner, tag) {
  const openRe = new RegExp(`<${tag}(\\s[^>]*)?>`, 'gi')
  const closeLiteral = `</${tag}>`
  let pos = 0
  let out = ''
  while (pos < inner.length) {
    openRe.lastIndex = pos
    const m = openRe.exec(inner)
    if (!m) {
      out += inner.slice(pos)
      break
    }
    const idx = m.index
    out += inner.slice(pos, idx)
    const openTag = m[0]
    const lineStart = inner.lastIndexOf('\n', idx - 1) + 1
    const tagLineIndent = inner.slice(lineStart, idx)
    if (!/^[\t ]*$/.test(tagLineIndent)) {
      out += inner.slice(idx)
      pos = inner.length
      break
    }
    const selfClosing = /\/\s*>$/.test(openTag.trimEnd())
    if (selfClosing) {
      out += openTag
      pos = idx + openTag.length
      continue
    }
    const bodyStart = idx + openTag.length
    const closeIdx = inner.indexOf(closeLiteral, bodyStart)
    if (closeIdx === -1) {
      out += inner.slice(idx)
      break
    }
    const closeLineStart = inner.lastIndexOf('\n', closeIdx - 1) + 1
    const body = inner.slice(bodyStart, closeLineStart)
    const closeTag = inner.slice(closeLineStart, closeIdx + closeLiteral.length)
    const newBody = reindentTaggedBody(body, tagLineIndent)
    out += openTag + newBody + closeTag
    pos = closeIdx + closeLiteral.length
  }
  return out
}

/**
 * @param {string} source
 * @returns {{ next: string, changed: boolean }}
 */
function transformSource(source) {
  let changed = false
  let next = source

  const stepsRe = /<Steps\b[^>]*>([\s\S]*?)<\/Steps>/gi
  next = next.replace(stepsRe, (full, inner) => {
    const processed = processInnerTaggedBlocks(inner, 'Step')
    if (processed !== inner) changed = true
    const openM = /^<Steps\b[^>]*>/.exec(full)
    const open = openM ? openM[0] : '<Steps>'
    return processed !== inner ? `${open}${processed}</Steps>` : full
  })

  const groupRe = /<AccordionGroup\b[^>]*>([\s\S]*?)<\/AccordionGroup>/gi
  next = next.replace(groupRe, (full, inner) => {
    const processed = processInnerTaggedBlocks(inner, 'Accordion')
    if (processed !== inner) changed = true
    const openM = /^<AccordionGroup\b[^>]*>/.exec(full)
    const open = openM ? openM[0] : '<AccordionGroup>'
    return processed !== inner ? `${open}${processed}</AccordionGroup>` : full
  })

  return { next, changed }
}

async function collectDefaultFiles() {
  /** @type {string[]} */
  const out = []
  async function walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const e of entries) {
      const p = nodePath.join(dir, e.name)
      if (e.isDirectory()) await walk(p)
      else if (e.isFile() && e.name.endsWith('.mdx')) out.push(p)
    }
  }
  const esDir = nodePath.join(REPO_ROOT, 'es')
  if (existsSync(esDir)) await walk(esDir)
  return out
}

function fileNeedsScan(raw) {
  const s = raw.toLowerCase()
  return s.includes('<steps') || s.includes('<accordiongroup')
}

async function main() {
  /** @type {string[]} */
  let files = args.map((a) => nodePath.resolve(REPO_ROOT, a))
  if (files.length === 0) files = await collectDefaultFiles()

  let touched = 0
  for (const abs of files) {
    if (!existsSync(abs)) {
      console.warn('skip missing:', abs)
      continue
    }
    const rel = nodePath.relative(REPO_ROOT, abs)
    const raw = readFileSync(abs, 'utf8')
    if (!fileNeedsScan(raw)) continue
    const { next, changed } = transformSource(raw)
    if (!changed) continue
    touched += 1
    console.log(WRITE ? 'write' : 'would write', rel)
    if (WRITE) writeFileSync(abs, next, 'utf8')
  }
  console.log(WRITE ? `Updated ${touched} file(s).` : `${touched} file(s) would change. Pass --write to apply.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
