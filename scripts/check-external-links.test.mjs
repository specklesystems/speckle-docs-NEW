import assert from 'node:assert/strict'
import test from 'node:test'

import { allowsIn, exitCode, parseMintReport, settleHits } from './check-external-links.mjs'

const report = `
found 2 broken links in 2 files

connectors/overview.mdx
 ⎿  https://www.vectorworks.net/support (fetch failed)

developers/automate/faq.mdx
 ⎿  https://speckle.community/c/automate (404)
`

test('parses mint file and hit lines, including the source URL', () => {
  const parsed = parseMintReport(report)
  assert.deepEqual(parsed.unparsed, [])
  assert.deepEqual(parsed.hits, [
    {
      file: 'connectors/overview.mdx',
      url: 'https://www.vectorworks.net/support',
      reason: 'fetch failed'
    },
    {
      file: 'developers/automate/faq.mdx',
      url: 'https://speckle.community/c/automate',
      reason: '404'
    }
  ])
})

test('reads the allow comment URL', () => {
  const urls = allowsIn(
    '{/* link-check-allow: https://www.vectorworks.net/support */}\n[support](https://www.vectorworks.net/support)'
  )
  assert.deepEqual([...urls], ['https://www.vectorworks.net/support'])
})

test('drops a fetch failure only after the file allows it and the retry succeeds', () => {
  const { hits } = parseMintReport(report)
  const allowByFile = new Map([
    ['connectors/overview.mdx', new Set(['https://www.vectorworks.net/support'])]
  ])
  const { dropped, kept } = settleHits(
    hits,
    allowByFile,
    new Map([['https://www.vectorworks.net/support', true]])
  )
  assert.equal(dropped.length, 1)
  assert.equal(kept.length, 1)
  assert.equal(kept[0].reason, '404')
})

test('keeps an allowed URL when the retry does not return 2xx', () => {
  const { kept } = settleHits(
    [
      {
        file: 'connectors/overview.mdx',
        url: 'https://www.vectorworks.net/support',
        reason: 'fetch failed'
      }
    ],
    new Map([['connectors/overview.mdx', new Set(['https://www.vectorworks.net/support'])]]),
    new Map([['https://www.vectorworks.net/support', false]])
  )
  assert.equal(kept.length, 1)
})

test('drops an abort when the retry returns 2xx', () => {
  const { dropped, kept } = settleHits(
    [
      {
        file: 'connectors/overview.mdx',
        url: 'https://www.vectorworks.net/support',
        reason: 'This operation was aborted'
      }
    ],
    new Map([['connectors/overview.mdx', new Set(['https://www.vectorworks.net/support'])]]),
    new Map([['https://www.vectorworks.net/support', true]])
  )
  assert.equal(dropped.length, 1)
  assert.equal(kept.length, 0)
})

test('keeps a 404 even when the file allows that URL', () => {
  const { kept } = settleHits(
    [
      {
        file: 'developers/automate/faq.mdx',
        url: 'https://speckle.community/c/automate',
        reason: '404'
      }
    ],
    new Map([['developers/automate/faq.mdx', new Set(['https://speckle.community/c/automate'])]]),
    new Map([['https://speckle.community/c/automate', true]])
  )
  assert.equal(kept.length, 1)
})

test('exits 0 when every parsed hit was dropped', () => {
  assert.equal(
    exitCode({
      mintStatus: 1,
      hits: [{ file: 'a.mdx', url: 'https://example.com', reason: 'fetch failed' }],
      unparsed: [],
      kept: []
    }),
    0
  )
})

test('exits non-zero when mint fails and no hit was parsed', () => {
  assert.equal(exitCode({ mintStatus: 2, hits: [], unparsed: [], kept: [] }), 2)
})

test('exits non-zero when a hit-like line does not parse', () => {
  const parsed = parseMintReport(
    'connectors/overview.mdx\n see (docs) at https://example.com/a (fetch failed) extra\n'
  )
  assert.equal(parsed.hits.length, 0)
  assert.equal(parsed.unparsed.length, 1)
  assert.equal(
    exitCode({ mintStatus: 1, hits: parsed.hits, unparsed: parsed.unparsed, kept: [] }),
    1
  )
})
