using DuckDB.NET.Data;

/// <summary>One entry of the artifacts endpoint's <c>files</c> array.</summary>
public record ArtifactFile(string Name, string Url);

public class MissingBundleFileException(string message) : Exception(message);

public static class BundleProperties
{
    /// <summary>The bundle files the query reads, by placeholder, matched on the end of the file name.</summary>
    private static readonly Dictionary<string, string> Suffixes = new()
    {
        ["eav"] = ".eav.eav.parquet",
        ["paths"] = ".eav.paths.parquet",
        ["objects"] = ".eav.objects.parquet",
        ["type_eav"] = ".eav.type_eav.parquet",
        ["object_type"] = ".eav.object_type.parquet",
    };

    // Kept identical to ../query.sql; the Python tests check it.
    private const string Sql = """
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
        """;

    /// <summary>Map each placeholder to the location of its file, from the artifacts listing.</summary>
    public static Dictionary<string, string> PickFiles(IReadOnlyList<ArtifactFile> files)
    {
        var locations = new Dictionary<string, string>();
        foreach (var (key, suffix) in Suffixes)
        {
            var match = files.FirstOrDefault(f => f.Name.EndsWith(suffix, StringComparison.Ordinal))
                ?? throw new MissingBundleFileException($"Version has no {suffix} file");
            locations[key] = match.Url;
        }
        return locations;
    }

    /// <summary>The version's properties, one row per property, in the properties export's columns.</summary>
    public static List<Dictionary<string, object?>> VersionProperties(IReadOnlyList<ArtifactFile> files)
    {
        var locations = PickFiles(files);
        var sql = Sql;
        foreach (var (key, url) in locations)
        {
            sql = sql.Replace($"{{{key}}}", url.Replace("'", "''"));
        }

        using var connection = new DuckDBConnection("DataSource=:memory:");
        connection.Open();
        using var command = connection.CreateCommand();
        if (locations.Values.Any(url => url.StartsWith("http://") || url.StartsWith("https://")))
        {
            command.CommandText = "INSTALL httpfs";
            command.ExecuteNonQuery();
            command.CommandText = "LOAD httpfs";
            command.ExecuteNonQuery();
        }

        command.CommandText = sql;
        using var reader = command.ExecuteReader();
        var rows = new List<Dictionary<string, object?>>();
        while (reader.Read())
        {
            var row = new Dictionary<string, object?>();
            for (var i = 0; i < reader.FieldCount; i++)
            {
                row[reader.GetName(i)] = reader.IsDBNull(i) ? null : reader.GetValue(i);
            }
            rows.Add(row);
        }
        return rows;
    }
}
