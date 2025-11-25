# Test Setup Script for Tauri Migration

Write-Host "=== Testing Regen Tauri Setup ===" -ForegroundColor Cyan
Write-Host ""

# Test 1: Check Backend Dependencies
Write-Host "Test 1: Checking backend dependencies..." -ForegroundColor Yellow
cd server
if (Test-Path "node_modules") {
    Write-Host "  ✅ Backend node_modules exists" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Backend node_modules missing - run: npm install" -ForegroundColor Yellow
}

if (Test-Path "node_modules\@fastify\cors") {
    Write-Host "  ✅ @fastify/cors installed" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  @fastify/cors missing - run: npm install" -ForegroundColor Yellow
}

# Test 2: Check Tauri Dependencies
Write-Host "`nTest 2: Checking Tauri dependencies..." -ForegroundColor Yellow
cd ..\tauri-migration
if (Test-Path "node_modules") {
    Write-Host "  ✅ Tauri node_modules exists" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Tauri node_modules missing - run: npm install" -ForegroundColor Yellow
}

# Test 3: Check Configuration Files
Write-Host "`nTest 3: Checking configuration files..." -ForegroundColor Yellow
$configs = @(
    "tailwind.config.ts",
    "postcss.config.cjs",
    "vite.config.ts",
    "tsconfig.json",
    "src-tauri\Cargo.toml",
    "src-tauri\tauri.conf.json"
)

foreach ($config in $configs) {
    if (Test-Path $config) {
        Write-Host "  ✅ $config exists" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $config missing" -ForegroundColor Red
    }
}

# Test 4: Check Rust
Write-Host "`nTest 4: Checking Rust installation..." -ForegroundColor Yellow
$rustc = Get-Command rustc -ErrorAction SilentlyContinue
if ($rustc) {
    Write-Host "  ✅ Rust installed: $($rustc.Version)" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Rust not found - install from https://rustup.rs/" -ForegroundColor Yellow
}

# Test 5: Check Tauri CLI
Write-Host "`nTest 5: Checking Tauri CLI..." -ForegroundColor Yellow
$tauri = Get-Command tauri -ErrorAction SilentlyContinue
if ($tauri) {
    Write-Host "  ✅ Tauri CLI installed" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Tauri CLI not found - run: npm install -g @tauri-apps/cli" -ForegroundColor Yellow
}

# Summary
Write-Host "`n=== Summary ===" -ForegroundColor Cyan
Write-Host "Run the following to complete setup:" -ForegroundColor White
Write-Host "  1. cd server && npm install" -ForegroundColor Yellow
Write-Host "  2. cd ..\tauri-migration && npm install" -ForegroundColor Yellow
Write-Host "  3. npm install -g @tauri-apps/cli (if not installed)" -ForegroundColor Yellow
Write-Host "  4. Install Rust from https://rustup.rs/ (if not installed)" -ForegroundColor Yellow

cd ..


