# Omnibrowser Demo Launcher
# Checks dependencies and starts all services

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Omnibrowser Demo Launcher" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$errors = @()

# Check Node.js
Write-Host "Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>$null
    if ($nodeVersion -match "v(\d+)\.") {
        $major = [int]$matches[1]
        if ($major -ge 18) {
            Write-Host "✓ Node.js $nodeVersion found" -ForegroundColor Green
        } else {
            $errors += "Node.js version $nodeVersion is too old (need v18+)"
        }
    }
} catch {
    $errors += "Node.js not found. Install from https://nodejs.org/"
}

# Check Redis
Write-Host "Checking Redis..." -ForegroundColor Yellow
try {
    $redisCheck = redis-cli --version 2>$null
    if ($redisCheck) {
        Write-Host "✓ Redis CLI found: $redisCheck" -ForegroundColor Green
    }
} catch {
    $errors += "Redis not found. Install from https://redis.io/download or run in Docker"
}

# Check if Redis is running
Write-Host "Checking Redis connection..." -ForegroundColor Yellow
try {
    $redisPing = redis-cli ping 2>$null
    if ($redisPing -eq "PONG") {
        Write-Host "✓ Redis is running" -ForegroundColor Green
    } else {
        $errors += "Redis is installed but not running. Start with: redis-server"
    }
} catch {
    $errors += "Cannot connect to Redis. Start with: redis-server"
}

# Check npm dependencies
Write-Host "Checking npm packages..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Write-Host "✓ node_modules found" -ForegroundColor Green
} else {
    Write-Host "⚠ node_modules missing. Running npm install..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        $errors += "npm install failed"
    }
}

Write-Host ""

# Report errors
if ($errors.Count -gt 0) {
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  Missing Dependencies" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    foreach ($err in $errors) {
        Write-Host "✗ $err" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "Please install missing dependencies and try again." -ForegroundColor Yellow
    Write-Host "See docs/INSTALLATION.md for detailed instructions." -ForegroundColor Yellow
    exit 1
}

# All checks passed
Write-Host "========================================" -ForegroundColor Green
Write-Host "  All Dependencies Ready" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Ask user what to start
Write-Host "What would you like to start?" -ForegroundColor Cyan
Write-Host "  1) Full stack (Redis + Server + Frontend)" -ForegroundColor White
Write-Host "  2) Server only (API + Socket.IO)" -ForegroundColor White
Write-Host "  3) Frontend only (Vite dev server)" -ForegroundColor White
Write-Host "  4) Run tests" -ForegroundColor White
Write-Host ""
$choice = Read-Host "Enter choice (1-4)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "Starting full stack..." -ForegroundColor Green
        Write-Host "  - Redis: localhost:6379" -ForegroundColor Gray
        Write-Host "  - Server: http://localhost:3000" -ForegroundColor Gray
        Write-Host "  - Frontend: http://localhost:5173" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Yellow
        Write-Host ""
        
        # Start services in background
        Start-Job -Name "Redis" -ScriptBlock { redis-server } | Out-Null
        Start-Sleep -Seconds 2
        Start-Job -Name "Server" -ScriptBlock { Set-Location $using:PWD; npm run dev:realtime } | Out-Null
        Start-Sleep -Seconds 3
        Start-Job -Name "Frontend" -ScriptBlock { Set-Location $using:PWD; npm run dev:web } | Out-Null
        
        Write-Host "Services starting..." -ForegroundColor Yellow
        Start-Sleep -Seconds 5
        
        Write-Host ""
        Write-Host "Opening browser..." -ForegroundColor Green
        Start-Process "http://localhost:5173"
        
        Write-Host ""
        Write-Host "Watching logs (Ctrl+C to stop)..." -ForegroundColor Yellow
        Get-Job | Receive-Job -Wait
    }
    "2" {
        Write-Host "Starting server..." -ForegroundColor Green
        npm run dev:realtime
    }
    "3" {
        Write-Host "Starting frontend..." -ForegroundColor Green
        npm run dev:web
    }
    "4" {
        Write-Host "Running tests..." -ForegroundColor Green
        npm run test:all
    }
    default {
        Write-Host "Invalid choice" -ForegroundColor Red
        exit 1
    }
}
