// Browser Engine - Tab Management + WebView Lifecycle
// Rust owns all tab state and WebView instances

use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Tab {
    pub id: String,
    pub url: String,
    pub title: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub favicon: Option<String>,
    pub created_at: i64,               // Unix timestamp
    pub last_active_at: i64,           // Unix timestamp
    #[serde(rename = "active")]
    pub is_active: bool,
    #[serde(rename = "pinned")]
    pub is_pinned: bool,
    #[serde(rename = "sleeping")]
    pub is_sleeping: bool,             // Tab is frozen/unloaded
    pub privacy_mode: String,          // Serialized as string for IPC
    pub app_mode: String,              // Serialized as string for IPC
    #[serde(skip_serializing)]
    pub crash_count: u32,              // For safe mode detection (internal only)
}


#[derive(Debug, Clone)]
pub struct TabManager {
    tabs: Arc<Mutex<HashMap<String, Tab>>>,
    active_tab_id: Arc<Mutex<Option<String>>>,
    max_crash_count: u32,              // Threshold for safe mode
}

impl TabManager {
    pub fn new(max_crash_count: u32) -> Self {
        Self {
            tabs: Arc::new(Mutex::new(HashMap::new())),
            active_tab_id: Arc::new(Mutex::new(None)),
            max_crash_count,
        }
    }

    // Create a new tab
    pub fn create_tab(
        &self,
        url: String,
        privacy_mode: crate::state::PrivacyMode,
        app_mode: crate::state::AppMode,
    ) -> Result<String, String> {
        let id = format!("tab-{}", uuid::Uuid::new_v4());
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        let privacy_str = match privacy_mode {
            crate::state::PrivacyMode::Normal => "normal",
            crate::state::PrivacyMode::Private => "private",
            crate::state::PrivacyMode::Ghost => "ghost",
        };
        let mode_str = match app_mode {
            crate::state::AppMode::Browse => "Browse",
            crate::state::AppMode::Research => "Research",
            crate::state::AppMode::Trade => "Trade",
            crate::state::AppMode::Games => "Games",
            crate::state::AppMode::Docs => "Docs",
            crate::state::AppMode::Images => "Images",
            crate::state::AppMode::Threats => "Threats",
            crate::state::AppMode::GraphMind => "GraphMind",
        };

        let tab = Tab {
            id: id.clone(),
            url: url.clone(),
            title: "New Tab".to_string(),
            favicon: None,
            created_at: now,
            last_active_at: now,
            is_active: true,
            is_pinned: false,
            is_sleeping: false,
            privacy_mode: privacy_str.to_string(),
            app_mode: mode_str.to_string(),
            crash_count: 0,
        };

        let mut tabs = self.tabs.lock().unwrap();
        
        // Deactivate all other tabs
        for existing_tab in tabs.values_mut() {
            existing_tab.is_active = false;
        }

        tabs.insert(id.clone(), tab);
        *self.active_tab_id.lock().unwrap() = Some(id.clone());

        Ok(id)
    }

    // Delete a tab
    pub fn delete_tab(&self, id: &str) -> Result<(), String> {
        let mut tabs = self.tabs.lock().unwrap();
        
        if !tabs.contains_key(id) {
            return Err(format!("Tab {} not found", id));
        }

        let was_active = {
            let tab = tabs.get(id).unwrap();
            tab.is_active
        };

        tabs.remove(id);

        // If deleted tab was active, activate another tab
        if was_active {
            if let Some(first_tab) = tabs.values().next() {
                let first_id = first_tab.id.clone();
                *self.active_tab_id.lock().unwrap() = Some(first_id.clone());
                if let Some(tab) = tabs.get_mut(&first_id) {
                    tab.is_active = true;
                }
            } else {
                *self.active_tab_id.lock().unwrap() = None;
            }
        }

        Ok(())
    }

    // Update tab (URL, title, etc.)
    pub fn update_tab(&self, id: &str, updates: TabUpdate) -> Result<(), String> {
        let mut tabs = self.tabs.lock().unwrap();
        
        let tab = tabs.get_mut(id).ok_or_else(|| format!("Tab {} not found", id))?;

        if let Some(url) = updates.url {
            tab.url = url;
        }
        if let Some(title) = updates.title {
            tab.title = title;
        }
        if let Some(favicon) = updates.favicon {
            tab.favicon = Some(favicon);
        }
        if let Some(is_pinned) = updates.is_pinned {
            tab.is_pinned = is_pinned;
        }
        if let Some(is_sleeping) = updates.is_sleeping {
            tab.is_sleeping = is_sleeping;
        }
        if let Some(privacy_mode) = updates.privacy_mode {
            let privacy_str = match privacy_mode {
                crate::state::PrivacyMode::Normal => "normal",
                crate::state::PrivacyMode::Private => "private",
                crate::state::PrivacyMode::Ghost => "ghost",
            };
            tab.privacy_mode = privacy_str.to_string();
        }

        // Update last_active_at
        tab.last_active_at = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        Ok(())
    }

    // Set active tab
    pub fn set_active_tab(&self, id: &str) -> Result<(), String> {
        let mut tabs = self.tabs.lock().unwrap();
        
        if !tabs.contains_key(id) {
            return Err(format!("Tab {} not found", id));
        }

        // Deactivate all tabs
        for tab in tabs.values_mut() {
            tab.is_active = false;
        }

        // Activate requested tab
        if let Some(tab) = tabs.get_mut(id) {
            tab.is_active = true;
            tab.last_active_at = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs() as i64;
            tab.is_sleeping = false; // Wake up tab when activated
        }

        *self.active_tab_id.lock().unwrap() = Some(id.to_string());

        Ok(())
    }

    // Get all tabs
    pub fn list_tabs(&self) -> Vec<Tab> {
        let tabs = self.tabs.lock().unwrap();
        tabs.values().cloned().collect()
    }

    // Get tab by ID
    pub fn get_tab(&self, id: &str) -> Option<Tab> {
        let tabs = self.tabs.lock().unwrap();
        tabs.get(id).cloned()
    }

    // Get active tab
    pub fn get_active_tab(&self) -> Option<Tab> {
        let active_id = self.active_tab_id.lock().unwrap();
        if let Some(id) = active_id.as_ref() {
            let tabs = self.tabs.lock().unwrap();
            tabs.get(id).cloned()
        } else {
            None
        }
    }

    // Freeze/unload a tab (for memory management)
    pub fn freeze_tab(&self, id: &str) -> Result<(), String> {
        let mut tabs = self.tabs.lock().unwrap();
        let tab = tabs.get_mut(id).ok_or_else(|| format!("Tab {} not found", id))?;
        tab.is_sleeping = true;
        Ok(())
    }

    // Unfreeze/wake a tab
    pub fn unfreeze_tab(&self, id: &str) -> Result<(), String> {
        let mut tabs = self.tabs.lock().unwrap();
        let tab = tabs.get_mut(id).ok_or_else(|| format!("Tab {} not found", id))?;
        tab.is_sleeping = false;
        Ok(())
    }

    // Increment crash count (for safe mode detection)
    pub fn record_tab_crash(&self, id: &str) -> Result<bool, String> {
        let mut tabs = self.tabs.lock().unwrap();
        let tab = tabs.get_mut(id).ok_or_else(|| format!("Tab {} not found", id))?;
        tab.crash_count += 1;
        
        // Return true if should enter safe mode
        Ok(tab.crash_count >= self.max_crash_count)
    }

    // Reset crash count (after recovery)
    pub fn reset_crash_count(&self, id: &str) -> Result<(), String> {
        let mut tabs = self.tabs.lock().unwrap();
        let tab = tabs.get_mut(id).ok_or_else(|| format!("Tab {} not found", id))?;
        tab.crash_count = 0;
        Ok(())
    }

    // Pin/unpin tab
    pub fn pin_tab(&self, id: &str, pinned: bool) -> Result<(), String> {
        let mut tabs = self.tabs.lock().unwrap();
        let tab = tabs.get_mut(id).ok_or_else(|| format!("Tab {} not found", id))?;
        tab.is_pinned = pinned;
        Ok(())
    }

    // Save session to database
    pub fn save_session(&self, db: &crate::db::Database) -> Result<(), String> {
        let tabs = self.list_tabs();
        let active_id = self.active_tab_id.lock().unwrap().clone();
        
        let tabs_json = serde_json::to_string(&tabs)
            .map_err(|e| format!("Failed to serialize tabs: {}", e))?;
        
        db.save_session(active_id.as_deref(), &tabs_json)
            .map_err(|e| format!("Failed to save session: {}", e))?;
        
        Ok(())
    }

    // Restore session from database
    pub fn restore_session(&self, db: &crate::db::Database) -> Result<(), String> {
        let session = db.load_session()
            .map_err(|e| format!("Failed to load session: {}", e))?;
        
        if let Some((active_id, tabs_json)) = session {
            let tabs: Vec<Tab> = serde_json::from_str(&tabs_json)
                .map_err(|e| format!("Failed to deserialize tabs: {}", e))?;
            
            let mut tabs_map = self.tabs.lock().unwrap();
            tabs_map.clear();
            
            for tab in tabs {
                tabs_map.insert(tab.id.clone(), tab);
            }
            
            if let Some(id) = active_id.clone() {
                *self.active_tab_id.lock().unwrap() = Some(id.clone());
                // Activate the restored active tab
                if let Some(tab) = tabs_map.get_mut(&id) {
                    tab.is_active = true;
                }
            }
        }
        
        Ok(())
    }
}

#[derive(Debug, Default)]
pub struct TabUpdate {
    pub url: Option<String>,
    pub title: Option<String>,
    pub favicon: Option<String>,
    pub is_pinned: Option<bool>,
    pub is_sleeping: Option<bool>,
    pub privacy_mode: Option<crate::state::PrivacyMode>,
}

impl TabUpdate {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn with_url(mut self, url: String) -> Self {
        self.url = Some(url);
        self
    }

    pub fn with_title(mut self, title: String) -> Self {
        self.title = Some(title);
        self
    }

    pub fn with_favicon(mut self, favicon: String) -> Self {
        self.favicon = Some(favicon);
        self
    }

    pub fn with_pinned(mut self, pinned: bool) -> Self {
        self.is_pinned = Some(pinned);
        self
    }

    pub fn with_sleeping(mut self, sleeping: bool) -> Self {
        self.is_sleeping = Some(sleeping);
        self
    }

    pub fn with_privacy_mode(mut self, mode: crate::state::PrivacyMode) -> Self {
        self.privacy_mode = Some(mode);
        self
    }
}
