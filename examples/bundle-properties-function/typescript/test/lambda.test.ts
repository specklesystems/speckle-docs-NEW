import { test, mock } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { handler, type FunctionUrlEvent } from '../src/lambda.js'
import { writeBundle } from './bundle.js'

const BODY = { projectId: 'p1', modelId: 'm1', versionId: 'v1' }
const event = (key = 'test-key', base64 = false): FunctionUrlEvent => {
  const raw = JSON.stringify(BODY)
  return {
    headers: { 'x-api-key': key },
    body: base64 ? Buffer.from(raw).toString('base64') : raw,
    isBase64Encoded: base64
  }
}

test('lambda handler', async (t) => {
  process.env.FUNCTION_KEY = 'test-key'
  process.env.SPECKLE_TOKEN = 'test-token'
  const dir = mkdtempSync(join(tmpdir(), 'bundle-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const files = await writeBundle(dir)
  const fetchMock = mock.method(globalThis, 'fetch', async () => Response.json({ files }))

  await t.test('returns rows as JSON', async () => {
    const result = await handler(event())
    assert.equal(result.statusCode, 200)
    assert.equal(JSON.parse(result.body).length, 6)
    assert.match(
      String(fetchMock.mock.calls.at(-1)?.arguments[0]),
      /projects\/p1\/models\/m1\/versions\/v1\/artifacts/
    )
  })

  await t.test('accepts a base64 body', async () => {
    assert.equal((await handler(event('test-key', true))).statusCode, 200)
  })

  await t.test('rejects a wrong key', async () => {
    const calls = fetchMock.mock.callCount()
    assert.equal((await handler(event('nope'))).statusCode, 401)
    assert.equal(fetchMock.mock.callCount(), calls)
  })

  await t.test('passes Speckle errors through', async () => {
    fetchMock.mock.mockImplementationOnce(async () => new Response('Forbidden', { status: 403 }))
    assert.equal((await handler(event())).statusCode, 403)
  })
})
