import { parquetReadObjects } from 'hyparquet'
import { compressors } from 'hyparquet-compressors'

export type Row = Record<string, unknown>

/**
 * Bundle parquet is zstd-compressed, which hyparquet does not decode on its own —
 * hence the `compressors` argument on every read.
 */
export async function readParquet(file: ArrayBuffer): Promise<Row[]> {
  const rows = await parquetReadObjects({ file, compressors })
  return rows as Row[]
}

/**
 * The geometry table's `content` column is a BYTE_ARRAY with no string logical
 * type, and hyparquet decodes every BYTE_ARRAY as UTF-8 by default — which
 * silently mangles SGEO blobs. Read that table with `utf8: false` and decode the
 * genuinely textual columns yourself.
 */
export async function readParquetBinary(file: ArrayBuffer): Promise<Row[]> {
  const rows = await parquetReadObjects({ file, compressors, utf8: false })
  return rows as Row[]
}

const decoder = new TextDecoder()

export function bytesAsString(value: unknown): string | undefined {
  if (typeof value === 'string') return value
  const bytes = asBytes(value)
  return bytes ? decoder.decode(bytes) : undefined
}

export function asInt(value: unknown): number | undefined {
  if (typeof value === 'number') return value
  if (typeof value === 'bigint') return Number(value)
  return undefined
}

export function asNumber(value: unknown): number | undefined {
  return asInt(value)
}

export function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

export function asBool(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined
}

export function asBytes(value: unknown): Uint8Array | undefined {
  if (value instanceof Uint8Array) return value
  if (value instanceof ArrayBuffer) return new Uint8Array(value)
  return undefined
}

/** Dense integer keys are never null in a valid bundle; 0 keeps the reader total. */
export function intAt(row: Row, column: string): number {
  return asInt(row[column]) ?? 0
}
