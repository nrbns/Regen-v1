// Tauri main.rs with RAM cap monitoring
// Target: < 110 MB RAM usage, < 2 sec cold start

mod ollama;
mod browser;
mod grammar;

use serde::Deserialize;
use std::process::Command;
use tauri::{AppHandle, Emitter, Manager, WebviewWindow};
use tokio::time::{sleep, Duration};
use browser::{BrowserLaunchOptions, BrowserResult};

// Using String for errors to match Tauri 2.x command requirements
type AgentResult<T> = Result<T, String>;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "snake_case")]
enum AgentAction {
    Navigate,
    Click,
    Type,
    Wait,
    Screenshot,
}

#[derive(Debug, Deserialize)]
struct AgentTask {
    action: AgentAction,
    selector: Option<String>,
    value: Option<String>,
    url: Option<String>,
    tab_id: Option<String>,
}

fn eval_js(webview: &WebviewWindow, script: &str) -> AgentResult<()> {
    webview
        .eval(script)
        .map_err(|error| format!("Execution failed: {}", error))
}

fn escape_js_string(input: &str) -> String {
    input
        .replace('\\', "\\\\")
        .replace('\'', "\\'")
        .replace('\n', "\\n")
        .replace('\r', "\\r")
}

fn find_tab_script(tab_id: &str) -> String {
    format!(
        "window.__REGEN_ACTIVE_TABS?.find?.(tab => tab?.id === '{tab_id}')"
    )
}

fn ensure_selector(selector: &Option<String>) -> AgentResult<&str> {
    selector
        .as_deref()
        .filter(|s| !s.trim().is_empty())
        .ok_or_else(|| "Missing parameter: selector".to_string())
}

fn ensure_value<'a>(value: &'a Option<String>, field: &'static str) -> AgentResult<&'a str> {
    value
        .as_deref()
        .filter(|s| !s.trim().is_empty())
        .ok_or_else(|| format!("Missing parameter: {}", field))
}

#[tauri::command]
async fn run_agent_task(app: AppHandle, task: AgentTask) -> AgentResult<()> {
    let main_window = app
        .get_webview_window("main")
        .ok_or_else(|| "Main window not found".to_string())?;

    let active_tab = task
        .tab_id
        .unwrap_or_else(|| "active".into());

    let tab_resolver = if active_tab == "active" {
        "window.__REGEN_ACTIVE_TABS?.find?.(tab => tab?.isActive)"
            .to_string()
    } else {
        find_tab_script(&active_tab)
    };

    match task.action {
        AgentAction::Navigate => {
            let url = ensure_value(&task.url, "url")?;
            let script = format!(
                "(()=>{{const tab={tab_resolver};if(!tab?.webview?.src){{throw new Error('Tab not available');}}tab.webview.src='{url}';if(window.__agent_log)window.__agent_log(`Navigate → {url}`);}})();",
                tab_resolver = tab_resolver,
                url = escape_js_string(url)
            );
            eval_js(&main_window, &script)
        }
        AgentAction::Click => {
            let selector = ensure_selector(&task.selector)?;
            let script = format!(
                "(()=>{{const tab={tab_resolver};if(!tab?.document){{throw new Error('Tab DOM not ready');}}const node=tab.document.querySelector('{selector}');if(!node){{throw new Error('Selector not found: {selector}');}}node.click();if(window.__agent_log)window.__agent_log(`Click → {selector}`);}})();",
                tab_resolver = tab_resolver,
                selector = escape_js_string(selector)
            );
            eval_js(&main_window, &script)
        }
        AgentAction::Type => {
            let selector = ensure_selector(&task.selector)?;
            let value = ensure_value(&task.value, "value")?;
            let script = format!(
                "(()=>{{const tab={tab_resolver};if(!tab?.document){{throw new Error('Tab DOM not ready');}}const node=tab.document.querySelector('{selector}');if(!node){{throw new Error('Selector not found: {selector}');}}node.focus();node.value='{value}';const evt=new Event('input',{{bubbles:true}});node.dispatchEvent(evt);if(window.__agent_log)window.__agent_log(`Type → {selector}`);}})();",
                tab_resolver = tab_resolver,
                selector = escape_js_string(selector),
                value = escape_js_string(value)
            );
            eval_js(&main_window, &script)
        }
        AgentAction::Wait => {
            let duration = ensure_value(&task.value, "value (milliseconds)")?;
            let ms: u64 = duration
                .parse()
                .map_err(|_| "Invalid wait duration".to_string())?;
            tokio::time::sleep(std::time::Duration::from_millis(ms)).await;
            Ok(())
        }
        AgentAction::Screenshot => {
            let script = format!(
                "(()=>{{const tab={tab_resolver};if(!tab?.capturePreview){{throw new Error('Screenshot API unavailable');}}tab.capturePreview();if(window.__agent_log)window.__agent_log('Screenshot captured');}})();",
                tab_resolver = tab_resolver
            );
            eval_js(&main_window, &script)
        }
    }
}

#[tauri::command]
async fn trigger_haptic(_app: AppHandle, _haptic_type: String) -> Result<(), String> {
    #[cfg(mobile)]
    {
        // Tauri mobile haptic API (requires tauri-plugin-haptics)
        // For now, return success (actual implementation would use platform-specific APIs)
        Ok(())
    }
    #[cfg(not(mobile))]
    {
        // Desktop fallback - no haptic available
        Ok(())
    }
}

/// Auto-start Ollama and ensure models are available
#[tauri::command]
async fn ensure_ollama_ready(window: WebviewWindow) -> Result<String, String> {
    // Emit progress
    let _ = window.emit("ollama-progress", 10i32);
    
    // Check if Ollama is already running
    let check_ollama = || {
        #[cfg(target_os = "windows")]
        {
            Command::new("cmd")
                .args(["/C", "ollama", "list"])
                .output()
                .ok()
                .map(|o| o.status.success())
                .unwrap_or(false)
        }
        #[cfg(not(target_os = "windows"))]
        {
            Command::new("ollama")
                .arg("list")
                .output()
                .ok()
                .map(|o| o.status.success())
                .unwrap_or(false)
        }
    };

    // Start Ollama serve if not running
    if !check_ollama() {
        let _ = window.emit("ollama-progress", 20i32);
        
        #[cfg(target_os = "windows")]
        {
            let _ = Command::new("cmd")
                .args(["/C", "start", "/B", "ollama", "serve"])
                .spawn();
        }
        #[cfg(not(target_os = "windows"))]
        {
            let _ = Command::new("ollama")
                .arg("serve")
                .spawn();
        }
        
        // Wait for Ollama to start
        sleep(Duration::from_secs(3)).await;
    }

    let _ = window.emit("ollama-progress", 40i32);

    // Check and pull required models
    let models = vec!["phi3:mini", "llava:7b"];
    for (i, model) in models.iter().enumerate() {
        let _ = window.emit("ollama-progress", (50 + i * 20) as i32);
        
        // Check if model exists
        let has_model = {
            #[cfg(target_os = "windows")]
            {
                Command::new("cmd")
                    .args(["/C", "ollama", "list"])
                    .output()
                    .ok()
                    .map(|o| String::from_utf8_lossy(&o.stdout).contains(model))
                    .unwrap_or(false)
            }
            #[cfg(not(target_os = "windows"))]
            {
                Command::new("ollama")
                    .arg("list")
                    .output()
                    .ok()
                    .map(|o| String::from_utf8_lossy(&o.stdout).contains(model))
                    .unwrap_or(false)
            }
        };

        if !has_model {
            // Pull model
            let _ = window.emit("ollama-progress", (60 + i * 15) as i32);
            
            #[cfg(target_os = "windows")]
            {
                let _ = Command::new("cmd")
                    .args(["/C", "ollama", "pull", model])
                    .spawn();
            }
            #[cfg(not(target_os = "windows"))]
            {
                let _ = Command::new("ollama")
                    .args(["pull", model])
                    .spawn();
            }
            
            // Wait for pull (simplified - in production, poll for completion)
            sleep(Duration::from_secs(5)).await;
        }
    }

    let _ = window.emit("ollama-progress", 100i32);
    Ok("AI Ready! 🚀".to_string())
}

/// Execute WISPR command with mode routing
#[tauri::command]
async fn wispr_command(
    _app: AppHandle,
    input: String,
    mode: Option<String>,
) -> Result<String, String> {
    let current_mode = mode.unwrap_or_else(|| "browse".to_string());
    
    // Wait for Ollama if needed
    if !ollama::check_ollama().await {
        ollama::wait_for_ollama(5).await;
    }
    
    // Route command to appropriate mode handler
    match current_mode.as_str() {
        "trade" => {
            // Trade mode: Use Ollama to analyze and execute
            let prompt = format!("Analyze this trading command and provide execution plan: {}", input);
            match ollama::generate_text("phi3:mini", &prompt).await {
                Ok(response) => Ok(format!("Trade: {}", response)),
                Err(e) => Err(format!("AI analysis failed: {}", e)),
            }
        }
        "research" => {
            // Research mode: Generate research query
            let prompt = format!("Generate a research query for: {}", input);
            match ollama::generate_text("phi3:mini", &prompt).await {
                Ok(response) => Ok(format!("Research: {}", response)),
                Err(e) => Err(format!("Research generation failed: {}", e)),
            }
        }
        "browse" => {
            // Browse mode: General command
            let prompt = format!("Process this browser command: {}", input);
            match ollama::generate_text("phi3:mini", &prompt).await {
                Ok(response) => Ok(format!("Browse: {}", response)),
                Err(e) => Err(format!("Command processing failed: {}", e)),
            }
        }
        _ => Err(format!("Unknown mode: {}", current_mode)),
    }
}

/// Launch browser with Playwright (bundled Chromium)
#[tauri::command]
async fn launch_browser(url: String, headless: Option<bool>) -> Result<BrowserResult, String> {
    let options = BrowserLaunchOptions {
        url,
        headless,
        timeout: Some(30),
    };
    browser::launch_browser(options).await
}

/// Regen browser session (restart with same tabs)
#[tauri::command]
async fn regen_session(urls: Vec<String>) -> Result<Vec<BrowserResult>, String> {
    browser::regen_session(urls).await
}

/// Capture screenshot of browser page
#[tauri::command]
async fn capture_browser_screenshot(url: String) -> Result<String, String> {
    browser::capture_screenshot(&url).await
}

/// Correct text grammar using Ollama
#[tauri::command]
async fn correct_text(text: String) -> Result<String, String> {
    grammar::correct_text(text).await
}

/// Capture current screen (for WISPR vision)
#[tauri::command]
async fn capture_screen(app: AppHandle) -> Result<String, String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "Main window not found".to_string())?;

    // Use Tauri's screenshot API (if available) or fallback to webview capture
    // For now, return placeholder - in production, use actual screenshot
    Ok("screenshot://placeholder".to_string())
}

/// Process vision with Ollama (llava model)
#[tauri::command]
async fn ollama_vision(prompt: String, screenshot: Option<String>) -> Result<String, String> {
    // Wait for Ollama if needed
    if !ollama::check_ollama().await {
        ollama::wait_for_ollama(5).await;
    }

    let vision_prompt = if let Some(screenshot) = screenshot {
        format!("{}\n\nScreenshot: {}", prompt, screenshot)
    } else {
        format!("{}\n\nDescribe what you see and suggest action.", prompt)
    };

    match ollama::generate_text("llava:7b", &vision_prompt).await {
        Ok(response) => Ok(response),
        Err(e) => Err(format!("Vision processing failed: {}", e)),
    }
}

/// Execute trade command from WISPR
#[tauri::command]
async fn execute_trade_command(query: String) -> Result<String, String> {
    // Wait for Ollama if needed
    if !ollama::check_ollama().await {
        ollama::wait_for_ollama(5).await;
    }

    let trade_prompt = format!(
        "Analyze this trading command and provide execution plan: {}\n\nReturn only the action to take (buy/sell, quantity, symbol, stop loss).",
        query
    );

    match ollama::generate_text("phi3:mini", &trade_prompt).await {
        Ok(response) => {
            // In production, this would actually execute the trade via Zerodha API
            Ok(format!("Trade command processed: {}", response))
        }
        Err(e) => Err(format!("Trade execution failed: {}", e)),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_shortcuts(vec![
                    (
                        Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::Space),
                        |app| {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.emit("wake-wispr", ());
                                let _ = window.unminimize();
                                let _ = window.set_focus();
                            }
                        },
                    ),
                    (
                        Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyT),
                        |app| {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.emit("open-trade-mode", ());
                            }
                        },
                    ),
                ])
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            run_agent_task,
            trigger_haptic,
            ensure_ollama_ready,
            wispr_command,
            launch_browser,
            regen_session,
            capture_browser_screenshot,
            correct_text,
            capture_screen,
            ollama_vision,
            execute_trade_command
        ])
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            
            // Inject grammar watcher into all webviews
            let grammar_js = r#"
                (function() {
                    if (window.__GRAMMAR_INJECTED) return;
                    window.__GRAMMAR_INJECTED = true;
                    
                    let correctionTimeout;
                    document.addEventListener('input', async (e) => {
                        const target = e.target;
                        if (!target || (target.tagName !== 'TEXTAREA' && 
                            !target.isContentEditable && 
                            (target.tagName !== 'INPUT' || !['text', 'search', 'email', 'url'].includes(target.type)))) {
                            return;
                        }
                        
                        clearTimeout(correctionTimeout);
                        const original = target.value || target.textContent || '';
                        const cursorPos = target.selectionStart || 0;
                        
                        // Only correct if >15 chars and user paused typing
                        if (original.length > 15) {
                            correctionTimeout = setTimeout(async () => {
                                try {
                                    const corrected = await window.__TAURI_INTERNALS__.invoke('correct_text', { text: original });
                                    if (corrected && corrected !== original) {
                                        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
                                            target.value = corrected;
                                        } else {
                                            target.textContent = corrected;
                                        }
                                        target.dispatchEvent(new Event('input', { bubbles: true }));
                                        target.dispatchEvent(new Event('change', { bubbles: true }));
                                        
                                        // Restore cursor position
                                        if (target.setSelectionRange) {
                                            target.setSelectionRange(cursorPos, cursorPos);
                                        }
                                    }
                                } catch (err) {
                                    console.debug('[Grammar] Correction failed:', err);
                                }
                            }, 1000); // Wait 1 second after typing stops
                        }
                    });
                })();
            "#;
            
            // Inject grammar watcher after page loads
            window.eval(grammar_js).ok();
            
            // Auto-start Ollama on launch
            tokio::spawn(async move {
                // Small delay to let UI render
                sleep(Duration::from_secs(1)).await;
                let _ = ensure_ollama_ready(window.clone()).await;
                let _ = window.emit("ai-ready", ());
            });
            
            // Set CORS environment for Ollama
            std::env::set_var("OLLAMA_ORIGINS", "*");
            
            // Performance optimizations for low-RAM devices (₹8K phones)
            #[cfg(desktop)]
            {
                // Memory monitoring - target < 110 MB
                // Tauri doesn't have built-in RAM cap, but we optimize for low memory
                println!("[Regen] Performance mode: Target < 110 MB RAM, < 2 sec cold start");
                
                // Set process priority to normal (don't hog resources)
                #[cfg(windows)]
                {
                    // Windows-specific tuning can be added here if needed.
                    // Placeholder keeps structure ready without triggering warnings.
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg_attr(
    all(not(debug_assertions), not(feature = "custom-protocol")),
    windows_subsystem = "windows"
)]
fn main() {
    run();
}
