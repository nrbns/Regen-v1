/**
 * Security Module
 * DAY 8 FIX: Validates and sanitizes all IPC messages
 */

use serde_json::Value;
use regex::Regex;

lazy_static::lazy_static! {
    static ref DANGEROUS_COMMANDS: Vec<&'static str> = vec![
        "eval", "exec", "system", "shell", "spawn", "child_process",
        "rm", "del", "format", "shutdown", "reboot"
    ];
    
    static ref URL_PATTERN: Regex = Regex::new(r"^https?://|^regen://").unwrap();
    static ref COMMAND_PATTERN: Regex = Regex::new(r"^[a-zA-Z0-9:_-]+$").unwrap();
}

/**
 * Validate command name
 */
#[allow(dead_code)]
pub fn validate_command_name(command: &str) -> bool {
    // Check pattern
    if !COMMAND_PATTERN.is_match(command) {
        eprintln!("[Security] Invalid command pattern: {}", command);
        return false;
    }
    
    // Block dangerous commands
    let command_lower = command.to_lowercase();
    for dangerous in DANGEROUS_COMMANDS.iter() {
        if command_lower.contains(dangerous) {
            eprintln!("[Security] Blocked dangerous command: {}", command);
            return false;
        }
    }
    
    true
}

/**
 * Sanitize string input
 */
#[allow(dead_code)]
pub fn sanitize_string(input: &str) -> String {
    // Remove null bytes and control characters
    let sanitized = input
        .chars()
        .filter(|c| !c.is_control() || *c == '\n' || *c == '\r' || *c == '\t')
        .collect::<String>();
    
    // Limit length
    if sanitized.len() > 10000 {
        sanitized[..10000].to_string()
    } else {
        sanitized
    }
}

/**
 * Sanitize URL
 */
#[allow(dead_code)]
pub fn sanitize_url(input: &str) -> Option<String> {
    let sanitized = sanitize_string(input);
    
    // Validate URL format
    if URL_PATTERN.is_match(&sanitized) {
        // Additional validation: check for script injection
        if sanitized.contains("<script") || sanitized.contains("javascript:") {
            eprintln!("[Security] Blocked malicious URL: {}", sanitized);
            return None;
        }
        Some(sanitized)
    } else {
        None
    }
}

/**
 * Validate IPC request payload
 */
#[allow(dead_code)]
pub fn validate_ipc_payload(command: &str, payload: &Value) -> Result<Value, String> {
    // Validate command name
    if !validate_command_name(command) {
        return Err(format!("Invalid command name: {}", command));
    }
    
    // Recursively sanitize payload
    sanitize_value(payload)
}

/**
 * Recursively sanitize JSON value
 */
#[allow(dead_code)]
fn sanitize_value(value: &Value) -> Result<Value, String> {
    match value {
        Value::String(s) => {
            // Check if it's a URL field
            if s.starts_with("http://") || s.starts_with("https://") || s.starts_with("regen://") {
                if let Some(sanitized) = sanitize_url(s) {
                    Ok(Value::String(sanitized))
                } else {
                    Err("Invalid URL".to_string())
                }
            } else {
                Ok(Value::String(sanitize_string(s)))
            }
        }
        Value::Array(arr) => {
            let sanitized: Result<Vec<Value>, String> = arr
                .iter()
                .map(sanitize_value)
                .collect();
            sanitized.map(Value::Array)
        }
        Value::Object(obj) => {
            let mut sanitized = serde_json::Map::new();
            for (key, val) in obj.iter() {
                let safe_key = sanitize_string(key);
                match sanitize_value(val) {
                    Ok(safe_val) => {
                        sanitized.insert(safe_key, safe_val);
                    }
                    Err(e) => {
                        eprintln!("[Security] Failed to sanitize field {}: {}", key, e);
                        // Skip invalid fields
                    }
                }
            }
            Ok(Value::Object(sanitized))
        }
        _ => Ok(value.clone()), // Numbers, booleans, null are safe
    }
}

