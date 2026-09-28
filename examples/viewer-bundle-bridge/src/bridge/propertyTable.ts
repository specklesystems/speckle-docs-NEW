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

  /**
   * The rows under a dotted prefix, rebuilt into nested objects with the prefix
   * stripped. `properties.Constraints.Base Offset` under prefix `properties`
   * becomes `{ Constraints: { 'Base Offset': … } }`.
   */
  nested(key: number, prefix?: string): Record<string, unknown> {
    const root: Record<string, unknown> = {}
    const values = this.byKey.get(key)
    if (!values) return root
    const head = prefix ? `${prefix}.` : ''

    for (const [path, value] of values) {
      if (head && !path.startsWith(head)) continue
      const parts = path.slice(head.length).split('.')
      let cursor = root
      for (const part of parts.slice(0, -1)) {
        const child = cursor[part]
        if (child && typeof child === 'object' && !Array.isArray(child)) {
          cursor = child as Record<string, unknown>
        } else {
          const created: Record<string, unknown> = {}
          cursor[part] = created
          cursor = created
        }
      }
      cursor[parts[parts.length - 1]] = value
    }
    return root
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

/** Type-level rows are the base; instance rows overlay them. */
export function mergeProperties(
  typeLevel: Record<string, unknown>,
  instance: Record<string, unknown>
): Record<string, unknown> {
  const merged = { ...typeLevel }
  overlay(merged, instance)
  return merged
}

function overlay(target: Record<string, unknown>, source: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(source)) {
    const existing = target[key]
    if (isPlainObject(value) && isPlainObject(existing)) {
      const clone = { ...existing }
      overlay(clone, value)
      target[key] = clone
    } else {
      target[key] = value
    }
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
