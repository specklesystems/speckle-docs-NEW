# Bundle properties function

Sample code that returns a 2026.9 **bundle** version's properties as JSON, for tools
that cannot read Parquet themselves: Power Automate, Zapier, n8n Cloud. It runs as an
Azure Function in Python, TypeScript, or C#. Copy the language you need.

The rows have the same columns as the properties export (`eav/query`) returns for
earlier versions, so a flow built on the export can switch with little change:

| Column                     | Holds                                                            |
| -------------------------- | ---------------------------------------------------------------- |
| `object_id`                | The object's `applicationId` (an IFC GlobalId, a Revit UniqueId) |
| `path`                     | The property path, such as `ifcType` or `Dimensions.Area`        |
| `value_text`               | The value as text, for every row                                 |
| `value_num`                | The value as a number, for numeric rows                          |
| `type`                     | `string`, `number`, or `boolean`                                 |
| `units`                    | The producer's unit label, where it gave one                     |
| `internal_definition_name` | The property's internal definition name, when available          |

Type-level properties (Revit type parameters, IFC type properties) are merged in, so
each object carries its type's properties too.

The guide is [Get element data from a
version](https://docs.speckle.systems/developers/api/graphql#get-element-data-from-a-version).

## How it works

1. Lists the version's files from
   `GET /api/v2/projects/{projectId}/models/{modelId}/versions/{versionId}/artifacts`.
2. Picks the five `eav` files by the end of their names: `.eav.eav.parquet`,
   `.eav.paths.parquet`, `.eav.objects.parquet`, `.eav.type_eav.parquet`,
   `.eav.object_type.parquet`.
3. Runs [`query.sql`](query.sql) over them with DuckDB, reading the presigned URLs
   directly. Each language carries a copy of the query; the Python tests check the
   copies match.

DuckDB is a convenience, not a requirement: the bundle is plain Parquet, and the query
is three joins. Any Parquet reader can do the same (pyarrow or Polars in Python,
hyparquet in TypeScript, Parquet.Net in C#, which also avoids DuckDB's native
binaries).

## Get just this directory

```bash
git clone --filter=blob:none --sparse --depth 1 \
  https://github.com/specklesystems/speckle-docs-new.git
cd speckle-docs-new
git sparse-checkout set examples/bundle-properties-function
```

## Run it locally

You need the [Azure Functions Core Tools](https://learn.microsoft.com/azure/azure-functions/functions-run-local)
(`func`) and a Speckle personal access token with read access to the project.

1. Copy `local.settings.example.json` into the language folder as
   `local.settings.json`. Set `SPECKLE_TOKEN`, and set `FUNCTIONS_WORKER_RUNTIME` to
   `python`, `node`, or `dotnet-isolated`.
2. Start the function:

   | Language   | In the folder | Commands                                        |
   | ---------- | ------------- | ----------------------------------------------- |
   | Python     | `python/`     | See below, then `func start`                    |
   | TypeScript | `typescript/` | `pnpm install && pnpm build`, then `func start` |
   | C#         | `csharp/`     | `func start`                                    |

3. Call it:

   ```bash
   curl -X POST http://localhost:7071/api/properties \
     -H "Content-Type: application/json" \
     -d '{"projectId": "PROJECT_ID", "modelId": "MODEL_ID", "versionId": "VERSION_ID"}'
   ```

For Python, run the function from a virtual environment on Python 3.10 to 3.12.
Otherwise `func` uses whichever Python is first on your `PATH`, and stops if that
version is newer than it supports:

```bash
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

While it runs, the host reports `Unable to create client for AzureWebJobsStorage`. That
is expected: an HTTP-triggered function does not need Azure Storage, so the example
leaves `AzureWebJobsStorage` empty.

DuckDB downloads its `httpfs` extension the first time it reads a URL, so the host
needs outbound access to `extensions.duckdb.org`.

## Call it from Power Automate

Deploy the function, store the token as the application setting `SPECKLE_TOKEN`, then
add an **HTTP** action to the flow that POSTs the JSON body above to the function URL
(with its function key). Parse the response as JSON and filter the rows as you would
the properties export.

The function returns every property of every object. On a large model, add a `WHERE`
clause to the query so the flow receives only the rows it needs.

## Check it

Each language has tests that build a small bundle on the fly and run the query over
it, so the sample ships no data.

```bash
mise run check            # all three
mise run check:python     # or one language
```

Before publishing a change, also run the function once against a real version: the
tests read local files, not presigned URLs.
