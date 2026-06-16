# Run once as Administrator to allow phone access on your home WiFi
# Includes Public profile because many home networks are detected as Public on Windows

New-NetFirewallRule `
  -DisplayName "Meal Tracker LAN" `
  -Direction Inbound `
  -Protocol TCP `
  -LocalPort 3000 `
  -Action Allow `
  -Profile Private, Public

Write-Host ""
Write-Host "Firewall rule added for port 3000 (Private + Public networks)."
Write-Host ""
Write-Host "On your phone, open the URL shown on the dashboard."
Write-Host "Your Wi-Fi IP is probably something like http://192.168.x.x:3000"
Write-Host ""
Write-Host "Tip: Set your WiFi to Private in Windows Settings if phone still can't connect."
