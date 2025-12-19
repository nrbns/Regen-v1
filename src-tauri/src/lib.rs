// Rust Tauri Backend - Service Modules

pub mod services {
    pub mod ollama_service;
    pub mod global_shortcut_service;
}

use services::ollama_service::OllamaService;
use services::global_shortcut_service;

// Initialize all backend services on app startup
pub fn initialize_backend() -> Result<(), String> {
    // DAY 1: Start Ollama backend
    let mut ollama = OllamaService::new();
    ollama.start()?;
    
    // DAY 3: Register global shortcuts
    global_shortcut_service::initialize_global_shortcuts()?;
    
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_app_initialization() {
        // Test that app initializes correctly
    }

    #[tokio::test]
    async fn test_search_command() {
        // Test search command routing
    }
}
