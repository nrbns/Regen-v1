# PowerShell script for testing new Regen v1 features
# Runs E2E tests for all new features

Write-Host "🧪 Testing Regen v1 New Features..." -ForegroundColor Cyan
Write-Host ""

# Check if Playwright is installed
if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
    Write-Host "❌ npx not found. Please install Node.js." -ForegroundColor Red
    exit 1
}

# Run E2E tests
Write-Host "📋 Running E2E tests..." -ForegroundColor Yellow
Write-Host ""

Write-Host "1️⃣ Testing Realtime Features..." -ForegroundColor Green
npx playwright test tests/e2e/realtime-features.spec.ts --reporter=list

Write-Host ""
Write-Host "2️⃣ Testing Event Bus Performance..." -ForegroundColor Green
npx playwright test tests/e2e/event-bus-performance.spec.ts --reporter=list

Write-Host ""
Write-Host "3️⃣ Testing AI Features..." -ForegroundColor Green
npx playwright test tests/e2e/ai-features.spec.ts --reporter=list

Write-Host ""
Write-Host "4️⃣ Testing Performance Benchmarks..." -ForegroundColor Green
npx playwright test tests/e2e/performance-benchmarks.spec.ts --reporter=list

Write-Host ""
Write-Host "✅ All tests completed!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Test Summary:" -ForegroundColor Cyan
npx playwright test --reporter=list --reporter=html
