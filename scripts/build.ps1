# Convenience release builder for Windows.
# Produces NSIS + MSI installers under src-tauri/target/release/bundle.

if (-not $env:ComSpec) { $env:ComSpec = "C:\Windows\System32\cmd.exe" }

if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Cyan
    npm install
}

# Ensure icons exist (procedurally generated, no design tool required).
if (-not (Test-Path "src-tauri/icons/icon.ico")) {
    Write-Host "Generating icons..." -ForegroundColor Cyan
    node scripts/generate-icons.mjs
}

Write-Host "Building release installers..." -ForegroundColor Cyan
npm run app:build

Write-Host "Done. See src-tauri/target/release/bundle/" -ForegroundColor Green
