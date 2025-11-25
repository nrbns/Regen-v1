# RegenBrowser Release Testing Script
# Automated testing for Windows release builds

param(
    [string]$ExePath = "tauri-migration\src-tauri\target\release\regen-tauri.exe",
    [string]$InstallerPath = "tauri-migration\src-tauri\target\release\bundle\msi\*.msi",
    [switch]$QuickTest = $false
)

$ErrorActionPreference = "Continue"
$testResults = @()

function Test-BuildOutput {
    Write-Host "`n🔍 Testing Build Output..." -ForegroundColor Cyan
    
    # Check executable
    if (Test-Path $ExePath) {
        $exe = Get-Item $ExePath
        $sizeMB = [math]::Round($exe.Length / 1MB, 2)
        Write-Host "  ✅ Executable found: $($exe.FullName)" -ForegroundColor Green
        Write-Host "     Size: $sizeMB MB" -ForegroundColor White
        
        if ($sizeMB -gt 100) {
            Write-Host "     ⚠️  Warning: Executable is larger than expected (>100 MB)" -ForegroundColor Yellow
        }
        
        $testResults += @{ Test = "Executable Exists"; Passed = $true; Details = "Size: $sizeMB MB" }
    } else {
        Write-Host "  ❌ Executable not found: $ExePath" -ForegroundColor Red
        $testResults += @{ Test = "Executable Exists"; Passed = $false; Details = "File not found" }
    }
    
    # Check installer
    $installerFiles = Get-ChildItem -Path (Split-Path $InstallerPath) -Filter "*.msi" -ErrorAction SilentlyContinue
    if ($installerFiles) {
        $installer = $installerFiles[0]
        $sizeMB = [math]::Round($installer.Length / 1MB, 2)
        Write-Host "  ✅ Installer found: $($installer.FullName)" -ForegroundColor Green
        Write-Host "     Size: $sizeMB MB" -ForegroundColor White
        
        if ($sizeMB -gt 100) {
            Write-Host "     ⚠️  Warning: Installer is larger than expected (>100 MB)" -ForegroundColor Yellow
        }
        
        $testResults += @{ Test = "Installer Exists"; Passed = $true; Details = "Size: $sizeMB MB" }
    } else {
        Write-Host "  ❌ Installer not found" -ForegroundColor Red
        $testResults += @{ Test = "Installer Exists"; Passed = $false; Details = "File not found" }
    }
}

function Test-ApplicationLaunch {
    Write-Host "`n🚀 Testing Application Launch..." -ForegroundColor Cyan
    
    if (-not (Test-Path $ExePath)) {
        Write-Host "  ⏭️  Skipping: Executable not found" -ForegroundColor Yellow
        return
    }
    
    try {
        Write-Host "  Starting application..." -ForegroundColor White
        $process = Start-Process -FilePath $ExePath -PassThru -WindowStyle Normal
        
        # Wait for process to start
        Start-Sleep -Seconds 3
        
        if (-not $process.HasExited) {
            Write-Host "  ✅ Application launched successfully" -ForegroundColor Green
            Write-Host "     PID: $($process.Id)" -ForegroundColor White
            
            # Check memory usage
            $memoryMB = [math]::Round($process.WorkingSet64 / 1MB, 2)
            Write-Host "     Memory: $memoryMB MB" -ForegroundColor White
            
            $testResults += @{ Test = "Application Launch"; Passed = $true; Details = "PID: $($process.Id), Memory: $memoryMB MB" }
            
            if (-not $QuickTest) {
                Write-Host "  Waiting 10 seconds for stability check..." -ForegroundColor White
                Start-Sleep -Seconds 10
                
                if (-not $process.HasExited) {
                    Write-Host "  ✅ Application stable (no crash after 10s)" -ForegroundColor Green
                    $testResults += @{ Test = "Application Stability"; Passed = $true; Details = "No crash after 10s" }
                } else {
                    Write-Host "  ❌ Application crashed" -ForegroundColor Red
                    $testResults += @{ Test = "Application Stability"; Passed = $false; Details = "Crashed after launch" }
                }
            }
            
            # Close application
            Write-Host "  Closing application..." -ForegroundColor White
            Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 1
            
        } else {
            Write-Host "  ❌ Application exited immediately (possible crash)" -ForegroundColor Red
            $testResults += @{ Test = "Application Launch"; Passed = $false; Details = "Exited immediately" }
        }
    } catch {
        Write-Host "  ❌ Failed to launch application: $_" -ForegroundColor Red
        $testResults += @{ Test = "Application Launch"; Passed = $false; Details = $_.Exception.Message }
    }
}

function Test-FileIntegrity {
    Write-Host "`n🔒 Testing File Integrity..." -ForegroundColor Cyan
    
    if (Test-Path $ExePath) {
        $exe = Get-Item $ExePath
        
        # Check if file is executable
        $isPE = $false
        try {
            $bytes = [System.IO.File]::ReadAllBytes($ExePath)
            # Check for PE header (MZ signature)
            if ($bytes.Length -ge 2 -and $bytes[0] -eq 0x4D -and $bytes[1] -eq 0x5A) {
                $isPE = $true
            }
        } catch {
            # Ignore
        }
        
        if ($isPE) {
            Write-Host "  ✅ Executable has valid PE header" -ForegroundColor Green
            $testResults += @{ Test = "File Integrity"; Passed = $true; Details = "Valid PE header" }
        } else {
            Write-Host "  ⚠️  Warning: Executable may not be valid PE file" -ForegroundColor Yellow
            $testResults += @{ Test = "File Integrity"; Passed = $false; Details = "Invalid PE header" }
        }
        
        # Check file permissions
        $canRead = Test-Path $ExePath -PathType Leaf
        if ($canRead) {
            Write-Host "  ✅ File is readable" -ForegroundColor Green
        } else {
            Write-Host "  ❌ File is not readable" -ForegroundColor Red
            $testResults += @{ Test = "File Permissions"; Passed = $false; Details = "Not readable" }
        }
    }
}

function Show-Summary {
    Write-Host "`n" -NoNewline
    Write-Host "=" * 60 -ForegroundColor Cyan
    Write-Host "RELEASE TEST SUMMARY" -ForegroundColor Cyan
    Write-Host "=" * 60 -ForegroundColor Cyan
    
    $passed = ($testResults | Where-Object { $_.Passed -eq $true }).Count
    $failed = ($testResults | Where-Object { $_.Passed -eq $false }).Count
    $total = $testResults.Count
    
    Write-Host "`nTotal Tests: $total" -ForegroundColor White
    Write-Host "Passed: $passed" -ForegroundColor Green
    Write-Host "Failed: $failed" -ForegroundColor $(if ($failed -gt 0) { "Red" } else { "Green" })
    
    Write-Host "`nTest Details:" -ForegroundColor Cyan
    foreach ($result in $testResults) {
        $status = if ($result.Passed) { "✅" } else { "❌" }
        $color = if ($result.Passed) { "Green" } else { "Red" }
        Write-Host "  $status $($result.Test)" -ForegroundColor $color
        if ($result.Details) {
            Write-Host "     $($result.Details)" -ForegroundColor Gray
        }
    }
    
    Write-Host "`n" -NoNewline
    Write-Host "=" * 60 -ForegroundColor Cyan
    
    if ($failed -eq 0) {
        Write-Host "✅ All tests passed! Ready for release." -ForegroundColor Green
        exit 0
    } else {
        Write-Host "❌ Some tests failed. Please fix issues before release." -ForegroundColor Red
        exit 1
    }
}

# Main execution
Write-Host "🧪 RegenBrowser Release Testing" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

Test-BuildOutput
Test-FileIntegrity

if (-not $QuickTest) {
    Test-ApplicationLaunch
}

Show-Summary

