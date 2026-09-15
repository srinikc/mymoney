#requires -Version 5.1
<#
.SYNOPSIS
  Manual production release for MyMoney: checks -> DB migrate -> Vercel prod -> smoke.

.DESCRIPTION
  Run this ONLY when you intend to cut a production release (not on every change
  or build). It loads secrets from `.env.production.local` (gitignored) and:
    1. runs typecheck + lint + unit tests
    2. applies pending Prisma migrations to the PRODUCTION database
    3. deploys to Vercel production (vercel --prod)
    4. runs smoke checks against the production URL

  It refuses to run if DATABASE_URL points at localhost.

.PARAMETER SkipChecks
  Skip typecheck / lint / unit tests.

.PARAMETER SkipMigrate
  Skip `prisma migrate deploy`.

.PARAMETER SkipDeploy
  Skip `vercel --prod`.

.PARAMETER Yes
  Do not prompt for confirmation.

.EXAMPLE
  pwsh scripts/prod/release.ps1
  pwsh scripts/prod/release.ps1 -SkipMigrate
  pwsh scripts/prod/release.ps1 -SkipChecks -SkipMigrate   # deploy + smoke only
#>
param(
  [switch]$SkipChecks,
  [switch]$SkipMigrate,
  [switch]$SkipDeploy,
  [switch]$Yes
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $repoRoot

function Fail([string]$msg) { Write-Host "FAIL: $msg" -ForegroundColor Red; exit 1 }
function Ok([string]$msg)   { Write-Host "OK: $msg" -ForegroundColor Green }
function Step([string]$msg) { Write-Host ""; Write-Host "== $msg ==" -ForegroundColor Cyan }

# ── Load production secrets (.env.production.local) ────────────────────
$envFile = Join-Path $repoRoot ".env.production.local"
if (-not (Test-Path $envFile)) {
  Fail "Missing $envFile. Copy .env.production.local.example to .env.production.local and fill it in."
}
$envMap = @{}
Get-Content $envFile | ForEach-Object {
  if ($_ -match '^\s*#' -or $_ -notmatch '=') { return }
  $kv = $_ -split '=', 2
  $envMap[$kv[0].Trim()] = $kv[1].Trim().Trim('"')
}

$prodDbUrl = $envMap['DATABASE_URL']
if (-not $prodDbUrl) { Fail "DATABASE_URL is not set in .env.production.local." }
if ($prodDbUrl -match 'localhost|127\.0\.0\.1') {
  Fail "DATABASE_URL points to localhost. Refusing to run production scripts against a local DB."
}
$prodBaseUrl = if ($envMap['PROD_BASE_URL']) { $envMap['PROD_BASE_URL'] } else { "https://mymoney-mauve.vercel.app" }

Write-Host "Prod DB host : $(([uri]$prodDbUrl).Host)"
Write-Host "Prod base URL: $prodBaseUrl"
if (-not $Yes) {
  $answer = Read-Host "Proceed with PRODUCTION release? (type 'yes')"
  if ($answer -ne "yes") { Write-Host "Aborted."; exit 0 }
}

# ── 1. Checks ──────────────────────────────────────────────────────────
if (-not $SkipChecks) {
  Step "Typecheck";   npx tsc --noEmit;                if ($LASTEXITCODE) { Fail "tsc failed" }
  Step "Lint";        npx next lint --max-warnings 200; if ($LASTEXITCODE) { Fail "lint failed" }
  Step "Unit tests";  npm test;                         if ($LASTEXITCODE) { Fail "unit tests failed" }
  Ok "Checks passed"
} else { Step "Checks skipped" }

# ── 2. Migrations (production) ─────────────────────────────────────────
if (-not $SkipMigrate) {
  Step "Migrations (production)"
  $env:DATABASE_URL = $prodDbUrl
  npx prisma migrate status; if ($LASTEXITCODE) { Fail "prisma migrate status failed" }
  npx prisma migrate deploy; if ($LASTEXITCODE) { Fail "prisma migrate deploy failed" }
  Ok "Migrations applied"
} else { Step "Migrations skipped" }

# ── 3. Deploy (Vercel production) ──────────────────────────────────────
if (-not $SkipDeploy) {
  Step "Deploy to Vercel (production)"
  vercel --prod --yes; if ($LASTEXITCODE) { Fail "vercel --prod failed" }
  Ok "Deployed"
} else { Step "Deploy skipped" }

# ── 4. Smoke checks ────────────────────────────────────────────────────
Step "Smoke checks"
& (Join-Path $PSScriptRoot "smoke.ps1") -BaseUrl $prodBaseUrl
if ($LASTEXITCODE) { Fail "smoke checks failed" }

Ok "Release complete: $prodBaseUrl"
