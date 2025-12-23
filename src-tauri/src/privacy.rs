// Privacy Mode Enforcement
// Rust enforces privacy modes (Normal/Private/Ghost)
// UI cannot override these rules

use serde::{Deserialize, Serialize};
use crate::state::PrivacyMode as StatePrivacyMode;

// Re-export for commands.rs
pub type PrivacyMode = StatePrivacyMode;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrivacyPolicy {
    pub mode: PrivacyMode,
    pub allow_disk_writes: bool,
    pub allow_history: bool,
    pub allow_cache: bool,
    pub allow_cookies: bool,
    pub use_tor: bool,
    pub fingerprint_hardening: bool,
}

impl PrivacyPolicy {
    pub fn for_mode(mode: PrivacyMode) -> Self {
        match mode {
            PrivacyMode::Normal => PrivacyPolicy {
                mode: PrivacyMode::Normal,
                allow_disk_writes: true,
                allow_history: true,
                allow_cache: true,
                allow_cookies: true,
                use_tor: false,
                fingerprint_hardening: false,
            },
            PrivacyMode::Private => PrivacyPolicy {
                mode: PrivacyMode::Private,
                allow_disk_writes: true, // Can save, but session-only
                allow_history: false,    // No persistent history
                allow_cache: false,      // No persistent cache
                allow_cookies: false,    // No persistent cookies
                use_tor: false,
                fingerprint_hardening: true,
            },
            PrivacyMode::Ghost => PrivacyPolicy {
                mode: PrivacyMode::Ghost,
                allow_disk_writes: false, // BLOCKED in Rust
                allow_history: false,
                allow_cache: false,
                allow_cookies: false,
                use_tor: true,            // Force TOR
                fingerprint_hardening: true,
            },
        }
    }
}

pub struct PrivacyEnforcer {
    current_policy: PrivacyPolicy,
}

impl PrivacyEnforcer {
    pub fn new(initial_mode: PrivacyMode) -> Self {
        Self {
            current_policy: PrivacyPolicy::for_mode(initial_mode),
        }
    }

    // Set privacy mode (returns policy that must be enforced)
    pub fn set_mode(&mut self, mode: PrivacyMode) -> PrivacyPolicy {
        self.current_policy = PrivacyPolicy::for_mode(mode);
        self.current_policy.clone()
    }

    // Get current policy
    pub fn get_policy(&self) -> &PrivacyPolicy {
        &self.current_policy
    }

    // Check if disk writes are allowed
    pub fn can_write_to_disk(&self) -> bool {
        self.current_policy.allow_disk_writes
    }

    // Check if history can be saved
    pub fn can_save_history(&self) -> bool {
        self.current_policy.allow_history
    }

    // Check if cache can be used
    pub fn can_use_cache(&self) -> bool {
        self.current_policy.allow_cache
    }

    // Check if cookies can be stored
    pub fn can_store_cookies(&self) -> bool {
        self.current_policy.allow_cookies
    }

    // Check if TOR should be used
    pub fn should_use_tor(&self) -> bool {
        self.current_policy.use_tor
    }

    // Check if fingerprint hardening is enabled
    pub fn is_fingerprint_hardening_enabled(&self) -> bool {
        self.current_policy.fingerprint_hardening
    }

    // Enforce disk write blocking (called before any disk write)
    pub fn enforce_disk_write(&self) -> Result<(), PrivacyError> {
        if !self.can_write_to_disk() {
            return Err(PrivacyError::DiskWriteBlocked);
        }
        Ok(())
    }

    // Enforce history blocking (called before saving history)
    pub fn enforce_history_save(&self) -> Result<(), PrivacyError> {
        if !self.can_save_history() {
            return Err(PrivacyError::HistoryBlocked);
        }
        Ok(())
    }

    // Enforce cache blocking (called before caching)
    pub fn enforce_cache(&self) -> Result<(), PrivacyError> {
        if !self.can_use_cache() {
            return Err(PrivacyError::CacheBlocked);
        }
        Ok(())
    }

    // Check if clipboard persistence is allowed
    pub fn can_persist_clipboard(&self) -> bool {
        !matches!(self.current_policy.mode, PrivacyMode::Ghost)
    }

    // Check if screenshots are allowed
    pub fn can_take_screenshot(&self) -> bool {
        !matches!(self.current_policy.mode, PrivacyMode::Ghost)
    }

    // Check if crash reports can be sent
    pub fn can_send_crash_reports(&self) -> bool {
        !matches!(self.current_policy.mode, PrivacyMode::Ghost)
    }

    // Check if DNS cache can be persisted
    pub fn can_cache_dns(&self) -> bool {
        !matches!(self.current_policy.mode, PrivacyMode::Ghost)
    }

    // Enforce clipboard persistence blocking
    pub fn enforce_clipboard_persistence(&self) -> Result<(), PrivacyError> {
        if !self.can_persist_clipboard() {
            return Err(PrivacyError::ClipboardBlocked);
        }
        Ok(())
    }

    // Enforce screenshot blocking
    pub fn enforce_screenshot(&self) -> Result<(), PrivacyError> {
        if !self.can_take_screenshot() {
            return Err(PrivacyError::ScreenshotBlocked);
        }
        Ok(())
    }

    // Violation handler - called when privacy rule is violated
    pub fn handle_violation(&mut self, violation: PrivacyViolation) -> PrivacyAction {
        eprintln!("[Privacy] Violation detected: {:?}", violation);
        
        // In Ghost mode, violations are critical
        if matches!(self.current_policy.mode, PrivacyMode::Ghost) {
            // Auto-disable Ghost mode
            self.set_mode(PrivacyMode::Normal);
            PrivacyAction::ModeDisabled
        } else {
            PrivacyAction::Warn
        }
    }
}

#[derive(Debug, Clone)]
pub enum PrivacyViolation {
    DiskWriteAttempted,
    HistorySaveAttempted,
    CacheWriteAttempted,
    CookieSaveAttempted,
    ClipboardPersistAttempted,
    ScreenshotAttempted,
    CrashReportAttempted,
    DNSCacheAttempted,
}

#[derive(Debug, Clone)]
pub enum PrivacyAction {
    Allow,
    Block,
    Warn,
    ModeDisabled,
}

#[derive(Debug, Clone)]
pub enum PrivacyError {
    DiskWriteBlocked,
    HistoryBlocked,
    CacheBlocked,
    CookiesBlocked,
    ClipboardBlocked,
    ScreenshotBlocked,
    CrashReportBlocked,
    DNSCacheBlocked,
}

impl std::fmt::Display for PrivacyError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            PrivacyError::DiskWriteBlocked => write!(f, "Disk writes blocked in Ghost mode"),
            PrivacyError::HistoryBlocked => write!(f, "History saving blocked in Private/Ghost mode"),
            PrivacyError::CacheBlocked => write!(f, "Cache blocked in Private/Ghost mode"),
            PrivacyError::CookiesBlocked => write!(f, "Cookies blocked in Private/Ghost mode"),
            PrivacyError::ClipboardBlocked => write!(f, "Clipboard persistence blocked in Ghost mode"),
            PrivacyError::ScreenshotBlocked => write!(f, "Screenshots blocked in Ghost mode"),
            PrivacyError::CrashReportBlocked => write!(f, "Crash reports blocked in Ghost mode"),
            PrivacyError::DNSCacheBlocked => write!(f, "DNS cache blocked in Ghost mode"),
        }
    }
}

impl std::error::Error for PrivacyError {}
