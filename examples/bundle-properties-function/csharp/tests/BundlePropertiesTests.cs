using DuckDB.NET.Data;
using Xunit;

// Same two-object bundle as the Python and TypeScript tests: a door whose fire rating
// comes from its type, and a wall. Generated on the fly, so the sample ships no data.
public sealed class BundlePropertiesTests : IDisposable
{
    private static readonly Dictionary<string, string> Tables = new()
    {
        ["objects"] = "SELECT * FROM (VALUES (0, 'door-1'), (1, 'wall-1')) t(object_index, application_id)",
        ["paths"] = "SELECT * FROM (VALUES (0, 'ifcType'), (1, 'name'), (2, 'Dimensions.Area'), (3, 'Fire Rating'), (4, 'IsExternal')) t(path_index, path)",
        ["eav"] = "SELECT * FROM (VALUES (0, 0, 'IfcDoor', NULL::DOUBLE, NULL::BOOLEAN, NULL, 'door-type-definition'), (0, 1, 'Door-01', NULL, NULL, NULL, 'door-name-definition'), (0, 2, '1.8', 1.8, NULL, 'm2', 'area-definition'), (1, 0, 'IfcWall', NULL, NULL, NULL, 'wall-type-definition'), (1, 4, NULL, NULL, true, NULL, 'external-definition')) t(object_index, path_index, value_string, value_double, value_boolean, unit, internal_definition_name)",
        ["types"] = "SELECT * FROM (VALUES (0, 'door-type')) t(type_index, type_key)",
        ["type_eav"] = "SELECT * FROM (VALUES (0, 3, 'FR60', NULL::DOUBLE, NULL::BOOLEAN, NULL, 'fire-rating-definition')) t(type_index, path_index, value_string, value_double, value_boolean, unit, internal_definition_name)",
        ["object_type"] = "SELECT * FROM (VALUES (0, 0)) t(object_index, type_index)",
    };

    private readonly string _dir = Directory.CreateTempSubdirectory("bundle-").FullName;
    private readonly List<ArtifactFile> _files = [];

    public BundlePropertiesTests()
    {
        using var connection = new DuckDBConnection("DataSource=:memory:");
        connection.Open();
        using var command = connection.CreateCommand();
        foreach (var (name, select) in Tables)
        {
            var path = Path.Combine(_dir, $"v1.eav.{name}.parquet");
            command.CommandText = $"COPY ({select}) TO '{path}' (FORMAT parquet)";
            command.ExecuteNonQuery();
            _files.Add(new ArtifactFile($"v1.eav.{name}.parquet", path));
        }
        _files.Add(new ArtifactFile("v1.geometries.parquet", "unused"));
    }

    public void Dispose() => Directory.Delete(_dir, recursive: true);

    [Fact]
    public void RowsUseThePropertiesExportColumns()
    {
        var rows = BundleProperties.VersionProperties(_files);
        Assert.Equal(new[] { "object_id", "path", "value_text", "value_num", "type", "units", "internal_definition_name" }, rows[0].Keys);
    }

    [Fact]
    public void TypePropertiesAreMergedIntoTheObject()
    {
        var door = BundleProperties.VersionProperties(_files)
            .Where(r => (string?)r["object_id"] == "door-1")
            .ToList();
        Assert.Equal(4, door.Count);
        Assert.Equal("FR60", door.Single(r => (string?)r["path"] == "Fire Rating")["value_text"]);
        Assert.Equal("fire-rating-definition", door.Single(r => (string?)r["path"] == "Fire Rating")["internal_definition_name"]);
    }

    [Fact]
    public void ValuesAreTyped()
    {
        var rows = BundleProperties.VersionProperties(_files);
        var area = rows.Single(r => (string?)r["object_id"] == "door-1" && (string?)r["path"] == "Dimensions.Area");
        Assert.Equal(("number", 1.8, "m2"), ((string?)area["type"], (double?)area["value_num"], (string?)area["units"]));
        var external = rows.Single(r => (string?)r["object_id"] == "wall-1" && (string?)r["path"] == "IsExternal");
        Assert.Equal(("boolean", "true"), ((string?)external["type"], (string?)external["value_text"]));
    }

    [Fact]
    public void AMissingFileIsReported()
    {
        var partial = _files.Where(f => !f.Name.EndsWith(".eav.type_eav.parquet")).ToList();
        Assert.Throws<MissingBundleFileException>(() => BundleProperties.PickFiles(partial));
    }
}
