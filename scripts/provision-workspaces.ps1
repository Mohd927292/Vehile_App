param(
  [Parameter(Mandatory=$true)][string]$AdminEmail,
  [string]$ProjectId = 'vehicle2-79fd6',
  [switch]$Apply
)
$ErrorActionPreference = 'Stop'
$token = (& gcloud auth print-access-token).Trim()
if (-not $token) { throw 'Google Cloud authentication is required.' }
$headers = @{ Authorization = "Bearer $token"; 'x-goog-user-project' = $ProjectId }
$accounts = @()
$nextPage = $null
do {
  $url = "https://identitytoolkit.googleapis.com/v1/projects/$ProjectId/accounts:batchGet?maxResults=1000"
  if ($nextPage) { $url += '&nextPageToken=' + [uri]::EscapeDataString($nextPage) }
  $response = Invoke-RestMethod -Uri $url -Headers $headers
  $accounts += @($response.users)
  $nextPage = $response.nextPageToken
} while ($nextPage)
$administrators = @($accounts | Where-Object { $_.email -eq $AdminEmail -and -not $_.disabled })
if ($administrators.Count -ne 1) { throw 'The admin email must identify exactly one enabled Firebase Auth account.' }
$adminUid = $administrators[0].localId
$root = "https://firestore.googleapis.com/v1/projects/$ProjectId/databases/(default)/documents"
$staff = @((Invoke-RestMethod -Uri ($root + '/staff?pageSize=1000') -Headers $headers).documents)
$backupPath = Join-Path (Split-Path $PSScriptRoot -Parent) ('.local-backup/access-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Path $backupPath -Force | Out-Null
ConvertTo-Json -InputObject $staff -Depth 40 | Set-Content -LiteralPath (Join-Path $backupPath 'staff-before.json') -Encoding utf8
$accounts | Select-Object localId,email,displayName,disabled | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath (Join-Path $backupPath 'account-directory.json') -Encoding utf8
$release = Invoke-RestMethod -Uri "https://firebaserules.googleapis.com/v1/projects/$ProjectId/releases/cloud.firestore" -Headers $headers
$ruleset = Invoke-RestMethod -Uri "https://firebaserules.googleapis.com/v1/$($release.rulesetName)" -Headers $headers
$ruleset | ConvertTo-Json -Depth 40 | Set-Content -LiteralPath (Join-Path $backupPath 'rules-before.json') -Encoding utf8
foreach ($account in $accounts) {
  if (-not $account.email) { throw 'An account has no email. Review before provisioning.' }
  $uid = $account.localId
  $existing = $staff | Where-Object { $_.name -eq "projects/$ProjectId/databases/(default)/documents/staff/$uid" }
  $role = if ($uid -eq $adminUid) { 'admin' } else { 'user' }
  $displayName = if ($account.displayName) { $account.displayName } else { $account.email.Split('@')[0] }
  $fields = @{
    email = @{ stringValue = $account.email }
    displayName = @{ stringValue = $displayName }
    role = @{ stringValue = $role }
    active = @{ booleanValue = (-not $account.disabled) }
    createdAt = if ($existing.fields.createdAt) { $existing.fields.createdAt } else { @{ timestampValue = (Get-Date).ToUniversalTime().ToString('o') } }
  }
  if ($Apply) {
    $condition = if ($existing) {
      $updateTime = if ($existing.updateTime -is [datetime]) { $existing.updateTime.ToUniversalTime().ToString('o') } else { [string]$existing.updateTime }
      'currentDocument.updateTime=' + [uri]::EscapeDataString($updateTime)
    } else { 'currentDocument.exists=false' }
    $body = @{fields=$fields} | ConvertTo-Json -Depth 20
    $null = Invoke-RestMethod -Uri ($root + '/staff/' + $uid + '?' + $condition) -Headers $headers -Method Patch -ContentType 'application/json' -Body $body
  }
}
Write-Output "Profiles: $($accounts.Count); admin: $AdminEmail; applied: $Apply; backup: $backupPath"
