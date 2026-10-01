param([string]$ProjectId = 'vehicle2-79fd6')
$ErrorActionPreference = 'Stop'
$token = (& gcloud auth print-access-token).Trim()
if (-not $token) { throw 'Google Cloud authentication is required.' }
$headers = @{ Authorization = "Bearer $token"; 'x-goog-user-project' = $ProjectId }
$root = "https://firestore.googleapis.com/v1/projects/$ProjectId/databases/(default)/documents"
$destination = Join-Path (Split-Path $PSScriptRoot -Parent) ('.local-backup/workspaces-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Path $destination -Force | Out-Null
$manifest = [System.Collections.Generic.List[object]]::new()
function Export-Collection([string]$CollectionPath) {
  $documents = [System.Collections.Generic.List[object]]::new()
  $pageToken = $null
  do {
    $url = $root + '/' + $CollectionPath + '?pageSize=1000'
    if ($pageToken) { $url += '&pageToken=' + [uri]::EscapeDataString($pageToken) }
    $response = Invoke-RestMethod -Uri $url -Headers $headers
    foreach ($document in @($response.documents)) { if ($null -ne $document) { $documents.Add($document) } }
    $pageToken = $response.nextPageToken
  } while ($pageToken)
  $filename = $CollectionPath.Replace('/', '__') + '.json'
  ConvertTo-Json -InputObject @($documents.ToArray()) -Depth 100 | Set-Content -LiteralPath (Join-Path $destination $filename) -Encoding utf8
  $manifest.Add(@{path=$CollectionPath;count=$documents.Count;file=$filename})
  return @($documents.ToArray())
}
$business = @('customers','drivers','fromcustomers','parties','tripEntries','vehicles','archivedTrips','loads')
foreach ($collection in $business) { $null = Export-Collection $collection }
$staff = @(Export-Collection 'staff')
foreach ($profile in $staff) {
  $uid = $profile.name.Split('/')[-1]
  foreach ($collection in $business) { $null = Export-Collection "workspaces/$uid/$collection" }
}
ConvertTo-Json -InputObject @($manifest.ToArray()) -Depth 10 | Set-Content -LiteralPath (Join-Path $destination 'manifest.json') -Encoding utf8
Write-Output "Backup complete: $destination; $($manifest.Count) collections. Includes all staff workspaces, legacy records, and archives."
