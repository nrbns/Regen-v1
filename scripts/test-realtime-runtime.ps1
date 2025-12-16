# Realtime Infrastructure Runtime Test
# Comprehensive validation of all components

Write-Host "`n=== Realtime Infrastructure Runtime Test ===" -ForegroundColor Cyan

$ErrorActionPreference = "Continue"
$passed = 0
$failed = 0

# Test 1: Redis
Write-Host "`n[1/6] Redis availability..." -ForegroundColor Yellow
$redisOk = $false

$dockerRedis = docker ps --filter "name=regen-redis" --format "{{.Names}}" 2>$null
if ($dockerRedis -eq "regen-redis") {
    Write-Host "  OK: Redis running in Docker" -ForegroundColor Green
    $redisOk = $true
    $passed++
} else {
    try {
        $ping = redis-cli ping 2>$null
        if ($ping -eq "PONG") {
            Write-Host "  OK: Redis running locally" -ForegroundColor Green
            $redisOk = $true
            $passed++
        } else {
            Write-Host "  FAIL: Redis not running" -ForegroundColor Red
            Write-Host "  Start: docker run -d --name regen-redis -p 6379:6379 redis:alpine" -ForegroundColor Gray
            $failed++
        }
    } catch {
        Write-Host "  FAIL: Redis not found" -ForegroundColor Red
        Write-Host "  Install: docker run -d --name regen-redis -p 6379:6379 redis:alpine" -ForegroundColor Gray
        $failed++
    }
}

# Test 2: Redis connectivity
if ($redisOk) {
    Write-Host "`n[2/6] Redis connectivity..." -ForegroundColor Yellow
    Push-Location server
    $output = tsx test-redis.ts 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  OK: Redis tests passed" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "  FAIL: Redis tests failed" -ForegroundColor Red
        $failed++
    }
    Pop-Location
} else {
    Write-Host "`n[2/6] Redis connectivity... SKIPPED" -ForegroundColor Yellow
}

# Test 3: Environment
Write-Host "`n[3/6] Environment configuration..." -ForegroundColor Yellow
if (Test-Path ".env") {
    $env = Get-Content .env -Raw
    if (($env -match "JWT_SECRET") -and ($env -match "REDIS_URL")) {
        Write-Host "  OK: Environment configured" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "  WARN: Missing env vars (using defaults)" -ForegroundColor Yellow
        $passed++
    }
} else {
    Write-Host "  WARN: No .env file (using defaults)" -ForegroundColor Yellow
    $passed++
}

# Test 4: Dependencies
Write-Host "`n[4/6] Server dependencies..." -ForegroundColor Yellow
Push-Location server
if (Test-Path "node_modules") {
    Write-Host "  OK: Dependencies installed" -ForegroundColor Green
    $passed++
} else {
    Write-Host "  FAIL: Dependencies missing" -ForegroundColor Red
    Write-Host "  Run: cd server && npm install" -ForegroundColor Gray
    $failed++
}
Pop-Location

# Test 5: Files
Write-Host "`n[5/6] TypeScript files..." -ForegroundColor Yellow
$files = @(
    "server/index.ts",
    "server/realtime.ts",
    "server/streamingWorker.ts",
    "server/jobState.ts",
    "src/services/realtimeSocket.ts",
    "src/hooks/useRealtimeJob.ts",
    "src/components/jobs/JobStatusPanel.tsx"
)

$allExist = $true
foreach ($f in $files) {
    if (-not (Test-Path $f)) {
        Write-Host "  FAIL: Missing $f" -ForegroundColor Red
        $allExist = $false
    }
}

if ($allExist) {
    Write-Host "  OK: All files present" -ForegroundColor Green
    $passed++
} else {
    $failed++
}

# Test 6: Server startup
if ($redisOk -and (Test-Path "server/node_modules")) {
    Write-Host "`n[6/6] Server startup..." -ForegroundColor Yellow
    
    $job = Start-Job -ScriptBlock {
        param($path)
        Set-Location $path
        npm run dev:realtime
    } -ArgumentList (Get-Location).Path
    
    Write-Host "  Waiting for server..." -ForegroundColor Gray
    Start-Sleep -Seconds 5
    
    try {
        $health = Invoke-RestMethod -Uri "http://localhost:3000/health" -TimeoutSec 5
        if ($health.status -eq "ok") {
            Write-Host "  OK: Server started (uptime: $($health.uptime)s)" -ForegroundColor Green
            $passed++
        } else {
            Write-Host "  FAIL: Health check failed" -ForegroundColor Red
            $failed++
        }
    } catch {
        Write-Host "  FAIL: Could not connect to server" -ForegroundColor Red
        $failed++
    }
    
    Stop-Job $job
    Remove-Job $job
    Write-Host "  Server stopped" -ForegroundColor Gray
} else {
    Write-Host "`n[6/6] Server startup... SKIPPED" -ForegroundColor Yellow
}

# Summary
Write-Host "`n=== Summary ===" -ForegroundColor Cyan
Write-Host "Passed: $passed" -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor Red

$total = $passed + $failed
if ($total -gt 0) {
    $rate = [math]::Round(($passed / $total) * 100, 1)
    Write-Host "Success: $rate%" -ForegroundColor Cyan
}

# Next steps
Write-Host "`n=== Next Steps ===" -ForegroundColor Cyan
if ($failed -eq 0) {
    Write-Host "All tests passed! Ready to run:" -ForegroundColor Green
    Write-Host "  npm run dev:realtime" -ForegroundColor Gray
    Write-Host "  npm run test:load:realtime" -ForegroundColor Gray
} else {
    Write-Host "Fix failed tests:" -ForegroundColor Yellow
    if (-not $redisOk) {
        Write-Host "  docker run -d --name regen-redis -p 6379:6379 redis:alpine" -ForegroundColor Gray
    }
    if (-not (Test-Path "server/node_modules")) {
        Write-Host "  cd server && npm install" -ForegroundColor Gray
    }
}

Write-Host ""
exit $failed
