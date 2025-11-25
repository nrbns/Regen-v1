# Complete Regen Startup Script
# Starts backend, frontend, and Tauri window

Write-Host "=== Starting Regen ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Configure Rust
$cargoBin = "$env:USERPROFILE\.cargo\bin"
if (Test-Path $cargoBin) {
    $env:Path = "$cargoBin;$env:Path"
    $env:CARGO_HOME = "$env:USERPROFILE\.cargo"
    $env:RUSTUP_HOME = "$env:USERPROFILE\.rustup"
    Write-Host " Rust configured" -ForegroundColor Green
} else {
    Write-Host " Rust not found! Install from https://rustup.rs/" -ForegroundColor Red
    exit 1
}

# Step 2: Start Backend
Write-Host "
[1/3] Starting Backend Server..." -ForegroundColor Yellow
$serverPath = Join-Path $PSScriptRoot "server"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$serverPath'; Write-Host ' Backend Server' -ForegroundColor Cyan; node redix-server.js" -WindowStyle Normal
Start-Sleep -Seconds 3

# Step 3: Start Tauri (includes frontend)
Write-Host "
[2/3] Starting Tauri Application..." -ForegroundColor Yellow
Write-Host "   This starts Vite + Tauri window" -ForegroundColor Gray
Write-Host "   First build: 2-5 minutes" -ForegroundColor Gray
$tauriPath = Join-Path $PSScriptRoot "tauri-migration"
cd $tauriPath
npm run tauri:dev
