-- One row per property of every object in a bundle version, instance and type
-- properties together, in the same columns as the properties export.
-- {eav}, {paths}, {objects}, {type_eav} and {object_type} are the locations of
-- the version's .eav.*.parquet files: presigned URLs or local paths.
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
