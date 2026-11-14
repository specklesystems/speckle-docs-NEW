"""Runs the query against a small bundle generated on the fly, so the sample ships no data."""

import re
import tempfile
import unittest
from pathlib import Path

import duckdb

from properties import SQL, pick_files, version_properties

HERE = Path(__file__).parent
ROOT = HERE.parent

# Two objects: a door whose fire rating comes from its type, and a wall.
TABLES = {
    "objects": "SELECT * FROM (VALUES (0, 'door-1'), (1, 'wall-1')) t(object_index, application_id)",
    "paths": "SELECT * FROM (VALUES (0, 'ifcType'), (1, 'name'), (2, 'Dimensions.Area'), "
    "(3, 'Fire Rating'), (4, 'IsExternal')) t(path_index, path)",
    "eav": "SELECT * FROM (VALUES "
    "(0, 0, 'IfcDoor', NULL::DOUBLE, NULL::BOOLEAN, NULL, 'door-type-definition'), "
    "(0, 1, 'Door-01', NULL, NULL, NULL, 'door-name-definition'), "
    "(0, 2, '1.8', 1.8, NULL, 'm2', 'area-definition'), "
    "(1, 0, 'IfcWall', NULL, NULL, NULL, 'wall-type-definition'), "
    "(1, 4, NULL, NULL, true, NULL, 'external-definition')"
    ") t(object_index, path_index, value_string, value_double, value_boolean, unit, internal_definition_name)",
    "types": "SELECT * FROM (VALUES (0, 'door-type')) t(type_index, type_key)",
    "type_eav": "SELECT * FROM (VALUES (0, 3, 'FR60', NULL::DOUBLE, NULL::BOOLEAN, NULL, "
    "'fire-rating-definition')) "
    "t(type_index, path_index, value_string, value_double, value_boolean, unit, internal_definition_name)",
    "object_type": "SELECT * FROM (VALUES (0, 0)) t(object_index, type_index)",
}


def write_bundle(directory):
    con = duckdb.connect()
    files = []
    for name, select in TABLES.items():
        path = Path(directory) / f"v1.eav.{name}.parquet"
        con.execute(f"COPY ({select}) TO '{path}' (FORMAT parquet)")
        files.append({"name": path.name, "url": str(path)})
    files.append({"name": "v1.geometries.parquet", "url": "unused"})
    return files


def sql_block(text):
    return re.search(r"WITH props AS.*?ORDER BY object_id, path", text, re.S).group(0)


class VersionPropertiesTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.files = write_bundle(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def test_rows_match_the_properties_export_columns(self):
        rows = version_properties(self.files)
        self.assertEqual(
            list(rows[0]),
            ["object_id", "path", "value_text", "value_num", "type", "units", "internal_definition_name"],
        )

    def test_type_properties_are_merged_into_the_object(self):
        rows = version_properties(self.files)
        door = {r["path"]: r for r in rows if r["object_id"] == "door-1"}
        self.assertEqual(door["Fire Rating"]["value_text"], "FR60")
        self.assertEqual(door["Fire Rating"]["internal_definition_name"], "fire-rating-definition")
        self.assertEqual(len(door), 4)

    def test_values_are_typed(self):
        rows = {(r["object_id"], r["path"]): r for r in version_properties(self.files)}
        area = rows[("door-1", "Dimensions.Area")]
        self.assertEqual((area["type"], area["value_num"], area["units"]), ("number", 1.8, "m2"))
        external = rows[("wall-1", "IsExternal")]
        self.assertEqual((external["type"], external["value_text"]), ("boolean", "true"))

    def test_missing_file_is_reported(self):
        files = [f for f in self.files if not f["name"].endswith(".eav.type_eav.parquet")]
        with self.assertRaises(LookupError):
            pick_files(files)

    def test_every_language_uses_the_shared_query(self):
        shared = sql_block((ROOT / "query.sql").read_text())
        copies = {
            "python": SQL,
            "typescript": (ROOT / "typescript/src/properties.ts").read_text(),
            "csharp": (ROOT / "csharp/BundleProperties.cs").read_text(),
        }
        for language, text in copies.items():
            normalised = "\n".join(line.strip() for line in sql_block(text).splitlines())
            expected = "\n".join(line.strip() for line in shared.splitlines())
            self.assertEqual(normalised, expected, f"{language} query differs from query.sql")


if __name__ == "__main__":
    unittest.main()
