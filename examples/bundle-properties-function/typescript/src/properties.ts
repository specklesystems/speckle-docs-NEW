import { DuckDBInstance } from '@duckdb/node-api'

/** One entry of the artifacts endpoint's `files` array. */
export type ArtifactFile = { name: string; url: string }

/** The bundle files the query reads, by placeholder, matched on the end of the file name. */
const SUFFIXES = {
  eav: '.eav.eav.parquet',
  paths: '.eav.paths.parquet',
  objects: '.eav.objects.parquet',
  type_eav: '.eav.type_eav.parquet',
  object_type: '.eav.object_type.parquet'
} as const
type Placeholder = keyof typeof SUFFIXES

// Kept identical to ../query.sql; the Python tests check it.
const SQL = `
WITH props AS (
  SELECT object_index, path_index, value_string, value_double, value_boolean, unit, internal_definition_name
  FROM read_parquet('{eav}')
  UNION ALL
  SELECT ot.object_index, te.path_index, te.value_string, te.value_double, te.value_boolean, te.unit, te.internal_definition_name
  FROM read_parquet('{object_type}') ot
  JOIN read_parquet('{type_eav}') te USING (type_index)
)
SELECT o.application_id AS object_id,
       p.path,
       COALESCE(pr.value_string, CAST(pr.value_double AS VARCHAR),
                CAST(pr.value_boolean AS VARCHAR)) AS value_text,
       pr.value_double AS value_num,
       CASE WHEN pr.value_double IS NOT NULL THEN 'number'
            WHEN pr.value_boolean IS NOT NULL THEN 'boolean'
            ELSE 'string' END AS type,
       pr.unit AS units,
       pr.internal_definition_name
FROM props pr
JOIN read_parquet('{paths}') p USING (path_index)
JOIN read_parquet('{objects}') o USING (object_index)
ORDER BY object_id, path
`

export class MissingBundleFileError extends Error {}

/** Map each placeholder to the location of its file, from the artifacts listing. */
export const pickFiles = (files: ArtifactFile[]): Record<Placeholder, string> => {
  const locations = {} as Record<Placeholder, string>
  for (const [key, suffix] of Object.entries(SUFFIXES) as [Placeholder, string][]) {
    const match = files.find((f) => f.name.endsWith(suffix))
    if (!match) throw new MissingBundleFileError(`Version has no ${suffix} file`)
    locations[key] = match.url
  }
  return locations
}

/** The version's properties, one row per property, in the properties export's columns. */
export const versionProperties = async (files: ArtifactFile[]) => {
  const locations = pickFiles(files)
  const sql = (Object.entries(locations) as [Placeholder, string][]).reduce(
    (text, [key, url]) => text.replaceAll(`{${key}}`, url.replace(/'/g, "''")),
    SQL
  )

  const instance = await DuckDBInstance.create(':memory:')
  const conn = await instance.connect()
  try {
    if (Object.values(locations).some((url) => /^https?:\/\//.test(url))) {
      await conn.run('INSTALL httpfs')
      await conn.run('LOAD httpfs')
    }
    const reader = await conn.runAndReadAll(sql)
    return reader.getRowObjectsJson()
  } finally {
    conn.closeSync()
    instance.closeSync()
  }
}
