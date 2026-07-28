$lastCommit = git log -1 --format="%ct" 2>$null
if (-not $lastCommit) { exit 0 }
$lastTime = [DateTimeOffset]::FromUnixTimeSeconds([int64]$lastCommit)
$hoursAgo = [DateTimeOffset]::UtcNow.Subtract($lastTime).TotalHours
$sinceStr = "Last commit was {0:N1} hours ago" -f $hoursAgo
if ($hoursAgo -ge 2) {
  Write-Host "!! $sinceStr - consider committing and pushing!" -ForegroundColor Yellow
  Write-Host "   Feature branch: $(git rev-parse --abbrev-ref HEAD)" -ForegroundColor DarkGray
} elseif ($hoursAgo -ge 1) {
  Write-Host ".. $sinceStr - getting close to 2 hour mark" -ForegroundColor DarkGray
}
