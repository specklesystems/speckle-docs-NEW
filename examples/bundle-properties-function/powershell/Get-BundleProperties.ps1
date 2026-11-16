<#
.SYNOPSIS
  Writes a bundle version's properties to a CSV or JSON file, in the same columns as the
  properties export.

.DESCRIPTION
  For Power Automate Desktop, or any Windows machine with no hosted function. Lists the
  version's files from Speckle, downloads the five .eav.*.parquet files, and runs query.sql
  over them with the DuckDB command-line tool. Runs on Windows PowerShell 5.1 and PowerShell 7.

.EXAMPLE
  .\Get-BundleProperties.ps1 -ProjectId 6cf771ca53 -ModelId 150113b84a -VersionId 4693564ef7 -OutFile C:\speckle\properties.csv
#>
param(
  [Parameter(Mandatory = $true)] [string] $ProjectId,
  [Parameter(Mandatory = $true)] [string] $ModelId,
  [Parameter(Mandatory = $true)] [string] $VersionId,
  # Ends in .csv or .json.
  [Parameter(Mandatory = $true)] [string] $OutFile,
  [string] $Token = $env:SPECKLE_TOKEN,
  [string] $ServerUrl = $(if ($env:SPECKLE_URL) { $env:SPECKLE_URL } else { 'https://app.speckle.systems' }),
  # duckdb.exe, by full path or on PATH.
  [string] $DuckDb = 'duckdb',
  # Defaults to query.sql beside this script, else the sample's shared ../query.sql.
  [string] $QueryFile
)

$ErrorActionPreference = 'Stop'
if (-not $QueryFile) {
  $QueryFile = Join-Path $PSScriptRoot 'query.sql'
  if (-not (Test-Path $QueryFile)) { $QueryFile = Join-Path (Split-Path $PSScriptRoot) 'query.sql' }
}
$ProgressPreference = 'SilentlyContinue' # the progress bar slows downloads in Windows PowerShell
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

# The bundle files the query reads, by placeholder, matched on the end of the file name.
$suffixes = [ordered]@{
  eav         = '.eav.eav.parquet'
  paths       = '.eav.paths.parquet'
  objects     = '.eav.objects.parquet'
  type_eav    = '.eav.type_eav.parquet'
  object_type = '.eav.object_type.parquet'
}

switch ([IO.Path]::GetExtension($OutFile).ToLowerInvariant()) {
  '.csv' { $format = 'FORMAT csv, HEADER' }
  '.json' { $format = 'FORMAT json, ARRAY true' }
  default { throw "OutFile must end in .csv or .json: $OutFile" }
}
if (-not $Token) { throw 'Set SPECKLE_TOKEN, or pass -Token.' }

$url = "$($ServerUrl.TrimEnd('/'))/api/v2/projects/$ProjectId/models/$ModelId/versions/$VersionId/artifacts"
try {
  $listing = Invoke-RestMethod -Uri $url -Headers @{ Authorization = "Bearer $Token" } -UseBasicParsing
} catch {
  $status = [int]$_.Exception.Response.StatusCode
  if ($status -eq 404) {
    throw "Version $VersionId has no bundle. For versions in the earlier format, call the properties export (eav/query) instead."
  }
  throw
}

$work = Join-Path ([IO.Path]::GetTempPath()) ("speckle-" + [Guid]::NewGuid())
New-Item -ItemType Directory -Path $work | Out-Null
try {
  $sql = Get-Content -Raw -Path $QueryFile
  foreach ($key in $suffixes.Keys) {
    $file = $listing.files | Where-Object { $_.name.EndsWith($suffixes[$key]) } | Select-Object -First 1
    if (-not $file) { throw "Version has no $($suffixes[$key]) file" }
    # The presigned URL carries its own signature, so no Authorization header here.
    $local = Join-Path $work "$key.parquet"
    Invoke-WebRequest -Uri $file.url -OutFile $local -UseBasicParsing
    $sql = $sql.Replace("{$key}", $local.Replace('\', '/').Replace("'", "''"))
  }

  # One line, without the comment lines, so it passes to duckdb as a single -c argument.
  $select = (($sql -split "`r?`n") | Where-Object { $_ -notmatch '^\s*--' }) -join ' '
  $target = [IO.Path]::GetFullPath($OutFile).Replace('\', '/').Replace("'", "''")
  & $DuckDb -c "COPY ($select) TO '$target' ($format)"
  if ($LASTEXITCODE -ne 0) { throw "duckdb exited with code $LASTEXITCODE" }
} finally {
  Remove-Item -Recurse -Force -Path $work -ErrorAction SilentlyContinue
}
