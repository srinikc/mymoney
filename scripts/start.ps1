# Get real network adapters only (exclude VMware, VirtualBox, Hyper-V, Loopback, Bluetooth, vEthernet)
$adapters = Get-NetAdapter -Physical | Where-Object { $_.Status -eq 'Up' }
$realIps = $adapters | ForEach-Object {
  $ipObj = Get-NetIPAddress -InterfaceIndex $_.ifIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue
  if ($ipObj) {
    [PSCustomObject]@{ Interface = $_.Name; IP = $ipObj.IPAddress }
  }
}

# Prefer Wi-Fi, then Ethernet
$ip = ($realIps | Where-Object { $_.Interface -like '*Wi-Fi*' -or $_.Interface -like '*Wireless*' } | Select-Object -First 1).IP
if (-not $ip) {
  $ip = ($realIps | Where-Object { $_.Interface -like '*Ethernet*' } | Select-Object -First 1).IP
}
if (-not $ip) {
  # Fallback: any real adapter, prefer 192.168.x.x
  $ip = ($realIps | Where-Object { $_.IP -like '192.168.*' } | Select-Object -First 1).IP
}
if (-not $ip) {
  $ip = ($realIps | Select-Object -First 1).IP
}

Write-Host ""
Write-Host "Starting MyMoney..."
Write-Host ""
Write-Host "  Local:    http://localhost:3005"
if ($ip) {
  Write-Host "  Network:  http://$($ip):3005"
}
Write-Host ""

npx.cmd next dev -p 3005 -H 0.0.0.0
