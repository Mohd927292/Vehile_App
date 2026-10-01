param(
  [string]$ProjectId = 'vehicle2-79fd6'
)

$ErrorActionPreference = 'Stop'
$token = (& gcloud auth print-access-token).Trim()
if (-not $token) { throw 'Google Cloud authentication is required.' }
$headers = @{ Authorization = "Bearer $token" }
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$destination = Join-Path (Split-Path $PSScriptRoot -Parent) ".local-backup/$stamp"
New-Item -ItemType Directory -Path $destination -Force | Out-Null
$collections = @('customers', 'drivers', 'fromcustomers', 'parties', 'tripEntries', 'vehicles')
foreach ($collection in $collections) {
  $documents = [System.Collections.Generic.List[object]]::new()
  $pageToken = $null
  do {
    $url = "https://firestore.googleapis.com/v1/projects/$ProjectId/databases/(default)/documents/$collection" + '?pageSize=1000'
    if ($pageToken) { $url += '&pageToken=' + [uri]::EscapeDataString($pageToken) }
    $response = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
    foreach ($document in @($response.documents)) {
      if ($null -ne $document) { $documents.Add($document) }
    }
    $pageToken = $response.nextPageToken
  } while ($pageToken)
  $path = Join-Path $destination "$collection.json"
  ConvertTo-Json -InputObject @($documents.ToArray()) -Depth 100 | Set-Content -LiteralPath $path -Encoding utf8
  Write-Output "$collection : $($documents.Count) documents"
}
Write-Output "Backup: $destination"
