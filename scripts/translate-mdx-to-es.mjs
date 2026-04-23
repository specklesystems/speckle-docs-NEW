/**
 * Draft: copy English MDX to es/<same-path>.mdx with Cloud Translation (v2).
 * Env: GOOGLE_CLOUD_TRANSLATE_API_KEY (Translation API v2 key on a GCP project).
 *
 * Usage: node scripts/translate-mdx-to-es.mjs path/to/page [more/pages...]
 * Paths are Mint page paths without extension (e.g. beta/new-frontend-beta,
 * snippets/connectors/setup → writes snippets/es/connectors/setup.mdx). Files without
 * YAML frontmatter (most snippets) still
 * translate: the whole file body is sent through the same MDX-aware pipeline.
 *
 * Phrases listed in scripts/do-not-translate-terms.json are replaced with placeholders
 * before each API call and restored afterward (longest terms first).
 */

import { existsSync, readFileSync } from 'node:fs'
import fs from 'node:fs/promises'
import nodePath from 'node:path'
import nodeUrl from 'node:url'

const REPO_ROOT = nodePath.dirname(nodePath.dirname(nodeUrl.fileURLToPath(import.meta.url)))

const DO_NOT_TRANSLATE_PATH = nodePath.join(REPO_ROOT, 'scripts', 'do-not-translate-terms.json')

/**
 * @returns {string[]}
 */
function loadDoNotTranslateTerms() {
  try {
    const raw = readFileSync(DO_NOT_TRANSLATE_PATH, 'utf8')
    const parsed = JSON.parse(raw)
    const list = Array.isArray(parsed.terms) ? parsed.terms : []
    const trimmed = [...new Set(list.map((t) => String(t).trim()).filter(Boolean))]
    trimmed.sort((a, b) => b.length - a.length)
    return trimmed
  } catch {
    return []
  }
}

const DO_NOT_TRANSLATE_TERMS = loadDoNotTranslateTerms()

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Multi-word: flexible whitespace. Single alphanumerics token: word boundaries.
 * Otherwise: substring match (for names with dots, slashes, etc.).
 * @param {string} term
 * @returns {RegExp | null}
 */
function termToRegex(term) {
  const t = term.trim()
  if (!t) return null
  if (/\s/.test(t)) {
    const parts = t.split(/\s+/).map(escapeRegExp)
    return new RegExp(parts.join('\\s+'), 'gi')
  }
  if (/^[A-Za-z0-9][A-Za-z0-9-]*$/.test(t)) {
    return new RegExp(`\\b${escapeRegExp(t)}\\b`, 'gi')
  }
  return new RegExp(escapeRegExp(t), 'gi')
}

/**
 * @param {string} text
 * @returns {{ text: string, slots: string[] }}
 */
function protectTerms(text) {
  /** @type {string[]} */
  const slots = []
  let out = text
  for (const term of DO_NOT_TRANSLATE_TERMS) {
    const re = termToRegex(term)
    if (!re) continue
    out = out.replace(re, (match) => {
      const id = slots.length
      slots.push(match)
      return `[[[DNT:${id}]]]`
    })
  }
  return { text: out, slots }
}

/**
 * @param {string} text
 * @param {string[]} slots
 */
function unprotectTerms(text, slots) {
  let out = text
  for (let i = slots.length - 1; i >= 0; i--) {
    out = out.split(`[[[DNT:${i}]]]`).join(slots[i])
  }
  return out
}

const TRANSLATE_CHUNK_MAX = 4500

/**
 * Split long masked text for the Translate API without breaking `[[[DNT:n]]]` tokens.
 * @param {string} masked
 * @returns {string[]}
 */
function splitMaskedForTranslateApi(masked) {
  if (masked.length <= TRANSLATE_CHUNK_MAX) return [masked]
  const chunks = []
  let i = 0
  while (i < masked.length) {
    let end = Math.min(i + TRANSLATE_CHUNK_MAX, masked.length)
    if (end < masked.length) {
      const nl = masked.lastIndexOf('\n', end - 1)
      if (nl >= i + Math.floor(TRANSLATE_CHUNK_MAX * 0.5)) end = nl + 1
    }
    let chunk = masked.slice(i, end)
    const partial = /\[\[\[DNT:\d*$/.exec(chunk)
    if (partial) chunk = chunk.slice(0, partial.index)
    if (!chunk) chunk = masked.slice(i, Math.min(i + TRANSLATE_CHUNK_MAX, masked.length))
    chunks.push(chunk)
    i += chunk.length
  }
  return chunks
}

/**
 * Load repo-root `.env` into `process.env` when keys are unset (local dev).
 * GitHub Actions and shells that export vars keep precedence.
 */
function loadDotEnvFromRepoRoot() {
  const envPath = nodePath.join(REPO_ROOT, '.env')
  if (!existsSync(envPath)) return
  const raw = readFileSync(envPath, 'utf8')
  for (let line of raw.split('\n')) {
    line = line.trim()
    if (!line || line.startsWith('#')) continue
    if (line.startsWith('export ')) line = line.slice(7).trim()
    const eq = line.indexOf('=')
    if (eq <= 0) continue
    const name = line.slice(0, eq).trim()
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) continue
    let value = line.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (process.env[name] === undefined) process.env[name] = value
  }
}

loadDotEnvFromRepoRoot()

const API = 'https://translation.googleapis.com/language/translate/v2'

const key = process.env.GOOGLE_CLOUD_TRANSLATE_API_KEY
if (!key) {
  console.error(
    'Missing GOOGLE_CLOUD_TRANSLATE_API_KEY. Use that exact name in repo-root .env or export it in your shell.',
  )
  process.exit(1)
}

const paths = process.argv.slice(2).filter((p) => p && p !== '--')
if (paths.length === 0) {
  console.error('Pass one or more page paths without .mdx (e.g. beta/new-frontend-beta)')
  process.exit(1)
}

/**
 * @param {string[]} texts
 * @returns {Promise<string[]>}
 */
async function translateBatch(texts) {
  const res = await fetch(`${API}?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      q: texts,
      source: 'en',
      target: 'es',
      format: 'text',
    }),
  })
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Translate API ${res.status}: ${errText}`)
  }
  /** @type {{ data?: { translations?: { translatedText: string }[] } }} */
  const json = await res.json()
  const out = json.data?.translations?.map((t) => t.translatedText)
  if (!out || out.length !== texts.length) {
    throw new Error('Unexpected translate API response shape')
  }
  return out
}

/**
 * @param {string} text
 * @returns {Promise<string>}
 */
async function translateOne(text) {
  const { text: masked, slots } = protectTerms(text)
  const parts = splitMaskedForTranslateApi(masked)
  const translated = await translateBatch(parts)
  return unprotectTerms(translated.join(''), slots)
}

/** Escape for JSX/HTML double-quoted attributes (not YAML). */
function escapeDoubleQuotedAttr(value) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

/** Google Translate sometimes renames Mint/MDX tags into Spanish; fix common cases. */
function fixMistakenTranslatedMintTags(s) {
  return s
    .replace(/<\/\s*nota\s*>/gi, '</Note>')
    .replace(/<\s*nota(\s|>)/gi, '<Note$1')
    .replace(/<\/\s*paso\s*>/gi, '</Step>')
    .replace(/<\s*paso(\s)/gi, '<Step$1')
    .replace(/<\/\s*pasos\s*>/gi, '</Steps>')
    .replace(/<\s*pasos(\s|>)/gi, '<Steps$1')
    .replace(/<\/\s*acorde[oó]n\s*>/gi, '</Accordion>')
    .replace(/<\s*acorde[oó]n(\s)/gi, '<Accordion$1')
    .replace(/<\/\s*tarjeta\s*>/gi, '</Card>')
    .replace(/<\s*tarjeta(\s)/gi, '<Card$1')
}


/**
 * @param {string} str
 * @param {RegExp} regex
 * @param {(m: RegExpMatchArray) => Promise<string>} asyncReplacer
 */
async function replaceAsync(str, regex, asyncReplacer) {
  const flags = regex.flags.includes('g') ? regex.flags : `${regex.flags}g`
  const re = new RegExp(regex.source, flags)
  let out = ''
  let last = 0
  let m
  while ((m = re.exec(str))) {
    out += str.slice(last, m.index)
    out += await asyncReplacer(m)
    last = m.index + m[0].length
  }
  out += str.slice(last)
  return out
}

/**
 * @param {string} attrs
 */
async function translateTitleInAttrs(attrs) {
  const titled = await replaceAsync(attrs, /\btitle="([^"]*)"/g, async (m) => {
    const tr = await translateOne(m[1])
    await sleep(80)
    return `title="${escapeDoubleQuotedAttr(tr)}"`
  })
  return sanitizePassthroughJsxAttrs(titled)
}

/** Mint props and icon slugs must stay English; repair MT mistakes on Card/Step attrs. */
function sanitizePassthroughJsxAttrs(attrs) {
  let a = attrs
  a = a.replace(/\b(icono|ícono|icón)\s*=/gi, 'icon=')
  a = a.replace(/\b(hrefo|enlace)\s*=/gi, 'href=')
  a = a.replace(/\bicon\s*=\s*"([^"]*)"/gi, (full, val) => {
    const t = val.trim()
    const fix = KNOWN_BAD_ICON_VALUES[t.toLowerCase()]
    if (fix) return `icon="${fix}"`
    if (/^[a-z0-9]+(-[a-z0-9]+)*$/i.test(t)) return full
    return full
  })
  return a
}

/** Spanish MT → Mint icon slug when the value is not ASCII kebab (extend as needed). */
const KNOWN_BAD_ICON_VALUES = {
  'carga-nube': 'cloud-upload',
}

/**
 * @param {string} inner
 */
async function translateRichInner(inner) {
  const re = /(<code>[\s\S]*?<\/code>)/g
  const bits = inner.split(re)
  const out = []
  for (const bit of bits) {
    if (bit.startsWith('<code>')) {
      const cm = /^<code>([\s\S]*?)<\/code>$/.exec(bit)
      if (cm) {
        const tr = await translateOne(cm[1])
        await sleep(50)
        out.push(`<code>${tr}</code>`)
      } else {
        out.push(bit)
      }
      continue
    }
    if (bit.trim()) {
      out.push(fixMistakenTranslatedMintTags(await translateOne(bit)))
      await sleep(100)
    } else {
      out.push(bit)
    }
  }
  return fixMistakenTranslatedMintTags(out.join(''))
}

async function translateFrontmatter(fm) {
  const lines = fm.split('\n')
  const out = []
  for (const line of lines) {
    const m = /^(title|description|subtitle|sidebarTitle)\s*:\s*(.*)$/.exec(line)
    if (!m) {
      out.push(line)
      continue
    }
    const val = m[2].trim()
    if (!val || val === '""' || val === "''") {
      out.push(line)
      continue
    }
    const unquoted =
      (val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))
        ? val.slice(1, -1)
        : val
    const translated = await translateOne(unquoted)
    const escaped = translated.replace(/"/g, '\\"')
    out.push(`${m[1]}: "${escaped}"`)
    await sleep(150)
  }
  return out.join('\n')
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

/**
 * Mint / MDX blocks whose inner text was skipped when the whole paragraph starts with "<".
 * @param {string} body
 * @returns {Promise<string>}
 */
async function translateMintBlocks(body) {
  let b = body

  b = await replaceAsync(b, /<Accordion(\s+[^>]+)>([\s\S]*?)<\/Accordion>/g, async (m) => {
    const attrsTr = await translateTitleInAttrs(m[1])
    const innerTr = await translateRichInner(m[2])
    await sleep(100)
    return `<Accordion${attrsTr}>${innerTr}</Accordion>`
  })

  b = await replaceAsync(b, /<Step(\s+[^>]+)>([\s\S]*?)<\/Step>/g, async (m) => {
    const attrsTr = await translateTitleInAttrs(m[1])
    const innerTr = await translateRichInner(m[2])
    await sleep(100)
    return `<Step${attrsTr}>${innerTr}</Step>`
  })

  b = await replaceAsync(b, /<Card(\s+[^>]+)>([\s\S]*?)<\/Card>/g, async (m) => {
    const attrsTr = await translateTitleInAttrs(m[1])
    const innerTr = await translateRichInner(m[2])
    await sleep(100)
    return `<Card${attrsTr}>${innerTr}</Card>`
  })

  for (const tag of ['Note', 'Warning', 'Tip']) {
    const re = new RegExp(`<${tag}>\\s*([\\s\\S]*?)\\s*</${tag}>`, 'g')
    b = await replaceAsync(b, re, async (m) => {
      const innerTr = await translateRichInner(m[1])
      await sleep(100)
      return `<${tag}>\n${innerTr.trim()}\n</${tag}>`
    })
  }

  b = await replaceAsync(b, /<img(\s+[\s\S]*?)\/>/g, async (m) => {
    const attrsTr = await replaceAsync(
      m[1],
      /\balt="([^"]*)"/g,
      async (am) => {
        const tr = await translateOne(am[1])
        await sleep(50)
        return `alt="${escapeDoubleQuotedAttr(tr)}"`
      },
    )
    return `<img${attrsTr}/>`
  })

  return b
}

/**
 * @param {string} body
 * @returns {Promise<string>}
 */
/**
 * Plain-paragraph translation splits on \\n\\n+; that can tear multiline JSX so
 * fragments like `icon="..."` get sent to the API. Wrap big Mint blocks in HTML
 * comments (still start with `<` so they are skipped as raw).
 * @param {string} body
 */
function protectMdxWrapperBlocks(body) {
  /** @type {string[]} */
  const blocks = []
  const patterns = [
    /<CardGroup\b[\s\S]*?<\/CardGroup>/gi,
    /<Steps\b[\s\S]*?<\/Steps>/gi,
    /<AccordionGroup\b[\s\S]*?<\/AccordionGroup>/gi,
  ]
  let text = body
  for (const re of patterns) {
    text = text.replace(re, (full) => {
      const id = blocks.length
      blocks.push(full)
      return `<!--SPECKLE_I18N:${id}-->`
    })
  }
  return { text, blocks }
}

function unprotectMdxWrapperBlocks(text, blocks) {
  let out = text
  for (let i = 0; i < blocks.length; i++) {
    out = out.split(`<!--SPECKLE_I18N:${i}-->`).join(blocks[i])
  }
  return out
}

async function translateBody(body) {
  let b = await translateMintBlocks(body)
  const { text: wrapped, blocks } = protectMdxWrapperBlocks(b)
  b = wrapped

  const paras = b.split(/\n\n+/)
  const chunks = []
  for (const p of paras) {
    const t = p.trimStart()
    if (
      t.startsWith('```') ||
      t.startsWith('<') ||
      t.startsWith('import ') ||
      t.startsWith('export ') ||
      t.startsWith('{/*') ||
      p.trim() === ''
    ) {
      chunks.push({ type: 'raw', value: p })
      continue
    }
    chunks.push({ type: 'tx', value: p })
  }
  const out = []
  for (const c of chunks) {
    if (c.type === 'raw') {
      out.push(c.value)
      continue
    }
    out.push(fixMistakenTranslatedMintTags(await translateOne(c.value)))
    await sleep(150)
  }
  return unprotectMdxWrapperBlocks(out.join('\n\n'), blocks)
}

/**
 * @param {string} relPath
 */
async function translateFile(relPath) {
  const normalized = relPath.replace(/^\/+/, '').replace(/\.mdx$/i, '')
  if (normalized.startsWith('es/')) {
    console.warn(`Skip (already es/): ${normalized}`)
    return
  }
  const src = `${normalized}.mdx`
  const absIn = nodePath.join(REPO_ROOT, src)
  /** Spanish MDX snippets live under snippets/es/... (imports stay /snippets/es/...). */
  const absOut = normalized.startsWith('snippets/')
    ? nodePath.join(
        REPO_ROOT,
        'snippets',
        'es',
        `${normalized.slice('snippets/'.length)}.mdx`,
      )
    : nodePath.join(REPO_ROOT, 'es', `${normalized}.mdx`)
  const raw = await fs.readFile(absIn, 'utf8')
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(raw)
  await fs.mkdir(nodePath.dirname(absOut), { recursive: true })
  if (!m) {
    const newBody = await translateBody(raw)
    await fs.writeFile(absOut, newBody, 'utf8')
  } else {
    const fm = m[1]
    const body = m[2]
    const newFm = await translateFrontmatter(fm)
    const newBody = await translateBody(body)
    const next = `---\n${newFm}\n---\n${newBody}`
    await fs.writeFile(absOut, next, 'utf8')
  }
  console.log(`Wrote ${nodePath.relative(REPO_ROOT, absOut)}`)
}

for (const p of paths) {
  await translateFile(p)
}
