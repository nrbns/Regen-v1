// Rust Tauri Backend - Core Modules

// Core modules (Rust-owned state)
pub mod state;
pub mod browser;
pub mod db;
pub mod search;
pub mod privacy;
pub mod ai;
pub mod agent;
pub mod tor;
pub mod commands;
pub mod stability;

// Service modules
pub mod services {
    pub mod ollama_service;
    pub mod global_shortcut_service;
}
