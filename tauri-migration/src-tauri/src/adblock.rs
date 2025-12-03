/**
 * High-Performance Adblock Matcher
 * Compiled filter sets for sub-ms blocking decisions
 * PR: Native adblock engine
 */

use std::collections::HashSet;
use std::sync::{Arc, RwLock};
use regex::Regex;
use serde::{Serialize, Deserialize};

pub struct AdblockEngine {
    blocked_domains: Arc<RwLock<HashSet<String>>>,
    blocked_patterns: Arc<RwLock<Vec<Regex>>>,
    allowlist: Arc<RwLock<HashSet<String>>>,
    enabled: bool,
}

impl AdblockEngine {
    pub fn new() -> Self {
        let engine = Self {
            blocked_domains: Arc::new(RwLock::new(HashSet::new())),
            blocked_patterns: Arc::new(RwLock::new(Vec::new())),
            allowlist: Arc::new(RwLock::new(HashSet::new())),
            enabled: true,
        };
        
        engine.load_default_filters();
        engine
    }

    /// Load default filter lists (EasyList, EasyPrivacy)
    fn load_default_filters(&self) {
        // Common ad domains (precompiled for speed)
        let default_domains = vec![
            "doubleclick.net",
            "googleadservices.com",
            "googlesyndication.com",
            "facebook.com",
            "analytics.js",
            "adsystem.com",
            "advertising.com",
            "adnxs.com",
            "adsrvr.org",
            "adtechus.com",
        ];

        {
            let mut domains = self.blocked_domains.write().unwrap();
            for domain in default_domains {
                domains.insert(domain.to_string());
            }
        }

        // Common patterns (compiled to regex)
        let default_patterns = vec![
            r"/ads?/",
            r"/advertisement",
            r"/tracking",
            r"\?utm_",
            r"/analytics",
            r"/pixel",
        ];

        {
            let mut patterns = self.blocked_patterns.write().unwrap();
            for pattern in default_patterns {
                if let Ok(regex) = Regex::new(pattern) {
                    patterns.push(regex);
                }
            }
        }
    }

    /// Check if URL should be blocked
    pub fn should_block(&self, url: &str, resource_type: &str) -> bool {
        if !self.enabled {
            return false;
        }

        // Check allowlist first
        {
            let allowlist = self.allowlist.read().unwrap();
            if allowlist.contains(url) {
                return false;
            }
        }

        // Extract domain from URL
        let domain = extract_domain(url);

        // Check blocked domains
        {
            let domains = self.blocked_domains.read().unwrap();
            if domains.contains(&domain) {
                return true;
            }
        }

        // Check patterns (only for certain resource types)
        if matches!(resource_type, "script" | "image" | "xhr" | "stylesheet") {
            let patterns = self.blocked_patterns.read().unwrap();
            for pattern in patterns.iter() {
                if pattern.is_match(url) {
                    return true;
                }
            }
        }

        false
    }

    /// Load filters from EasyList format
    pub fn load_easylist(&mut self, filters: &str) {
        let mut new_domains = HashSet::new();
        let mut new_patterns = Vec::new();

        for line in filters.lines() {
            let line = line.trim();
            
            // Skip comments and empty lines
            if line.is_empty() || line.starts_with('!') || line.starts_with('[') {
                continue;
            }

            // Domain filter: ||example.com^
            if line.starts_with("||") {
                let domain = line
                    .trim_start_matches("||")
                    .split('/')
                    .next()
                    .unwrap_or("")
                    .split('^')
                    .next()
                    .unwrap_or("")
                    .to_string();
                
                if !domain.is_empty() {
                    new_domains.insert(domain);
                }
            }
            // Pattern filter: /ads/
            else if line.starts_with('/') && line.ends_with('/') {
                let pattern = &line[1..line.len() - 1];
                if let Ok(regex) = Regex::new(pattern) {
                    new_patterns.push(regex);
                }
            }
            // Simple pattern
            else if line.contains('*') {
                let pattern = line.replace('*', ".*");
                if let Ok(regex) = Regex::new(&pattern) {
                    new_patterns.push(regex);
                }
            }
        }

        // Merge into existing filters
        {
            let mut domains = self.blocked_domains.write().unwrap();
            domains.extend(new_domains);
        }

        {
            let mut patterns = self.blocked_patterns.write().unwrap();
            patterns.extend(new_patterns);
        }
    }

    /// Add domain to allowlist
    pub fn allow_domain(&mut self, domain: &str) {
        let mut allowlist = self.allowlist.write().unwrap();
        allowlist.insert(domain.to_string());
    }

    /// Enable/disable adblock
    pub fn set_enabled(&mut self, enabled: bool) {
        self.enabled = enabled;
    }

    /// Get statistics
    pub fn get_stats(&self) -> AdblockStats {
        AdblockStats {
            blocked_domains: self.blocked_domains.read().unwrap().len(),
            blocked_patterns: self.blocked_patterns.read().unwrap().len(),
            allowlist_size: self.allowlist.read().unwrap().len(),
            enabled: self.enabled,
        }
    }
}

/// Extract domain from URL
fn extract_domain(url: &str) -> String {
    // Simple domain extraction (for production, use proper URL parsing)
    if let Some(start) = url.find("://") {
        let rest = &url[start + 3..];
        if let Some(end) = rest.find('/') {
            rest[..end].to_string()
        } else {
            rest.to_string()
        }
    } else {
        url.to_string()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AdblockStats {
    pub blocked_domains: usize,
    pub blocked_patterns: usize,
    pub allowlist_size: usize,
    pub enabled: bool,
}

impl Default for AdblockEngine {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_block_domain() {
        let engine = AdblockEngine::new();
        assert!(engine.should_block("https://doubleclick.net/ads", "script"));
        assert!(!engine.should_block("https://example.com/page", "document"));
    }

    #[test]
    fn test_allowlist() {
        let mut engine = AdblockEngine::new();
        engine.allow_domain("doubleclick.net");
        assert!(!engine.should_block("https://doubleclick.net/ads", "script"));
    }
}

