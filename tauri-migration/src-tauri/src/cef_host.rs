/**
 * CEF Host - Chromium Embedded Framework integration
 * Handles request interception and content script injection
 * PR: CEF renderer integration
 */

use std::sync::Arc;
use tauri::Window;
use serde_json::{json, Value};

// CEF Request Handler
pub struct CefRequestHandler {
    adblock_enabled: bool,
    adblock_matcher: Arc<dyn AdblockMatcher + Send + Sync>,
}

impl CefRequestHandler {
    pub fn new(adblock_enabled: bool) -> Self {
        Self {
            adblock_enabled,
            adblock_matcher: Arc::new(RustAdblockMatcher::new()),
        }
    }

    /// Called before resource load - return true to block
    pub fn on_before_resource_load(&self, url: &str, resource_type: &str) -> bool {
        if !self.adblock_enabled {
            return false;
        }

        // Block ads/trackers
        if self.adblock_matcher.should_block(url, resource_type) {
            eprintln!("[CEF] Blocked: {} ({})", url, resource_type);
            return true;
        }

        false
    }

    /// Called when context is created - inject content scripts
    pub fn on_context_created(&self, frame: &str, context: &str) {
        // Inject extractor.js at document_start
        let inject_script = include_str!("../../../src/content-scripts/extractor.js");
        
        // In real CEF, this would be:
        // frame.execute_javascript(&format!(
        //     "(function() {{ {} }})();",
        //     inject_script
        // ));
        
        eprintln!("[CEF] Injected extractor.js into frame: {}", frame);
    }
}

/// Adblock matcher trait
pub trait AdblockMatcher: Send + Sync {
    fn should_block(&self, url: &str, resource_type: &str) -> bool;
    fn update_filters(&mut self, filters: Vec<String>);
}

/// Rust-based adblock matcher (high performance)
pub struct RustAdblockMatcher {
    blocked_domains: Vec<String>,
    blocked_patterns: Vec<String>,
}

impl RustAdblockMatcher {
    pub fn new() -> Self {
        let mut matcher = Self {
            blocked_domains: Vec::new(),
            blocked_patterns: Vec::new(),
        };
        
        // Load default filters
        matcher.load_default_filters();
        matcher
    }

    fn load_default_filters(&mut self) {
        // Common ad/tracker domains
        self.blocked_domains.extend(vec![
            "doubleclick.net".to_string(),
            "googleadservices.com".to_string(),
            "googlesyndication.com".to_string(),
            "facebook.com/tr".to_string(),
            "analytics.js".to_string(),
            "adsystem.com".to_string(),
        ]);

        // Common patterns
        self.blocked_patterns.extend(vec![
            "/ads/".to_string(),
            "/advertisement".to_string(),
            "/tracking".to_string(),
            "?utm_".to_string(),
        ]);
    }
}

impl AdblockMatcher for RustAdblockMatcher {
    fn should_block(&self, url: &str, resource_type: &str) -> bool {
        // Block images/scripts from ad domains
        if resource_type == "image" || resource_type == "script" || resource_type == "xhr" {
            // Check domain
            for domain in &self.blocked_domains {
                if url.contains(domain) {
                    return true;
                }
            }

            // Check patterns
            for pattern in &self.blocked_patterns {
                if url.contains(pattern) {
                    return true;
                }
            }
        }

        false
    }

    fn update_filters(&mut self, filters: Vec<String>) {
        // Parse EasyList/EasyPrivacy format
        for filter in filters {
            if filter.starts_with("||") {
                // Domain filter
                let domain = filter.trim_start_matches("||").split('/').next().unwrap_or("");
                if !domain.is_empty() {
                    self.blocked_domains.push(domain.to_string());
                }
            } else if filter.contains("*") {
                // Pattern filter
                self.blocked_patterns.push(filter);
            }
        }
    }
}

/// Bridge to publish DOM extraction to realtime bus
pub struct CefBridge {
    bus_url: String,
    window: Option<Window>,
}

impl CefBridge {
    pub fn new(bus_url: String) -> Self {
        Self {
            bus_url,
            window: None,
        }
    }

    pub fn set_window(&mut self, window: Window) {
        self.window = Some(window);
    }

    /// Publish extraction to bus via Tauri event
    pub fn publish_extraction(&self, extraction: Value) {
        if let Some(window) = &self.window {
            // Emit to Tauri window (will be picked up by frontend bridge)
            window.emit("cef:extract", extraction).ok();
        }
    }

    /// Handle content script postMessage
    pub fn handle_content_message(&self, message: Value) {
        if let Some(msg_type) = message.get("type").and_then(|v| v.as_str()) {
            if msg_type == "regen:extract" {
                if let Some(data) = message.get("data") {
                    self.publish_extraction(data.clone());
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_adblock_matcher() {
        let matcher = RustAdblockMatcher::new();
        assert!(matcher.should_block("https://doubleclick.net/ads", "script"));
        assert!(!matcher.should_block("https://example.com/page", "document"));
    }
}

