# Convenience launcher for development on Windows.
# Ensures ComSpec is set (some minimal/CI shells omit it, which breaks npm
# lifecycle scripts), then starts the full Tauri desktop app in dev mode.

if (-not $env:ComSpec) { $env:ComSpec = "C:\Windows\System32\cmd.exe" }

if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Cyan
    npm install
}

Write-Host "Starting Claude Glass Widget (dev)..." -ForegroundColor Cyan
npm run app:dev
