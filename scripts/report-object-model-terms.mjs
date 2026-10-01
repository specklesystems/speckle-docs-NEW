#!/usr/bin/env node
/**
 * Report superseded glossary terms in next/ prose.
 *
 * Parses the `**term** (was: *legacy*, ...)` rows of atlas/glossary.md and
 * lists every next/*.mdx line that uses a legacy term outside code spans,
 * fenced blocks and MDX comments. Hits never fail the run: a legacy term
 * named for reader comparison is correct, so each hit is a judgement call.
 *
 * Usage:
 *   node scripts/report-object-model-terms.mjs
 *   node scripts/report-object-model-terms.mjs --checkout-root /path/to/speckle-atlas
 *
 * The checkout root defaults to $ATLAS_ROOT, then the parent of this repo
 * (the nested speckle-atlas layout).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

function argValue(flag) {
  const index = process.argv.indexOf(flag)
  if (index === -1 || index === process.argv.length - 1) return ''
  return process.argv[index + 1]
}

function checkoutRoot() {
  return argValue('--checkout-root') || process.env.ATLAS_ROOT || path.resolve(root, '..')
}

/** Every {canonical, legacyTerms} pair from a `**term** (was: *a*, *b*)` row. */
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

/** Blank out code and comments while keeping newlines, so line numbers stay right. */
function stripNonProse(mdx) {
  const blank = (m) => m.replace(/[^\n]/g, '')
  return mdx
    .replace(/```[\s\S]*?```/g, blank)
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, blank)
    .replace(/`[^`]*`/g, blank)
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (entry.name.endsWith('.mdx')) out.push(full)
  }
  return out
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function main() {
  const glossaryPath = path.join(checkoutRoot(), 'atlas', 'glossary.md')
  if (!fs.existsSync(glossaryPath)) {
    console.error(`Could not find ${glossaryPath}. Pass --checkout-root <path> or set ATLAS_ROOT.`)
    process.exitCode = 1
    return
  }

  const renames = parseRenames(fs.readFileSync(glossaryPath, 'utf8'))
  const files = walk(path.join(root, 'next'))

  console.log(
    `Checking ${files.length} next/ page(s) against ${renames.length} glossary rename(s).\n`
  )

  let hits = 0
  for (const file of files) {
    const lines = stripNonProse(fs.readFileSync(file, 'utf8')).split('\n')
    for (const { canonical, legacyTerms } of renames) {
      for (const legacy of legacyTerms) {
        const wordRe = new RegExp(`\\b${escapeRegExp(legacy)}\\b`, 'i')
        lines.forEach((line, i) => {
          if (!wordRe.test(line)) return
          hits++
          console.log(
            `${path.relative(root, file)}:${i + 1}  uses "${legacy}" — glossary canonical term is "${canonical}"`
          )
        })
      }
    }
  }

  if (!hits) {
    console.log('No superseded terms found in next/ prose.')
    return
  }

  console.log(
    `\n${hits} hit(s). A legacy term naming what the reader migrates FROM is fine;\n` +
      'the same term standing in for the 2026.9 concept is the bug.'
  )
}

main()
