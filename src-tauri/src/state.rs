// Application State Management
// Rust owns ALL application state (language, tabs, privacy, settings)

use std::sync::{Arc, Mutex};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PrivacyMode {
    Normal,
    Private,
    Ghost,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AppMode {
    Browse,
    Research,
    Trade,
    Games,
    Docs,
    Images,
    Threats,
    GraphMind,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum StartupBehavior {
    NewTab,
    Restore,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub language: String,                    // Language code (e.g., "en", "hi", "auto")
    pub default_mode: AppMode,
    pub startup_behavior: StartupBehavior,
    pub telemetry_opt_in: bool,
    pub privacy_mode: PrivacyMode,
    pub low_ram_mode: bool,                  // Low-RAM mode (disables heavy features for low-end devices)
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            language: "en".to_string(),
            default_mode: AppMode::Browse,
            startup_behavior: StartupBehavior::NewTab,
            telemetry_opt_in: false,
            privacy_mode: PrivacyMode::Normal,
            low_ram_mode: false, // Auto-detect on first run
        }
    }
}

pub struct AppState {
    pub settings: Arc<Mutex<AppSettings>>,
    pub active_mode: Arc<Mutex<AppMode>>,
    pub active_tab_id: Arc<Mutex<Option<String>>>, // Active tab ID (managed by browser.rs)
}

impl AppState {
    pub fn new() -> Self {
        Self {
            settings: Arc::new(Mutex::new(AppSettings::default())),
            active_mode: Arc::new(Mutex::new(AppMode::Browse)),
            active_tab_id: Arc::new(Mutex::new(None)),
        }
    }

    // Get language setting
    pub fn get_language(&self) -> String {
        let settings = self.settings.lock().unwrap();
        settings.language.clone()
    }

    // Set language setting
    pub fn set_language(&self, language: String) -> Result<(), String> {
        let mut settings = self.settings.lock().unwrap();
        // Validate language code (basic validation)
        if language.len() > 10 {
            return Err("Language code too long".to_string());
        }
        settings.language = language;
        Ok(())
    }

    // Get privacy mode
    pub fn get_privacy_mode(&self) -> PrivacyMode {
        let settings = self.settings.lock().unwrap();
        settings.privacy_mode.clone()
    }

    // Set privacy mode
    pub fn set_privacy_mode(&self, mode: PrivacyMode) {
        let mut settings = self.settings.lock().unwrap();
        settings.privacy_mode = mode;
    }

    // Get active mode
    pub fn get_active_mode(&self) -> AppMode {
        let mode = self.active_mode.lock().unwrap();
        mode.clone()
    }

    // Set active mode
    pub fn set_active_mode(&self, mode: AppMode) {
        let mut active_mode = self.active_mode.lock().unwrap();
        *active_mode = mode;
    }

    // Get all settings (for IPC)
    pub fn get_settings(&self) -> AppSettings {
        let settings = self.settings.lock().unwrap();
        settings.clone()
    }

    // Update settings (for IPC)
    pub fn update_settings(&self, updates: AppSettings) {
        let mut settings = self.settings.lock().unwrap();
        *settings = updates;
    }

    // Get low-RAM mode setting
    pub fn get_low_ram_mode(&self) -> bool {
        let settings = self.settings.lock().unwrap();
        settings.low_ram_mode
    }

    // Set low-RAM mode setting
    pub fn set_low_ram_mode(&self, enabled: bool) {
        let mut settings = self.settings.lock().unwrap();
        settings.low_ram_mode = enabled;
    }
}
