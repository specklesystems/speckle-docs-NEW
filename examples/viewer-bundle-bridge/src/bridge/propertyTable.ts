import { asBool, asNumber, asString, intAt, type Row } from './parquet.js'

export type PropValue = string | number | boolean

/**
 * The eav tables as a lookup. Each row sets exactly one of the string, number and
 * boolean columns, so reading a value means coalescing the three. Paths are
 * interned in their own table and are dotted, not nested.
 */
export class PropertyTable {
  private readonly byKey = new Map<number, Map<string, PropValue>>()

  static load(eavRows: Row[] | undefined, pathRows: Row[], keyColumn: string): PropertyTable {
    const table = new PropertyTable()
    if (!eavRows?.length) return table

    const pathById = new Map<number, string>()
    for (const row of pathRows) {
      const path = asString(row.path)
      if (path) pathById.set(intAt(row, 'path_index'), path)
    }

    for (const row of eavRows) {
      const path = pathById.get(intAt(row, 'path_index'))
      if (!path) continue
      const value = coalesce(row)
      if (value === undefined) continue
      const key = intAt(row, keyColumn)
      let values = table.byKey.get(key)
      if (!values) {
        values = new Map<string, PropValue>()
        table.byKey.set(key, values)
      }
      values.set(path, value)
    }
    return table
  }

  get(key: number, path: string): PropValue | undefined {
    return this.byKey.get(key)?.get(path)
  }

  getString(key: number, path: string): string | undefined {
    const value = this.get(key, path)
    return typeof value === 'string' ? value : undefined
  }

  /** The first value any key carries at `path` — used to find the model's units. */
  firstValueOf(path: string): PropValue | undefined {
    for (const values of this.byKey.values()) {
      const value = values.get(path)
      if (value !== undefined) return value
    }
    return undefined
  }
}

function coalesce(row: Row): PropValue | undefined {
  const boolean = asBool(row.value_boolean)
  if (boolean !== undefined) return boolean
  const double = asNumber(row.value_double)
  if (double !== undefined) return double
  return asString(row.value_string)
}
