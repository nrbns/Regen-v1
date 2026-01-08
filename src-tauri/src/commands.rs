// Tauri IPC Commands
// All commands exposed to frontend (invoke calls)

use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use crate::state::{AppState, PrivacyMode as StatePrivacyMode, AppMode};
use crate::browser::{TabManager, TabUpdate};
use crate::db::{Database, PageCache};
use crate::search::SearchEngine;
use crate::privacy::PrivacyEnforcer;
use crate::ai::AIService;
use crate::stability;

#[derive(Serialize, Deserialize)]
pub struct SystemInfo {
    total_ram_gb: f64,
    available_ram_gb: f64,
    cpu_cores: usize,
}

// ============================================================================
// TAB COMMANDS
// ============================================================================

#[tauri::command]
pub async fn tabs_create(
    url: String,
    privacy_mode: String,
    app_mode: String,
    tab_manager: tauri::State<'_, TabManager>,
    memory_guard: tauri::State<'_, stability::MemoryGuard>,
    db: tauri::State<'_, Database>,
    privacy_enforcer: tauri::State<'_, Mutex<PrivacyEnforcer>>,
) -> Result<String, String> {
    // Check tab limit before creating
    let tabs = tab_manager.list_tabs();
    let max_tabs = memory_guard.get_max_tabs() as usize;
    if tabs.len() >= max_tabs {
        return Err(format!("Tab limit reached (max {} tabs in current mode)", max_tabs));
    }

    let privacy = match privacy_mode.as_str() {
        "normal" => StatePrivacyMode::Normal,
        "private" => StatePrivacyMode::Private,
        "ghost" => StatePrivacyMode::Ghost,
        _ => StatePrivacyMode::Normal,
    };

    let mode = match app_mode.as_str() {
        "Browse" => AppMode::Browse,
        "Research" => AppMode::Research,
        "Trade" => AppMode::Trade,
        _ => AppMode::Browse,
    };

    // PRIVACY ENFORCEMENT: Check if Ghost mode requires TOR
    // TODO: Integrate with TorManager when TOR integration is complete
    if matches!(privacy, StatePrivacyMode::Ghost) {
        let enforcer = privacy_enforcer.lock().unwrap();
        if enforcer.should_use_tor() {
            // Ghost mode requires TOR - log for future integration
            eprintln!("[Privacy] Ghost mode tab created - TOR routing required (integration pending)");
        }
    }

    let result = tab_manager.create_tab(url, privacy, mode);
    
    // Auto-save session after tab creation (if privacy mode allows)
    if result.is_ok() {
        let enforcer = privacy_enforcer.lock().unwrap();
        if enforcer.can_write_to_disk() {
        let _ = tab_manager.save_session(&db);
        }
    }
    
    result
}

#[tauri::command]
pub async fn tabs_delete(
    id: String,
    tab_manager: tauri::State<'_, TabManager>,
    db: tauri::State<'_, Database>,
) -> Result<(), String> {
    let result = tab_manager.delete_tab(&id);
    if result.is_ok() {
        let _ = tab_manager.save_session(&db);
    }
    result
}

#[tauri::command]
pub async fn tabs_list(
    tab_manager: tauri::State<'_, TabManager>,
) -> Result<Vec<serde_json::Value>, String> {
    let tabs = tab_manager.list_tabs();
    Ok(tabs.into_iter().map(|t| serde_json::to_value(t).unwrap()).collect())
}

#[tauri::command]
pub async fn tabs_get_active(
    tab_manager: tauri::State<'_, TabManager>,
) -> Result<Option<serde_json::Value>, String> {
    Ok(tab_manager.get_active_tab().map(|t| serde_json::to_value(t).unwrap()))
}

#[tauri::command]
pub async fn tabs_set_active(
    id: String,
    tab_manager: tauri::State<'_, TabManager>,
    db: tauri::State<'_, Database>,
    privacy_enforcer: tauri::State<'_, Mutex<PrivacyEnforcer>>,
) -> Result<(), String> {
    let result = tab_manager.set_active_tab(&id);
    
    // Auto-save session (if privacy mode allows)
    if result.is_ok() {
        let enforcer = privacy_enforcer.lock().unwrap();
        if enforcer.can_write_to_disk() {
        let _ = tab_manager.save_session(&db);
        }
    }
    
    result
}

#[tauri::command]
pub async fn tabs_update(
    id: String,
    url: Option<String>,
    title: Option<String>,
    favicon: Option<String>,
    tab_manager: tauri::State<'_, TabManager>,
    db: tauri::State<'_, Database>,
    privacy_enforcer: tauri::State<'_, Mutex<PrivacyEnforcer>>,
) -> Result<(), String> {
    let mut update = TabUpdate::new();
    if let Some(u) = url {
        update = update.with_url(u);
    }
    if let Some(t) = title {
        update = update.with_title(t);
    }
    if let Some(f) = favicon {
        update = update.with_favicon(f);
    }
    let result = tab_manager.update_tab(&id, update);
    
    // Auto-save session (if privacy mode allows)
    if result.is_ok() {
        let enforcer = privacy_enforcer.lock().unwrap();
        if enforcer.can_write_to_disk() {
        let _ = tab_manager.save_session(&db);
        }
    }
    
    result
}

// ============================================================================
// SETTINGS COMMANDS
// ============================================================================

#[tauri::command]
pub async fn settings_get_language(
    app_state: tauri::State<'_, AppState>,
) -> Result<String, String> {
    let settings = app_state.settings.lock().unwrap();
    Ok(settings.language.clone())
}

#[tauri::command]
pub async fn settings_set_language(
    language: String,
    app_state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let mut settings = app_state.settings.lock().unwrap();
    settings.language = language;
    Ok(())
}

#[tauri::command]
pub async fn settings_get_all(
    app_state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let settings = app_state.settings.lock().unwrap();
    Ok(serde_json::to_value(&*settings).map_err(|e| e.to_string())?)
}

#[tauri::command]
pub async fn settings_get_low_ram_mode(
    app_state: tauri::State<'_, AppState>,
) -> Result<bool, String> {
    Ok(app_state.get_low_ram_mode())
}

#[tauri::command]
pub async fn settings_set_low_ram_mode(
    enabled: bool,
    app_state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    app_state.set_low_ram_mode(enabled);
    Ok(())
}

// ============================================================================
// PRIVACY COMMANDS
// ============================================================================

#[tauri::command]
pub async fn privacy_get_mode(
    privacy_enforcer: tauri::State<'_, Mutex<PrivacyEnforcer>>,
) -> Result<serde_json::Value, String> {
    let enforcer = privacy_enforcer.lock().unwrap();
    let policy = enforcer.get_policy();
    Ok(serde_json::json!({
        "mode": format!("{:?}", policy.mode),
        "allowDiskWrites": policy.allow_disk_writes,
        "allowHistory": policy.allow_history,
        "allowCache": policy.allow_cache,
        "allowCookies": policy.allow_cookies,
        "useTor": policy.use_tor,
        "fingerprintHardening": policy.fingerprint_hardening,
    }))
}

#[tauri::command]
pub async fn privacy_set_mode(
    mode: String,
    privacy_enforcer: tauri::State<'_, Mutex<PrivacyEnforcer>>,
) -> Result<serde_json::Value, String> {
    let privacy_mode = match mode.as_str() {
        "normal" => StatePrivacyMode::Normal,
        "private" => StatePrivacyMode::Private,
        "ghost" => StatePrivacyMode::Ghost,
        _ => return Err(format!("Invalid privacy mode: {}", mode)),
    };

    let mut enforcer = privacy_enforcer.lock().unwrap();
    let policy = enforcer.set_mode(privacy_mode);
    
    Ok(serde_json::json!({
        "mode": format!("{:?}", policy.mode),
        "allowDiskWrites": policy.allow_disk_writes,
        "allowHistory": policy.allow_history,
        "allowCache": policy.allow_cache,
        "allowCookies": policy.allow_cookies,
        "useTor": policy.use_tor,
        "fingerprintHardening": policy.fingerprint_hardening,
    }))
}

// ============================================================================
// DATABASE COMMANDS
// ============================================================================

#[tauri::command]
pub async fn db_save_page(
    url: String,
    title: String,
    content: String,
    language: Option<String>,
    db: tauri::State<'_, Database>,
    privacy_enforcer: tauri::State<'_, Mutex<PrivacyEnforcer>>,
) -> Result<(), String> {
    // PRIVACY ENFORCEMENT: Check if cache is allowed
    let enforcer = privacy_enforcer.lock().unwrap();
    if !enforcer.can_use_cache() {
        return Err("Cache blocked in Private/Ghost mode".to_string());
    }
    if !enforcer.can_write_to_disk() {
        return Err("Disk writes blocked in Ghost mode".to_string());
    }
    drop(enforcer); // Release lock before database operation

    let cache = PageCache {
        id: uuid::Uuid::new_v4().to_string(),
        url,
        title,
        content,
        html: None,
        cached_at: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64,
        language: language,
    };
    db.save_page(&cache).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn db_get_page(
    url: String,
    db: tauri::State<'_, Database>,
) -> Result<Option<serde_json::Value>, String> {
    match db.get_page(&url) {
        Ok(Some(cache)) => Ok(Some(serde_json::to_value(cache).map_err(|e| e.to_string())?)),
        Ok(None) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub async fn db_search(
    query: String,
    limit: Option<usize>,
    language: Option<String>,
    search_engine: tauri::State<'_, SearchEngine>,
) -> Result<Vec<serde_json::Value>, String> {
    let results = if let Some(lang) = language.as_deref() {
        search_engine.search_with_language(&query, Some(lang), limit.unwrap_or(20))
            .map_err(|e| e.to_string())?
    } else {
        search_engine.search(&query, limit.unwrap_or(20))
            .map_err(|e| e.to_string())?
    };

    Ok(results.into_iter().map(|r| serde_json::to_value(r).unwrap()).collect())
}

#[tauri::command]
pub async fn db_add_history(
    url: String,
    title: String,
    db: tauri::State<'_, Database>,
    privacy_enforcer: tauri::State<'_, Mutex<PrivacyEnforcer>>,
) -> Result<(), String> {
    // PRIVACY ENFORCEMENT: Check if history is allowed
    let enforcer = privacy_enforcer.lock().unwrap();
    if !enforcer.can_save_history() {
        return Err("History blocked in Private/Ghost mode".to_string());
    }
    drop(enforcer); // Release lock before database operation

    db.add_history(&url, &title).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn db_get_history(
    limit: Option<usize>,
    db: tauri::State<'_, Database>,
) -> Result<Vec<serde_json::Value>, String> {
    let history = db.get_history(limit.unwrap_or(100)).map_err(|e| e.to_string())?;
    Ok(history.into_iter().map(|h| serde_json::to_value(h).unwrap()).collect())
}

#[tauri::command]
pub async fn db_clear_history(
    db: tauri::State<'_, Database>,
) -> Result<(), String> {
    db.clear_history().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn db_search_history(
    query: String,
    db: tauri::State<'_, Database>,
) -> Result<Vec<serde_json::Value>, String> {
    let history = db.search_history(&query).map_err(|e| e.to_string())?;
    Ok(history.into_iter().map(|h| serde_json::to_value(h).unwrap()).collect())
}

#[tauri::command]
pub async fn db_delete_history_url(
    url: String,
    db: tauri::State<'_, Database>,
) -> Result<(), String> {
    db.delete_history_url(&url).map_err(|e| e.to_string())?;
    Ok(())
}

// ============================================================================
// HISTORY COMMANDS (Frontend API)
// ============================================================================

#[tauri::command(name = "history:list")]
pub async fn history_list(
    db: tauri::State<'_, Database>,
) -> Result<Vec<serde_json::Value>, String> {
    let history = db.get_history(1000).map_err(|e| e.to_string())?;
    Ok(history.into_iter().map(|(url, title, visited_at)| {
        serde_json::json!({
            "id": format!("history-{}", visited_at),
            "url": url,
            "title": title,
            "timestamp": visited_at * 1000, // Convert to milliseconds
            "lastVisitTime": visited_at * 1000,
        })
    }).collect())
}

#[tauri::command(name = "history:clear")]
pub async fn history_clear(
    db: tauri::State<'_, Database>,
) -> Result<(), String> {
    db.clear_history().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command(name = "history:search")]
pub async fn history_search(
    query: String,
    db: tauri::State<'_, Database>,
) -> Result<Vec<serde_json::Value>, String> {
    let history = db.search_history(&query).map_err(|e| e.to_string())?;
    Ok(history.into_iter().map(|(url, title, visited_at)| {
        serde_json::json!({
            "id": format!("history-{}", visited_at),
            "url": url,
            "title": title,
            "timestamp": visited_at * 1000,
            "lastVisitTime": visited_at * 1000,
        })
    }).collect())
}

#[tauri::command(name = "history:deleteUrl")]
pub async fn history_delete_url(
    url: String,
    db: tauri::State<'_, Database>,
) -> Result<(), String> {
    db.delete_history_url(&url).map_err(|e| e.to_string())?;
    Ok(())
}

// ============================================================================
// DOWNLOADS COMMANDS (Frontend API)
// ============================================================================

#[tauri::command(name = "downloads:list")]
pub async fn downloads_list(
    db: tauri::State<'_, Database>,
) -> Result<Vec<serde_json::Value>, String> {
    let downloads = db.get_downloads(None).map_err(|e| e.to_string())?;
    Ok(downloads.into_iter().map(|(id, url, filename, path, status, progress, received_bytes, total_bytes, created_at, completed_at, checksum, safety_status)| {
        serde_json::json!({
            "id": id,
            "url": url,
            "filename": filename,
            "path": path,
            "status": status,
            "progress": progress,
            "receivedBytes": received_bytes,
            "totalBytes": total_bytes,
            "createdAt": created_at * 1000, // Convert to milliseconds
            "completedAt": completed_at.map(|t| t * 1000),
            "checksum": checksum,
            "safety": safety_status.map(|s| serde_json::json!({"status": s})),
        })
    }).collect())
}

#[tauri::command(name = "downloads:openFile")]
pub async fn downloads_open_file(path: String) -> Result<(), String> {
    use std::process::Command;
    
    #[cfg(target_os = "windows")]
    {
        Command::new("cmd")
            .args(["/C", "start", "", &path])
            .spawn()
            .map_err(|e| format!("Failed to open file: {}", e))?;
    }
    
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open file: {}", e))?;
    }
    
    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open file: {}", e))?;
    }
    
    Ok(())
}

#[tauri::command(name = "downloads:showInFolder")]
pub async fn downloads_show_in_folder(path: String) -> Result<(), String> {
    use std::path::PathBuf;
    
    let file_path = PathBuf::from(&path);
    let folder_path = file_path.parent()
        .ok_or_else(|| "Invalid file path".to_string())?;
    
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg("/select,")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to show in folder: {}", e))?;
    }
    
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg("-R")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to show in folder: {}", e))?;
    }
    
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(folder_path)
            .spawn()
            .map_err(|e| format!("Failed to show in folder: {}", e))?;
    }
    
    Ok(())
}

#[tauri::command(name = "downloads:getQueue")]
pub async fn downloads_get_queue(
    db: tauri::State<'_, Database>,
) -> Result<serde_json::Value, String> {
    // Count active and queued downloads
    let downloads = db.get_downloads(None).map_err(|e| e.to_string())?;
    let active = downloads.iter().filter(|d| d.4 == "downloading" || d.4 == "verifying").count();
    let queued = downloads.iter().filter(|d| d.4 == "pending").count();
    
    Ok(serde_json::json!({
        "active": active,
        "queued": queued,
        "maxConcurrent": 3,
    }))
}

#[tauri::command(name = "downloads:save")]
pub async fn downloads_save(
    id: String,
    url: String,
    filename: Option<String>,
    path: Option<String>,
    status: String,
    progress: f64,
    received_bytes: i64,
    total_bytes: Option<i64>,
    checksum: Option<String>,
    safety_status: Option<String>,
    db: tauri::State<'_, Database>,
) -> Result<(), String> {
    db.save_download(
        &id,
        &url,
        filename.as_deref(),
        path.as_deref(),
        &status,
        progress,
        received_bytes,
        total_bytes,
        checksum.as_deref(),
        safety_status.as_deref(),
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command(name = "downloads:delete")]
pub async fn downloads_delete(
    id: String,
    db: tauri::State<'_, Database>,
) -> Result<(), String> {
    db.delete_download(&id).map_err(|e| e.to_string())?;
    Ok(())
}

// ============================================================================
// AI COMMANDS
// ============================================================================

#[tauri::command]
pub async fn ai_complete(
    prompt: String,
    ai_service: tauri::State<'_, AIService>,
) -> Result<String, String> {
    ai_service.complete(&prompt).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn ai_detect_intent(
    query: String,
    ai_service: tauri::State<'_, AIService>,
) -> Result<String, String> {
    let intent = ai_service.detect_intent(&query).map_err(|e| e.to_string())?;
    Ok(format!("{:?}", intent))
}

// ============================================================================
// TAB CRASH RECOVERY COMMANDS
// ============================================================================

#[tauri::command]
pub async fn tabs_record_crash(
    id: String,
    tab_manager: tauri::State<'_, TabManager>,
    db: tauri::State<'_, Database>,
    safe_mode: tauri::State<'_, stability::SafeMode>,
) -> Result<bool, String> {
    // Returns true if crash threshold exceeded (should enter safe mode)
    let should_safe_mode = tab_manager.record_tab_crash(&id)?;
    
    if should_safe_mode {
        // Record crash in SafeMode
        safe_mode.record_crash();
        
        // Save session before entering safe mode
        let _ = tab_manager.save_session(&db);
        
        eprintln!("[SafeMode] Tab {} crashed, entering safe mode (total crashes: {})", id, safe_mode.get_crash_count());
    }
    
    Ok(should_safe_mode)
}

// ============================================================================
// SYSTEM COMMANDS
// ============================================================================

#[tauri::command]
pub async fn system_get_ram() -> Result<u64, String> {
    crate::stability::get_system_ram()
}

#[tauri::command]
pub async fn system_get_max_tabs(
    memory_guard: tauri::State<'_, stability::MemoryGuard>,
) -> Result<u32, String> {
    Ok(memory_guard.get_max_tabs())
}

#[tauri::command]
pub async fn get_system_info() -> Result<SystemInfo, String> {
    let total_ram_bytes = crate::stability::get_system_ram()
        .map_err(|e| format!("Failed to get RAM: {}", e))?;
    let total_ram_gb = (total_ram_bytes as f64) / (1024.0 * 1024.0 * 1024.0);
    
    // Estimate available RAM (conservative: assume 50% used by system)
    let available_ram_gb = total_ram_gb * 0.5;
    
    // Get CPU core count
    let cpu_cores = num_cpus::get();
    
    Ok(SystemInfo {
        total_ram_gb,
        available_ram_gb,
        cpu_cores,
    })
}

// ============================================================================
// LEGACY/COMPATIBILITY COMMANDS (for existing frontend code)
// ============================================================================

#[tauri::command]
pub async fn search(
    query: String,
    search_engine: tauri::State<'_, SearchEngine>,
) -> Result<Vec<serde_json::Value>, String> {
    // Use SearchEngine for actual search
    let results = search_engine.search(&query, 20)
        .map_err(|e| e.to_string())?;
    Ok(results.into_iter().map(|r| serde_json::to_value(r).unwrap()).collect())
}

// ============================================================================
// TASK SYSTEM COMMANDS
// ============================================================================

#[derive(Serialize, Deserialize)]
pub struct TaskResponse {
    pub ok: bool,
    pub id: Option<String>,
    pub error: Option<String>,
}

#[tauri::command]
pub async fn run_demo_agent(intent: String) -> Result<TaskResponse, String> {
    // This would normally call into the Node.js task system
    // For now, return a placeholder response
    // In a real implementation, this would trigger the Node.js demoAgentRunner

    // Since we can't directly call Node.js from Rust, we'll emit an event
    // that the Node.js side can listen to and handle
    Ok(TaskResponse {
        ok: true,
        id: Some(format!("demo-task-{}", chrono::Utc::now().timestamp())),
        error: None,
    })
}

#[tauri::command]
pub async fn cancel_task(task_id: String) -> Result<TaskResponse, String> {
    // Similar to run_demo_agent, this would trigger Node.js task cancellation
    Ok(TaskResponse {
        ok: true,
        id: Some(task_id),
        error: None,
    })
}