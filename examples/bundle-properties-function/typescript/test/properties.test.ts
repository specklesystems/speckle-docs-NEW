import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { MissingBundleFileError, pickFiles, versionProperties } from '../src/properties.js'
import { writeBundle } from './bundle.js'

test('versionProperties', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'bundle-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const files = await writeBundle(dir)
  const rows = await versionProperties(files)

  await t.test('rows use the properties export columns', () => {
    assert.deepEqual(Object.keys(rows[0]), [
      'object_id',
      'path',
      'value_text',
      'value_num',
      'type',
      'units',
      'internal_definition_name'
    ])
  })

  await t.test('type properties are merged into the object', () => {
    const door = rows.filter((r) => r.object_id === 'door-1')
    assert.equal(door.length, 4)
    assert.equal(door.find((r) => r.path === 'Fire Rating')?.value_text, 'FR60')
    assert.equal(
      door.find((r) => r.path === 'Fire Rating')?.internal_definition_name,
      'fire-rating-definition'
    )
  })

  await t.test('values are typed', () => {
    const area = rows.find((r) => r.object_id === 'door-1' && r.path === 'Dimensions.Area')
    assert.deepEqual([area?.type, area?.value_num, area?.units], ['number', 1.8, 'm2'])
    const external = rows.find((r) => r.object_id === 'wall-1' && r.path === 'IsExternal')
    assert.deepEqual([external?.type, external?.value_text], ['boolean', 'true'])
  })

  await t.test('a missing file is reported', () => {
    const partial = files.filter((f) => !f.name.endsWith('.eav.type_eav.parquet'))
    assert.throws(() => pickFiles(partial), MissingBundleFileError)
  })
})
