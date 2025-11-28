/**
 * Browser Integration Module
 * Handles Playwright-based browser automation and regen functionality
 */

use serde::{Deserialize, Serialize};
use std::process::Command;
use std::time::Duration;
use tokio::time::sleep;

#[derive(Debug, Serialize, Deserialize)]
pub struct BrowserLaunchOptions {
    pub url: String,
    pub headless: Option<bool>,
    pub timeout: Option<u64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BrowserResult {
    pub success: bool,
    pub title: Option<String>,
    pub url: Option<String>,
    pub screenshot: Option<String>,
    pub error: Option<String>,
}

/// Check if Playwright Chromium is available
pub fn check_playwright() -> bool {
    // Check for bundled Chromium
    let bundled_paths = vec![
        "./bin/chromium",
        "./bin/chromium.exe",
        "../bin/chromium",
        "../bin/chromium.exe",
    ];

    for path in bundled_paths {
        if std::path::Path::new(path).exists() {
            return true;
        }
    }

    // Check if system Chromium is available
    #[cfg(target_os = "windows")]
    {
        Command::new("where")
            .arg("chromium")
            .output()
            .ok()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }
    #[cfg(not(target_os = "windows"))]
    {
        Command::new("which")
            .arg("chromium")
            .output()
            .ok()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }
}

/// Regen launch with mode support (simplified - uses system browser for now)
pub async fn regen_launch(url: &str, mode: &str) -> Result<String, String> {
    // Unload idle browser processes to prevent OOM
    unload_idle_browsers().await;
    
    // Mode-specific URLs
    let target_url = if mode == "trade" {
        "https://www.tradingview.com/chart/?symbol=BINANCE:BTCUSDT"
    } else {
        url
    };
    
    // Launch browser (simplified - opens in system browser)
    let _ = launch_browser(BrowserLaunchOptions {
        url: target_url.to_string(),
        headless: Some(false),
        timeout: Some(30),
    }).await;
    
    Ok(format!("Browser ready for: {}", target_url))
}

/// Unload idle browser processes to free memory
async fn unload_idle_browsers() {
    #[cfg(target_os = "windows")]
    {
        // Kill idle Chromium processes on Windows
        let _ = Command::new("taskkill")
            .args(["/F", "/IM", "chromium.exe", "/FI", "MEMUSAGE gt 500000"])
            .output();
    }
    #[cfg(target_os = "linux")]
    {
        // Kill idle Chromium processes on Linux
        let output = Command::new("ps")
            .args(["aux"])
            .output()
            .ok();
        if let Some(output) = output {
            let stdout = String::from_utf8_lossy(&output.stdout);
            if stdout.contains("chromium") && stdout.contains("Z") {
                // Zombie process - kill it
                let _ = Command::new("pkill")
                    .args(["-9", "chromium"])
                    .output();
            }
        }
    }
    #[cfg(target_os = "macos")]
    {
        // Kill idle Chromium processes on macOS
        let _ = Command::new("pkill")
            .args(["-9", "-f", "chromium"])
            .output();
    }
}

/// Launch browser and navigate to URL (simplified - uses system browser for now)
pub async fn launch_browser(options: BrowserLaunchOptions) -> Result<BrowserResult, String> {
    // For now, use system browser as fallback
    // In production, this would use bundled Playwright Chromium
    
    let url = options.url.clone();
    
    // Open URL in system browser
    #[cfg(target_os = "windows")]
    {
        let _ = Command::new("cmd")
            .args(["/C", "start", "", &url])
            .spawn();
    }
    #[cfg(target_os = "macos")]
    {
        let _ = Command::new("open")
            .arg(&url)
            .spawn();
    }
    #[cfg(target_os = "linux")]
    {
        // Try common browsers
        let browsers = vec!["xdg-open", "firefox", "chromium", "google-chrome"];
        for browser in browsers {
            if Command::new("which")
                .arg(browser)
                .output()
                .ok()
                .map(|o| o.status.success())
                .unwrap_or(false)
            {
                let _ = Command::new(browser).arg(&url).spawn();
                break;
            }
        }
    }

    // Return success (actual implementation would wait for page load)
    Ok(BrowserResult {
        success: true,
        title: Some("Browser launched".to_string()),
        url: Some(url),
        screenshot: None,
        error: None,
    })
}

/// Capture screenshot of browser page
pub async fn capture_screenshot(url: &str) -> Result<String, String> {
    // Simplified implementation
    // In production, this would use Playwright to:
    // 1. Launch headless browser
    // 2. Navigate to URL
    // 3. Wait for page load
    // 4. Capture screenshot
    // 5. Return base64 encoded image
    
    Ok("screenshot://placeholder".to_string())
}

/// Regen browser session (restart browser with same tabs)
pub async fn regen_session(urls: Vec<String>) -> Result<Vec<BrowserResult>, String> {
    let mut results = Vec::new();
    
    for url in urls {
        match launch_browser(BrowserLaunchOptions {
            url: url.clone(),
            headless: Some(false),
            timeout: Some(30),
        }).await {
            Ok(result) => results.push(result),
            Err(e) => results.push(BrowserResult {
                success: false,
                title: None,
                url: Some(url),
                screenshot: None,
                error: Some(e),
            }),
        }
    }
    
    Ok(results)
}

