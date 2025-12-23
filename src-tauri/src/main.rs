// Regen Browser OS - Tauri Main Application
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use omnibrowser_tauri::*;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::Manager;

fn main() {
    // Initialize stability features (before database, as they don't depend on it)
    let safe_mode = stability::SafeMode::new(3);
    let memory_guard = stability::MemoryGuard::new(
        Duration::from_secs(30), // Freeze tabs after 30s idle
        2_147_483_648,            // 2GB RAM threshold
    );
    
    // Watchdog task will be started in setup() after Tauri runtime is ready

    // Initialize app state
    let app_state = state::AppState::new();
    
    // Sync MemoryGuard with initial low-RAM mode setting
    if app_state.get_low_ram_mode() {
        memory_guard.set_low_ram_mode(true);
    }

    // Initialize privacy enforcer (default: Normal mode)
    let privacy_enforcer = Mutex::new(privacy::PrivacyEnforcer::new(state::PrivacyMode::Normal));

    // Initialize AI service (default: Ollama)
    let ai_config = ai::AIConfig {
        provider: ai::AIProvider::Ollama,
        model: "phi3:mini".to_string(), // Default model
        max_tokens: 2048,
        temperature: 0.7,
    };
    let ai_service = ai::AIService::new(ai_config);

    // Initialize tab manager (before database, will restore session in setup)
    let tab_manager = Arc::new(browser::TabManager::new(3)); // Max 3 crashes before safe mode

    let tab_manager_clone = Arc::clone(&tab_manager);
    tauri::Builder::default()
        .setup(move |app| {
            // Get app data directory and initialize database there
            let db = if let Ok(app_data_dir) = app.path().app_data_dir() {
                std::fs::create_dir_all(&app_data_dir).ok();
                let db_path = app_data_dir.join("regen.db");
                match db::Database::new(Some(db_path)) {
                    Ok(database) => database,
                    Err(e) => {
                        eprintln!("Failed to initialize database in app data dir: {}. Using fallback.", e);
                        // Fallback to current directory
                        db::Database::new(None).unwrap_or_else(|e| {
                            eprintln!("Failed to initialize database (fallback): {}", e);
                            std::process::exit(1);
                        })
                    }
                }
            } else {
                // Fallback to current directory if app data dir unavailable
                eprintln!("App data directory unavailable. Using current directory for database.");
                db::Database::new(None).unwrap_or_else(|e| {
                    eprintln!("Failed to initialize database: {}", e);
                    std::process::exit(1);
                })
            };

            // Initialize search engine with database
            let search_engine = search::SearchEngine::new(db.clone());

            // Restore session from database (if exists)
            if let Err(e) = tab_manager_clone.restore_session(&db) {
                eprintln!("Warning: Failed to restore session: {}. Starting with new tab.", e);
                // Create default tab if restore failed and no tabs exist
                let tabs = tab_manager_clone.list_tabs();
                if tabs.is_empty() {
                    let _ = tab_manager_clone.create_tab(
                        "about:blank".to_string(),
                        state::PrivacyMode::Normal,
                        state::AppMode::Browse,
                    );
                }
            }

            // Manage all state (db and search_engine managed here)
            app.manage(db);
            app.manage(search_engine);
            
            // Start watchdog task now that Tauri runtime is ready
            stability::start_watchdog_task_async(
                Duration::from_secs(5),  // Check every 5 seconds
                Duration::from_secs(10), // 10 second timeout
            );
            
            Ok(())
        })
        .plugin(tauri_plugin_shell::init())
        .manage(tab_manager)
        .manage(app_state)
        .manage(privacy_enforcer)
        .manage(ai_service)
        .manage(safe_mode)
        .manage(memory_guard)
        .invoke_handler(tauri::generate_handler![
            // Tab commands
            commands::tabs_create,
            commands::tabs_delete,
            commands::tabs_list,
            commands::tabs_get_active,
            commands::tabs_set_active,
            commands::tabs_update,
            commands::tabs_record_crash,
            // Settings commands
            commands::settings_get_language,
            commands::settings_set_language,
            commands::settings_get_all,
            commands::settings_get_low_ram_mode,
            commands::settings_set_low_ram_mode,
            // Privacy commands
            commands::privacy_get_mode,
            commands::privacy_set_mode,
            // Database commands
            commands::db_search,
            commands::db_save_page,
            commands::db_get_page,
            commands::db_add_history,
            commands::db_get_history,
            commands::db_clear_history,
            commands::db_search_history,
            commands::db_delete_history_url,
            // History commands (Frontend API - using name attribute)
            commands::history_list,
            commands::history_clear,
            commands::history_search,
            commands::history_delete_url,
            // Downloads commands (Frontend API - using name attribute)
            commands::downloads_list,
            commands::downloads_open_file,
            commands::downloads_show_in_folder,
            commands::downloads_get_queue,
            commands::downloads_save,
            commands::downloads_delete,
            // AI commands
            commands::ai_complete,
            commands::ai_detect_intent,
            // System commands
            commands::system_get_ram,
            commands::system_get_max_tabs,
            commands::get_system_info,
            // Legacy commands
            commands::search,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
