"""Read a bundle version's properties in the same columns as the properties export."""

import duckdb

# The bundle files the query reads, by placeholder, matched on the end of the file name.
SUFFIXES = {
    "eav": ".eav.eav.parquet",
    "paths": ".eav.paths.parquet",
    "objects": ".eav.objects.parquet",
    "type_eav": ".eav.type_eav.parquet",
    "object_type": ".eav.object_type.parquet",
}

# Kept identical to ../query.sql; the tests check it.
SQL = """
WITH props AS (
  SELECT object_index, path_index, value_string, value_double, value_boolean, unit
  FROM read_parquet('{eav}')
  UNION ALL
  SELECT ot.object_index, te.path_index, te.value_string, te.value_double, te.value_boolean, te.unit
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
       pr.unit AS units
FROM props pr
JOIN read_parquet('{paths}') p USING (path_index)
JOIN read_parquet('{objects}') o USING (object_index)
ORDER BY object_id, path
"""


def pick_files(files):
    """Map each placeholder to the location of its file, from the artifacts listing."""
    locations = {}
    for key, suffix in SUFFIXES.items():
        match = next((f for f in files if f["name"].endswith(suffix)), None)
        if match is None:
            raise LookupError(f"Version has no {suffix} file")
        locations[key] = match["url"]
    return locations


def version_properties(files):
    """Return the version's properties as a list of dicts.

    ``files`` is the ``files`` array from the artifacts endpoint: ``{"name", "url"}`` entries.
    """
    locations = pick_files(files)
    con = duckdb.connect()
    try:
        if any(url.startswith(("http://", "https://")) for url in locations.values()):
            con.execute("INSTALL httpfs")
            con.execute("LOAD httpfs")
        sql = SQL.format(**{k: v.replace("'", "''") for k, v in locations.items()})
        cursor = con.execute(sql)
        columns = [c[0] for c in cursor.description]
        return [dict(zip(columns, row)) for row in cursor.fetchall()]
    finally:
        con.close()
