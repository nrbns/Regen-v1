# Start API Server from project root
# This ensures Python can find the apps.api module

Write-Host "Starting OmniBrowser API Server..." -ForegroundColor Green
Write-Host "Running from: $(Get-Location)" -ForegroundColor Gray

# Check if we're in the project root
if (-not (Test-Path "apps\api\main.py")) {
    Write-Host "Error: Please run this script from the project root directory" -ForegroundColor Red
    exit 1
}

# Start the server
python -m uvicorn apps.api.main:app --reload --port 8000




