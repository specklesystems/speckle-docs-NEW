import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DuckDBInstance } from '@duckdb/node-api'
import { MissingBundleFileError, pickFiles, versionProperties } from '../src/properties.js'

// Same two-object bundle as the Python tests: a door whose fire rating comes from its type, and a wall.
const TABLES: Record<string, string> = {
  objects: "SELECT * FROM (VALUES (0, 'door-1'), (1, 'wall-1')) t(object_index, application_id)",
  paths:
    "SELECT * FROM (VALUES (0, 'ifcType'), (1, 'name'), (2, 'Dimensions.Area'), (3, 'Fire Rating'), (4, 'IsExternal')) t(path_index, path)",
  eav: "SELECT * FROM (VALUES (0, 0, 'IfcDoor', NULL::DOUBLE, NULL::BOOLEAN, NULL, 'door-type-definition'), (0, 1, 'Door-01', NULL, NULL, NULL, 'door-name-definition'), (0, 2, '1.8', 1.8, NULL, 'm2', 'area-definition'), (1, 0, 'IfcWall', NULL, NULL, NULL, 'wall-type-definition'), (1, 4, NULL, NULL, true, NULL, 'external-definition')) t(object_index, path_index, value_string, value_double, value_boolean, unit, internal_definition_name)",
  types: "SELECT * FROM (VALUES (0, 'door-type')) t(type_index, type_key)",
  type_eav:
    "SELECT * FROM (VALUES (0, 3, 'FR60', NULL::DOUBLE, NULL::BOOLEAN, NULL, 'fire-rating-definition')) t(type_index, path_index, value_string, value_double, value_boolean, unit, internal_definition_name)",
  object_type: 'SELECT * FROM (VALUES (0, 0)) t(object_index, type_index)'
}

const writeBundle = async (dir: string) => {
  const instance = await DuckDBInstance.create(':memory:')
  const conn = await instance.connect()
  const files = []
  for (const [name, select] of Object.entries(TABLES)) {
    const path = join(dir, `v1.eav.${name}.parquet`)
    await conn.run(`COPY (${select}) TO '${path}' (FORMAT parquet)`)
    files.push({ name: `v1.eav.${name}.parquet`, url: path })
  }
  conn.closeSync()
  instance.closeSync()
  return [...files, { name: 'v1.geometries.parquet', url: 'unused' }]
}

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
