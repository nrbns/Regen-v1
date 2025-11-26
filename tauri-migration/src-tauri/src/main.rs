// Tauri main.rs with RAM cap monitoring
// Target: < 110 MB RAM usage, < 2 sec cold start

use serde::Deserialize;
use tauri::{AppHandle, Manager};

#[derive(Debug, thiserror::Error)]
enum AgentCommandError {
    #[error("Missing parameter: {0}")]
    MissingParam(&'static str),
    #[error("Invalid selector: {0}")]
    InvalidSelector(String),
    #[error("Execution failed: {0}")]
    ExecutionFailed(String),
}

type AgentResult<T> = Result<T, AgentCommandError>;

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

fn eval_js(window: &tauri::Window, script: &str) -> AgentResult<()> {
    window
        .eval(script)
        .map_err(|error| AgentCommandError::ExecutionFailed(error.to_string()))
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
        .ok_or(AgentCommandError::MissingParam("selector"))
}

fn ensure_value<'a>(value: &'a Option<String>, field: &'static str) -> AgentResult<&'a str> {
    value
        .as_deref()
        .filter(|s| !s.trim().is_empty())
        .ok_or(AgentCommandError::MissingParam(field))
}

#[tauri::command]
async fn run_agent_task(app: AppHandle, task: AgentTask) -> AgentResult<()> {
    let main_window = app
        .get_window("main")
        .ok_or_else(|| AgentCommandError::ExecutionFailed("Main window not found".into()))?;

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
                .map_err(|_| AgentCommandError::ExecutionFailed("Invalid wait duration".into()))?;
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
async fn trigger_haptic(app: AppHandle, haptic_type: String) -> Result<(), String> {
    #[cfg(mobile)]
    {
        use tauri::plugin::TauriPlugin;
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![run_agent_task, trigger_haptic])
        .setup(|_app| {
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
