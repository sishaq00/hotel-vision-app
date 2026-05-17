# NEXORA OS — PocketBase Setup Script for Windows
# Run this on the computer that will act as the LAN server.
# Double-click or run in PowerShell as Administrator.

$ErrorActionPreference = "Stop"
$PB_VERSION = "0.22.0"
$PB_DIR     = "$env:USERPROFILE\nexora-server"
$PB_EXE     = "$PB_DIR\pocketbase.exe"
$PB_URL     = "https://github.com/pocketbase/pocketbase/releases/download/v$PB_VERSION/pocketbase_${PB_VERSION}_windows_amd64.zip"
$PB_PORT    = 8090

Write-Host ""
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "  NEXORA OS — LAN Server Setup" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# ── Create directory ─────────────────────────────────────────────────────────
if (!(Test-Path $PB_DIR)) {
    New-Item -ItemType Directory -Path $PB_DIR | Out-Null
    Write-Host "[1/4] Created folder: $PB_DIR" -ForegroundColor Green
} else {
    Write-Host "[1/4] Folder already exists: $PB_DIR" -ForegroundColor Yellow
}

# ── Download PocketBase ──────────────────────────────────────────────────────
if (!(Test-Path $PB_EXE)) {
    Write-Host "[2/4] Downloading PocketBase v$PB_VERSION..." -ForegroundColor Cyan
    $zipPath = "$PB_DIR\pocketbase.zip"
    Invoke-WebRequest -Uri $PB_URL -OutFile $zipPath -UseBasicParsing
    Expand-Archive -Path $zipPath -DestinationPath $PB_DIR -Force
    Remove-Item $zipPath
    Write-Host "      Downloaded and extracted." -ForegroundColor Green
} else {
    Write-Host "[2/4] PocketBase already downloaded." -ForegroundColor Yellow
}

# ── Get local IP ─────────────────────────────────────────────────────────────
$localIp = (Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object { $_.InterfaceAlias -notmatch "Loopback" -and $_.IPAddress -match "^192\." } |
    Select-Object -First 1).IPAddress

if (!$localIp) {
    $localIp = (Get-NetIPAddress -AddressFamily IPv4 |
        Where-Object { $_.InterfaceAlias -notmatch "Loopback" } |
        Select-Object -First 1).IPAddress
}

Write-Host "[3/4] Local IP address: $localIp" -ForegroundColor Green

# ── Create Windows Firewall rule ─────────────────────────────────────────────
$ruleName = "NEXORA PocketBase Port $PB_PORT"
$existing = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
if (!$existing) {
    New-NetFirewallRule -DisplayName $ruleName `
        -Direction Inbound -Protocol TCP -LocalPort $PB_PORT `
        -Action Allow | Out-Null
    Write-Host "[4/4] Firewall rule added for port $PB_PORT." -ForegroundColor Green
} else {
    Write-Host "[4/4] Firewall rule already exists." -ForegroundColor Yellow
}

# ── Create startup shortcut ──────────────────────────────────────────────────
$startupPath = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\NEXORA Server.lnk"
if (!(Test-Path $startupPath)) {
    $wsh = New-Object -ComObject WScript.Shell
    $sc  = $wsh.CreateShortcut($startupPath)
    $sc.TargetPath       = $PB_EXE
    $sc.Arguments        = "serve --http=0.0.0.0:$PB_PORT"
    $sc.WorkingDirectory = $PB_DIR
    $sc.WindowStyle      = 7  # minimized
    $sc.Save()
    Write-Host "      Startup shortcut created — server will auto-start with Windows." -ForegroundColor Green
}

Write-Host ""
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "  Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "  Server URL for other computers:" -ForegroundColor White
Write-Host "  http://${localIp}:${PB_PORT}" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Next steps:" -ForegroundColor White
Write-Host "  1. Start the server: double-click NEXORA Server in Startup folder"
Write-Host "  2. Open http://127.0.0.1:${PB_PORT}/_/ to set up admin account"
Write-Host "  3. Create collection 'hotel_sync' with fields:"
Write-Host "     table (text), payload (json), device_id (text), ts (number)"
Write-Host "  4. Enter the URL above in Settings > LAN Sync on all other computers"
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# ── Start server now ─────────────────────────────────────────────────────────
$start = Read-Host "Start the server now? (Y/N)"
if ($start -eq "Y" -or $start -eq "y") {
    Start-Process -FilePath $PB_EXE -ArgumentList "serve --http=0.0.0.0:$PB_PORT" -WorkingDirectory $PB_DIR
    Start-Sleep 2
    Start-Process "http://127.0.0.1:$PB_PORT/_/"
    Write-Host "Server started! Browser opened for admin setup." -ForegroundColor Green
}
