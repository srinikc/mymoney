#Requires -Version 5.1
<#
.SYNOPSIS
    Docker PostgreSQL Backup Script
.DESCRIPTION
    Creates a compressed dump and uploads to S3-compatible storage.
    Keeps last 30 backups, deletes older ones.
    Can be scheduled via Task Scheduler.
#>

param(
    [string]$BackupDir = "./backups",
    [string]$S3Bucket = "s3://mymoney-backups",
    [string]$S3Endpoint = "",
    [string]$PGContainer = "mymoney_postgres",
    [int]$RetentionDays = 30
)

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = Join-Path -Path $BackupDir -ChildPath "mymoney_$Timestamp.sql.gz"

# Ensure backup directory exists
if (-not (Test-Path -LiteralPath $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Starting PostgreSQL backup..."

# Dump PostgreSQL and compress
$dumpOutput = docker exec $PGContainer pg_dumpall -U mymoney 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "Backup failed: $dumpOutput"
    exit 1
}
$dumpOutput | gzip | Set-Content -Path $BackupFile -Encoding Byte

Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Backup created: $BackupFile"

# Upload to S3-compatible storage
$s3Params = @("cp", $BackupFile, "$S3Bucket/")
if ($S3Endpoint) {
    $s3Params = @("--endpoint-url", $S3Endpoint) + $s3Params
}

Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Uploading to S3..."
$uploadResult = & "aws" "s3" $s3Params 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Warning "S3 upload failed; backup kept locally at $BackupFile"
}

# Cleanup old backups (local)
Get-ChildItem -Path $BackupDir -Filter "mymoney_*.sql.gz" | Where-Object {
    $_.LastWriteTime -lt (Get-Date).AddDays(-$RetentionDays)
} | Remove-Item -Force

Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Cleaned up backups older than $RetentionDays days"

<#
Scheduled Task Setup (run as admin):
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-File `"C:\path\to\scripts\docker-backup.ps1`""
$trigger = New-ScheduledTaskTrigger -Daily -At 3am
Register-ScheduledTask -TaskName "MyMoneyBackup" -Action $action -Trigger $trigger -RunLevel Highest
#>

Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Backup completed successfully"
