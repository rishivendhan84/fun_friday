# Fun Friday — open the app to colleagues on the office LAN.
# Run as Administrator:  right-click > Run with PowerShell (admin),
# or from an elevated prompt:
#   powershell -ExecutionPolicy Bypass -File .\scripts\allow-funfriday.ps1

$port = 3000

if (-not ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()
    ).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Write-Error "Please run this script as Administrator."
  exit 1
}

# 1. Recreate a clean inbound rule for TCP 3000 on ALL profiles.
#    (Rules created by the Docker Desktop popup are often Private-only,
#    so they stop working when Windows flags the WiFi as Public.)
Get-NetFirewallRule -DisplayName "Fun Friday*" -ErrorAction SilentlyContinue |
  Remove-NetFirewallRule
New-NetFirewallRule -DisplayName "Fun Friday Arena (TCP $port)" `
  -Direction Inbound -Action Allow -Protocol TCP -LocalPort $port `
  -Profile Domain, Private, Public | Out-Null
Write-Host "[ok] Inbound firewall rule for TCP $port created (all profiles)."

# 2. Treat the current network as a trusted Private LAN.
Get-NetConnectionProfile | Where-Object NetworkCategory -eq 'Public' | ForEach-Object {
  Set-NetConnectionProfile -InterfaceIndex $_.InterfaceIndex -NetworkCategory Private
  Write-Host "[ok] Network '$($_.Name)' switched from Public to Private."
}

# 3. Is the app actually running?
if (Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue) {
  Write-Host "[ok] Something is listening on port $port."
} else {
  Write-Warning "Nothing is listening on port $port — start the app with: docker compose up -d"
}

# 4. Print the address to share (skips Docker/WSL virtual adapters).
Write-Host ""
Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object {
  $_.IPAddress -ne '127.0.0.1' -and
  $_.IPAddress -notlike '169.254*' -and
  $_.IPAddress -notlike '172.*' -and
  $_.InterfaceAlias -notlike '*vEthernet*' -and
  $_.InterfaceAlias -notlike '*WSL*' -and
  $_.InterfaceAlias -notlike '*Loopback*'
} | ForEach-Object {
  Write-Host ("Share this link: http://{0}:{1}   (adapter: {2})" -f $_.IPAddress, $port, $_.InterfaceAlias)
}
