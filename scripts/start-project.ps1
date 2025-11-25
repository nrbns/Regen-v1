# Start Regen Project
# Starts both backend server and Tauri app

Write-Host "=== Starting Regen ===" -ForegroundColor Cyan
Write-Host ""

# Get project root
$projectRoot = Split-Path -Parent $PSScriptRoot
$serverPath = Join-Path $projectRoot "server"
$tauriPath = Join-Path $projectRoot "tauri-migration"

# Step 1: Check and install backend dependencies
Write-Host "Step 1: Checking backend dependencies..." -ForegroundColor Yellow
Set-Location $serverPath
if (-not (Test-Path "node_modules")) {
    Write-Host "  Installing backend dependencies..." -ForegroundColor Yellow
    npm install
}

# Step 2: Start backend server in new window
Write-Host "`nStep 2: Starting backend server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$serverPath'; Write-Host '=== Backend Server ===' -ForegroundColor Green; Write-Host 'Starting on http://127.0.0.1:4000' -ForegroundColor Cyan; node redix-server.js" -WindowStyle Normal
Start-Sleep -Seconds 3

# Step 3: Setup Rust environment
Write-Host "`nStep 3: Setting up Rust environment..." -ForegroundColor Yellow
$cargoBin = "$env:USERPROFILE\.cargo\bin"
if (Test-Path $cargoBin) {
    $env:Path = "$cargoBin;$env:Path"
    $env:CARGO_HOME = "$env:USERPROFILE\.cargo"
    $env:RUSTUP_HOME = "$env:USERPROFILE\.rustup"
    Write-Host "  ✅ Rust environment configured" -ForegroundColor Green
    try {
        $cargoVersion = cargo --version 2>&1
        Write-Host "  Rust version: $cargoVersion" -ForegroundColor Gray
    } catch {
        Write-Host "  ⚠️  Rust found but cargo command failed" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ⚠️  Rust not found at $cargoBin" -ForegroundColor Yellow
    Write-Host "  Please install Rust from https://rustup.rs/" -ForegroundColor Red
    Write-Host "  Or restart terminal after Rust installation" -ForegroundColor Yellow
    exit 1
}

# Step 4: Check and install Tauri dependencies
Write-Host "`nStep 4: Checking Tauri dependencies..." -ForegroundColor Yellow
Set-Location $tauriPath
if (-not (Test-Path "node_modules")) {
    Write-Host "  Installing Tauri dependencies..." -ForegroundColor Yellow
    npm install
}

# Step 5: Start Tauri
Write-Host "`nStep 5: Starting Tauri app..." -ForegroundColor Yellow
Write-Host "  This may take 2-5 minutes on first run (Rust compilation)..." -ForegroundColor Gray
npm run tauri:dev


