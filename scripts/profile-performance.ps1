# Performance Profiling Script
# Week 2 Phase 6: Manual Desktop Testing Support
# Usage: .\scripts\profile-performance.ps1

param(
    [switch]$ColdStart,
    [switch]$Memory,
    [switch]$TabSwitch,
    [switch]$All
)

Write-Host "===================================" -ForegroundColor Cyan
Write-Host "Omnibrowser Performance Profiler" -ForegroundColor Cyan
Write-Host "Week 2 - Phase 6 Testing Tool" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

function Test-ColdStart {
    Write-Host "[1/3] Cold Start Performance Test" -ForegroundColor Yellow
    Write-Host "Target: <3000ms" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Instructions:" -ForegroundColor White
    Write-Host "1. Close Omnibrowser completely" -ForegroundColor White
    Write-Host "2. Open Task Manager (Ctrl+Shift+Esc)" -ForegroundColor White
    Write-Host "3. Note the time when you launch the app" -ForegroundColor White
    Write-Host "4. Record time when UI is fully interactive" -ForegroundColor White
    Write-Host ""
    Write-Host "Expected: ~2500ms (95% confidence)" -ForegroundColor Green
    Write-Host ""
    
    $result = Read-Host "Enter cold start time in milliseconds (or 'skip')"
    if ($result -ne 'skip') {
        $time = [int]$result
        if ($time -lt 3000) {
            Write-Host "βœ… PASS: $time ms (target <3000ms)" -ForegroundColor Green
        } else {
            Write-Host "❌ FAIL: $time ms (exceeds 3000ms target)" -ForegroundColor Red
        }
    }
    Write-Host ""
}

function Test-Memory {
    Write-Host "[2/3] Memory Usage Test" -ForegroundColor Yellow
    Write-Host "Target: <200MB baseline" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Instructions:" -ForegroundColor White
    Write-Host "1. Open Omnibrowser with 1 tab" -ForegroundColor White
    Write-Host "2. Open Task Manager → Details tab" -ForegroundColor White
    Write-Host "3. Find 'Omnibrowser.exe' process" -ForegroundColor White
    Write-Host "4. Note the 'Memory (Private Working Set)' column" -ForegroundColor White
    Write-Host ""
    Write-Host "Expected: ~160MB (95% confidence)" -ForegroundColor Green
    Write-Host ""
    
    $result = Read-Host "Enter memory usage in MB (or 'skip')"
    if ($result -ne 'skip') {
        $memory = [int]$result
        if ($memory -lt 200) {
            Write-Host "βœ… PASS: $memory MB (target <200MB)" -ForegroundColor Green
        } else {
            Write-Host "❌ FAIL: $memory MB (exceeds 200MB target)" -ForegroundColor Red
        }
    }
    Write-Host ""
}

function Test-TabSwitch {
    Write-Host "[3/3] Tab Switch Performance Test" -ForegroundColor Yellow
    Write-Host "Target: <500ms" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Instructions:" -ForegroundColor White
    Write-Host "1. Open Omnibrowser with 3+ tabs" -ForegroundColor White
    Write-Host "2. Use browser DevTools (F12) → Performance tab" -ForegroundColor White
    Write-Host "3. Start recording" -ForegroundColor White
    Write-Host "4. Click between tabs 5 times" -ForegroundColor White
    Write-Host "5. Stop recording and measure average switch time" -ForegroundColor White
    Write-Host ""
    Write-Host "Expected: ~150ms (95% confidence)" -ForegroundColor Green
    Write-Host ""
    
    $result = Read-Host "Enter average tab switch time in milliseconds (or 'skip')"
    if ($result -ne 'skip') {
        $time = [int]$result
        if ($time -lt 500) {
            Write-Host "βœ… PASS: $time ms (target <500ms)" -ForegroundColor Green
        } else {
            Write-Host "❌ FAIL: $time ms (exceeds 500ms target)" -ForegroundColor Red
        }
    }
    Write-Host ""
}

function Show-BundleAnalysis {
    Write-Host "===================================" -ForegroundColor Cyan
    Write-Host "Bundle Size Analysis" -ForegroundColor Cyan
    Write-Host "===================================" -ForegroundColor Cyan
    Write-Host ""
    
    $distPath = Join-Path $PSScriptRoot "..\dist-web"
    
    if (Test-Path $distPath) {
        Write-Host "Analyzing dist-web/ directory..." -ForegroundColor Gray
        Write-Host ""
        
        $jsFiles = Get-ChildItem -Path $distPath -Filter *.js -Recurse
        $totalSize = ($jsFiles | Measure-Object -Property Length -Sum).Sum
        $totalSizeMB = [math]::Round($totalSize / 1MB, 2)
        
        Write-Host "Total JS Bundle: $totalSizeMB MB" -ForegroundColor White
        Write-Host ""
        Write-Host "Top 5 Largest Files:" -ForegroundColor Yellow
        $jsFiles | Sort-Object Length -Descending | Select-Object -First 5 | ForEach-Object {
            $sizeMB = [math]::Round($_.Length / 1MB, 2)
            Write-Host "  $($_.Name): $sizeMB MB" -ForegroundColor Gray
        }
        Write-Host ""
        
        # Check for gzipped files
        $gzFiles = Get-ChildItem -Path $distPath -Filter *.gz -Recurse
        if ($gzFiles) {
            $gzTotalSize = ($gzFiles | Measure-Object -Property Length -Sum).Sum
            $gzTotalSizeMB = [math]::Round($gzTotalSize / 1MB, 2)
            Write-Host "Gzipped Bundle: $gzTotalSizeMB MB" -ForegroundColor Green
            Write-Host ""
        }
    } else {
        Write-Host "❌ dist-web/ not found. Run 'npm run build:web' first." -ForegroundColor Red
        Write-Host ""
    }
}

function Show-DeviceInfo {
    Write-Host "===================================" -ForegroundColor Cyan
    Write-Host "Device Information" -ForegroundColor Cyan
    Write-Host "===================================" -ForegroundColor Cyan
    Write-Host ""
    
    # OS Info
    $os = Get-CimInstance Win32_OperatingSystem
    Write-Host "OS: $($os.Caption) ($($os.Version))" -ForegroundColor White
    Write-Host "Architecture: $($os.OSArchitecture)" -ForegroundColor White
    Write-Host ""
    
    # RAM Info
    $totalRAM = [math]::Round($os.TotalVisibleMemorySize / 1MB, 2)
    $freeRAM = [math]::Round($os.FreePhysicalMemory / 1MB, 2)
    $usedRAM = $totalRAM - $freeRAM
    Write-Host "Total RAM: $totalRAM GB" -ForegroundColor White
    Write-Host "Used RAM: $usedRAM GB" -ForegroundColor White
    Write-Host "Free RAM: $freeRAM GB" -ForegroundColor White
    Write-Host ""
    
    # CPU Info
    $cpu = Get-CimInstance Win32_Processor
    Write-Host "CPU: $($cpu.Name)" -ForegroundColor White
    Write-Host "Cores: $($cpu.NumberOfCores)" -ForegroundColor White
    Write-Host "Threads: $($cpu.NumberOfLogicalProcessors)" -ForegroundColor White
    Write-Host ""
    
    # Battery Info (if laptop)
    $battery = Get-CimInstance Win32_Battery -ErrorAction SilentlyContinue
    if ($battery) {
        $batteryPercent = $battery.EstimatedChargeRemaining
        $isCharging = $battery.BatteryStatus -eq 2
        Write-Host "Battery: $batteryPercent%" -ForegroundColor White
        Write-Host "Charging: $(if ($isCharging) {'Yes'} else {'No'})" -ForegroundColor White
        Write-Host ""
    } else {
        Write-Host "Battery: N/A (Desktop PC)" -ForegroundColor Gray
        Write-Host ""
    }
}

# Main Execution
Show-DeviceInfo

if ($All -or $ColdStart) {
    Test-ColdStart
}

if ($All -or $Memory) {
    Test-Memory
}

if ($All -or $TabSwitch) {
    Test-TabSwitch
}

if (!$ColdStart -and !$Memory -and !$TabSwitch -and !$All) {
    Write-Host "No test specified. Available options:" -ForegroundColor Yellow
    Write-Host "  -ColdStart   : Test cold start performance" -ForegroundColor White
    Write-Host "  -Memory      : Test memory usage" -ForegroundColor White
    Write-Host "  -TabSwitch   : Test tab switching performance" -ForegroundColor White
    Write-Host "  -All         : Run all tests" -ForegroundColor White
    Write-Host ""
    Write-Host "Example: .\scripts\profile-performance.ps1 -All" -ForegroundColor Gray
    Write-Host ""
}

Show-BundleAnalysis

Write-Host "===================================" -ForegroundColor Cyan
Write-Host "Performance Profiling Complete" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Record results in docs/WEEK2_DESKTOP_TESTING_CHECKLIST.md" -ForegroundColor White
Write-Host "2. Compare against baseline targets" -ForegroundColor White
Write-Host "3. Identify performance bottlenecks if targets not met" -ForegroundColor White
Write-Host ""
