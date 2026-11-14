import { join } from 'node:path'
import { DuckDBInstance } from '@duckdb/node-api'

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

export const writeBundle = async (dir: string) => {
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
