#!/usr/bin/env node
/**
 * Glossary terminology check for next/ pages.
 *
 * atlas/glossary.md is explicit: "When a term is renamed, the rename lands
 * here first and every repo follows." It also says legacy terms
 * ("stream", "branch", "commit", ...) correctly survive in old code and
 * Current-corpus docs describing the pre-2026.9 model. next/ pages are a
 * different case: they exist specifically to describe 2026.9, so a
 * superseded term appearing there in PROSE (not as a literal code
 * identifier) is very likely a mistake, not a legitimate legacy reference.
 *
 * This script parses glossary.md's `**term** (was: *legacy*, *legacy2*)`
 * rows and flags any next/*.mdx page that still uses a legacy term outside
 * a code span or fenced code block. It is informational, not blocking
 * (like report:placeholders) — some hits are legitimate (a "why don't I see
 * X" FAQ deliberately naming the old term for reader recognition, e.g.
 * relations.mdx's IN_NETWORK/IN_SPACE entries — those are relation names,
 * not glossary terms, so they won't collide, but judgment calls like that
 * are exactly why this doesn't fail the build on its own).
 *
 * Usage:
 *   node scripts/check-object-model-terms.mjs
 *   node scripts/check-object-model-terms.mjs --glossary /path/to/atlas/glossary.md
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

function resolveGlossaryPath() {
  const flagIdx = process.argv.indexOf('--glossary')
  if (flagIdx !== -1 && process.argv[flagIdx + 1]) return process.argv[flagIdx + 1]
  return path.resolve(root, '..', 'atlas', 'glossary.md')
}

/** Every {canonical, legacy[]} pair from a `**term** (was: *a*, *b*)` row. */
function parseRenames(glossaryMd) {
  const renames = []
  const re = /\*\*([^*]+)\*\*\s*\(was:\s*([^)]+)\)/g
  let m
  while ((m = re.exec(glossaryMd))) {
    const canonical = m[1].trim()
    const legacyTerms = [...m[2].matchAll(/\*([^*]+)\*/g)].map((x) => x[1].trim())
    if (legacyTerms.length) renames.push({ canonical, legacyTerms })
  }
  return renames
}

/** Strip fenced code blocks and inline `code spans` so identifiers don't false-positive. */
function stripCode(mdx) {
  return mdx.replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, '')
}

function findMdxFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) findMdxFiles(full, out)
    else if (entry.name.endsWith('.mdx')) out.push(full)
  }
  return out
}

function main() {
  const glossaryPath = resolveGlossaryPath()
  if (!fs.existsSync(glossaryPath)) {
    console.error(
      `Could not find ${glossaryPath}. Pass --glossary <path>, or check the atlas sibling checkout exists.`
    )
    process.exitCode = 1
    return
  }

  const renames = parseRenames(fs.readFileSync(glossaryPath, 'utf8'))
  const nextDir = path.join(root, 'next')
  if (!fs.existsSync(nextDir)) {
    console.error(`Could not find ${nextDir}.`)
    process.exitCode = 1
    return
  }
  const files = findMdxFiles(nextDir)

  console.log(`Checking ${files.length} next/ page(s) against ${renames.length} glossary rename(s).\n`)

  let hits = 0
  for (const file of files) {
    const raw = fs.readFileSync(file, 'utf8')
    const stripped = stripCode(raw)
    const lines = stripped.split('\n')

    for (const { canonical, legacyTerms } of renames) {
      for (const legacy of legacyTerms) {
        const wordRe = new RegExp(`\\b${legacy.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
        lines.forEach((line, i) => {
          if (wordRe.test(line)) {
            hits++
            console.log(
              `${path.relative(root, file)}:${i + 1}  uses "${legacy}" — glossary canonical term is "${canonical}"`
            )
          }
        })
      }
    }
  }

  if (!hits) {
    console.log('No superseded terms found in next/ prose.')
    return
  }

  console.log(
    `\n${hits} hit(s). Not necessarily wrong — check each: a legacy term naming what the reader is\n` +
      'migrating FROM (a "here\'s what changed" comparison) is fine; the same term standing in\n' +
      'for the current 2026.9 concept is the actual bug.'
  )
}

main()
