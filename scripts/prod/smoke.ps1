#requires -Version 5.1
<#
.SYNOPSIS
  Post-deploy smoke checks against the production site.

.DESCRIPTION
  Verifies the deployed app responds correctly without needing credentials:
    - /login renders (200)
    - / redirects unauthenticated users (307/302)
    - an authenticated API returns 401/403 without a session
    - the assistant / wake-word APIs are mounted (401 without a session)

.PARAMETER BaseUrl
  Production base URL. Defaults to $env:PROD_BASE_URL or the Vercel alias.

.EXAMPLE
  pwsh scripts/prod/smoke.ps1
  pwsh scripts/prod/smoke.ps1 -BaseUrl https://mymoney-mauve.vercel.app
#>
param(
  [string]$BaseUrl = $(if ($env:PROD_BASE_URL) { $env:PROD_BASE_URL } else { "https://mymoney-mauve.vercel.app" })
)

$ErrorActionPreference = "Stop"
$BaseUrl = $BaseUrl.TrimEnd("/")
Write-Host "Smoke checks against $BaseUrl"

$script:failed = $false

function Check {
  param([string]$Path, [string[]]$Expected, [string]$Label = $Path)
  $code = (& curl.exe -s -o NUL -w "%{http_code}" "$BaseUrl$Path")
  $pass = $Expected -contains $code
  if (-not $pass) { $script:failed = $true }
  $mark = if ($pass) { "PASS" } else { "FAIL" }
  Write-Host ("  [{0}] {1} -> {2} (expected {3})" -f $mark, $Label, $code, ($Expected -join "/"))
}

Check "/login"                  @("200")        "login page renders"
Check "/"                       @("302", "307") "root redirects unauthenticated"
Check "/api/health-score"       @("401", "403") "protected API rejects unauthenticated"
Check "/api/admin/wake-word"    @("401", "403") "wake-word API mounted"
Check "/api/assistant/message"  @("401", "403", "405") "assistant API mounted"

if ($script:failed) {
  Write-Host "Smoke checks FAILED." -ForegroundColor Red
  exit 1
}
Write-Host "Smoke checks passed." -ForegroundColor Green
exit 0
