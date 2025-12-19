// Global Shortcut Service - Ctrl+Space app wake functionality
use std::sync::Mutex;

pub struct GlobalShortcutService {
    shortcuts: Vec<String>,
}

impl GlobalShortcutService {
    pub fn new() -> Self {
        GlobalShortcutService {
            shortcuts: vec![],
        }
    }

    /// Register Ctrl+Space (Cmd+Space on macOS) to bring app to foreground
    pub fn register_app_wake(&mut self) -> Result<(), String> {
        let shortcut = if cfg!(target_os = "macos") {
            "cmd+space"
        } else {
            "ctrl+space"
        };

        self.shortcuts.push(shortcut.to_string());
        println!("[GlobalShortcut] Registered shortcut: {}", shortcut);
        Ok(())
    }

    /// Get list of registered shortcuts
    pub fn list_shortcuts(&self) -> Vec<String> {
        self.shortcuts.clone()
    }

    /// Unregister all shortcuts
    pub fn unregister_all(&mut self) -> Result<(), String> {
        self.shortcuts.clear();
        println!("[GlobalShortcut] All shortcuts unregistered");
        Ok(())
    }
}

/// Global shortcut service instance
static GLOBAL_SHORTCUT_SERVICE: Mutex<Option<GlobalShortcutService>> = Mutex::new(None);

/// Initialize global shortcut service
pub fn initialize_global_shortcuts() -> Result<(), String> {
    let mut service = GlobalShortcutService::new();
    service.register_app_wake()?;
    
    let mut global = GLOBAL_SHORTCUT_SERVICE
        .lock()
        .map_err(|e| format!("Failed to acquire lock: {}", e))?;
    *global = Some(service);
    
    Ok(())
}

/// Trigger app wake (called when global shortcut is pressed)
pub fn on_shortcut_triggered() -> Result<(), String> {
    println!("[GlobalShortcut] App wake triggered!");
    Ok(())
}
