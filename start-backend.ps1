# Quick script to start the backend server
Write-Host "Starting backend server on port 4000..." -ForegroundColor Cyan
Write-Host ""

# Check if port 4000 is already in use
$portInUse = Get-NetTCPConnection -LocalPort 4000 -ErrorAction SilentlyContinue
if ($portInUse) {
    Write-Host "⚠️  Port 4000 is already in use!" -ForegroundColor Yellow
    Write-Host "Killing process on port 4000..." -ForegroundColor Yellow
    $processId = (Get-NetTCPConnection -LocalPort 4000).OwningProcess
    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

# Start the server
Write-Host "Starting server..." -ForegroundColor Green
node server/redix-server.js

