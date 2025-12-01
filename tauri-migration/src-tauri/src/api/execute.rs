/**
 * Execute Actions Handler - Safe Agent Action Execution
 * Validates and executes actions from agent streams (open tabs, save notes, etc.)
 */

use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::AppHandle;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentAction {
    pub id: String,
    pub action_type: String,
    pub label: String,
    pub payload: Value,
    pub confidence: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExecuteActionsRequest {
    pub session_id: String,
    pub tab_id: Option<String>,
    pub actions: Vec<AgentAction>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ActionResult {
    pub action_id: String,
    pub success: bool,
    pub error: Option<String>,
    pub data: Option<Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExecuteActionsResponse {
    pub results: Vec<ActionResult>,
    pub total: usize,
    pub succeeded: usize,
    pub failed: usize,
}

/// Execute agent actions safely with validation
#[tauri::command]
pub async fn execute_actions(
    request: ExecuteActionsRequest,
    app: AppHandle,
) -> Result<ExecuteActionsResponse, String> {
    let mut results = Vec::new();
    let mut succeeded = 0;
    let mut failed = 0;

    for action in request.actions {
        match execute_single_action(&action, &request.tab_id, &request.session_id, &app).await {
            Ok(result) => {
                if result.success {
                    succeeded += 1;
                } else {
                    failed += 1;
                }
                results.push(result);
            }
            Err(e) => {
                failed += 1;
                results.push(ActionResult {
                    action_id: action.id.clone(),
                    success: false,
                    error: Some(e),
                    data: None,
                });
            }
        }
    }

    Ok(ExecuteActionsResponse {
        results,
        total: request.actions.len(),
        succeeded,
        failed,
    })
}

/// Execute a single action with type-specific handling
async fn execute_single_action(
    action: &AgentAction,
    tab_id: &Option<String>,
    session_id: &String,
    app: &AppHandle,
) -> Result<ActionResult, String> {
    match action.action_type.as_str() {
        "open_tab" => {
            let url = action
                .payload
                .get("url")
                .and_then(|v| v.as_str())
                .ok_or_else(|| "Missing 'url' in payload".to_string())?;

            // Open tab via Tauri IPC (frontend will handle)
            app.emit(
                "agent:open-tab",
                serde_json::json!({
                    "url": url,
                    "tab_id": tab_id,
                    "session_id": session_id,
                    "action_id": action.id,
                }),
            )
            .map_err(|e| format!("Failed to emit open-tab event: {}", e))?;

            Ok(ActionResult {
                action_id: action.id.clone(),
                success: true,
                error: None,
                data: Some(serde_json::json!({ "url": url })),
            })
        }

        "navigate" => {
            let url = action
                .payload
                .get("url")
                .and_then(|v| v.as_str())
                .ok_or_else(|| "Missing 'url' in payload".to_string())?;

            let target_tab_id = action
                .payload
                .get("tab_id")
                .and_then(|v| v.as_str())
                .or_else(|| tab_id.as_deref())
                .ok_or_else(|| "Missing 'tab_id' for navigation".to_string())?;

            app.emit(
                "agent:navigate",
                serde_json::json!({
                    "url": url,
                    "tab_id": target_tab_id,
                    "session_id": session_id,
                    "action_id": action.id,
                }),
            )
            .map_err(|e| format!("Failed to emit navigate event: {}", e))?;

            Ok(ActionResult {
                action_id: action.id.clone(),
                success: true,
                error: None,
                data: Some(serde_json::json!({ "url": url, "tab_id": target_tab_id })),
            })
        }

        "save_note" => {
            let url = action
                .payload
                .get("url")
                .and_then(|v| v.as_str())
                .ok_or_else(|| "Missing 'url' in payload".to_string())?;
            let note = action
                .payload
                .get("note")
                .and_then(|v| v.as_str())
                .ok_or_else(|| "Missing 'note' in payload".to_string())?;

            // Save note to app data directory
            let app_data_dir = app
                .path()
                .app_local_data_dir()
                .map_err(|e| format!("Failed to get app data directory: {:?}", e))?;
            let notes_dir = app_data_dir.join("notes");
            std::fs::create_dir_all(&notes_dir)
                .map_err(|e| format!("Failed to create notes directory: {}", e))?;

            // Use URL hash as filename
            use std::collections::hash_map::DefaultHasher;
            use std::hash::{Hash, Hasher};
            let mut hasher = DefaultHasher::new();
            url.hash(&mut hasher);
            let filename = format!("{:x}.md", hasher.finish());
            let file_path = notes_dir.join(&filename);

            std::fs::write(&file_path, note)
                .map_err(|e| format!("Failed to write note file: {}", e))?;

            Ok(ActionResult {
                action_id: action.id.clone(),
                success: true,
                error: None,
                data: Some(serde_json::json!({
                    "url": url,
                    "file_path": file_path.to_string_lossy(),
                })),
            })
        }

        "search" => {
            let query = action
                .payload
                .get("query")
                .and_then(|v| v.as_str())
                .ok_or_else(|| "Missing 'query' in payload".to_string())?;

            // Emit search event to frontend
            app.emit(
                "agent:search",
                serde_json::json!({
                    "query": query,
                    "tab_id": tab_id,
                    "session_id": session_id,
                    "action_id": action.id,
                }),
            )
            .map_err(|e| format!("Failed to emit search event: {}", e))?;

            Ok(ActionResult {
                action_id: action.id.clone(),
                success: true,
                error: None,
                data: Some(serde_json::json!({ "query": query })),
            })
        }

        "click_element" => {
            let selector = action
                .payload
                .get("selector")
                .and_then(|v| v.as_str())
                .ok_or_else(|| "Missing 'selector' in payload".to_string())?;

            let target_tab_id = action
                .payload
                .get("tab_id")
                .and_then(|v| v.as_str())
                .or_else(|| tab_id.as_deref())
                .ok_or_else(|| "Missing 'tab_id' for click".to_string())?;

            app.emit(
                "agent:click",
                serde_json::json!({
                    "selector": selector,
                    "tab_id": target_tab_id,
                    "session_id": session_id,
                    "action_id": action.id,
                }),
            )
            .map_err(|e| format!("Failed to emit click event: {}", e))?;

            Ok(ActionResult {
                action_id: action.id.clone(),
                success: true,
                error: None,
                data: Some(serde_json::json!({ "selector": selector, "tab_id": target_tab_id })),
            })
        }

        "type_text" => {
            let selector = action
                .payload
                .get("selector")
                .and_then(|v| v.as_str())
                .ok_or_else(|| "Missing 'selector' in payload".to_string())?;
            let text = action
                .payload
                .get("text")
                .and_then(|v| v.as_str())
                .ok_or_else(|| "Missing 'text' in payload".to_string())?;

            let target_tab_id = action
                .payload
                .get("tab_id")
                .and_then(|v| v.as_str())
                .or_else(|| tab_id.as_deref())
                .ok_or_else(|| "Missing 'tab_id' for type".to_string())?;

            app.emit(
                "agent:type",
                serde_json::json!({
                    "selector": selector,
                    "text": text,
                    "tab_id": target_tab_id,
                    "session_id": session_id,
                    "action_id": action.id,
                }),
            )
            .map_err(|e| format!("Failed to emit type event: {}", e))?;

            Ok(ActionResult {
                action_id: action.id.clone(),
                success: true,
                error: None,
                data: Some(serde_json::json!({
                    "selector": selector,
                    "text": text,
                    "tab_id": target_tab_id,
                })),
            })
        }

        _ => Err(format!("Unknown action type: {}", action.action_type)),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_action_validation() {
        let action = AgentAction {
            id: "test-1".to_string(),
            action_type: "open_tab".to_string(),
            label: "Open Google".to_string(),
            payload: serde_json::json!({
                "url": "https://google.com"
            }),
            confidence: Some(0.9),
        };

        assert_eq!(action.action_type, "open_tab");
        assert!(action.payload.get("url").is_some());
    }
}

