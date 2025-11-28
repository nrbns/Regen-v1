/**
 * Ollama Integration Module
 * Handles Ollama API calls and model management
 */

use serde::{Deserialize, Serialize};
use std::time::Duration;
use tokio::time::sleep;

const OLLAMA_BASE_URL: &str = "http://localhost:11434";

#[derive(Debug, Serialize, Deserialize)]
struct OllamaGenerateRequest {
    model: String,
    prompt: String,
    stream: bool,
}

#[derive(Debug, Serialize, Deserialize)]
struct OllamaGenerateResponse {
    response: String,
    done: bool,
}

/// Check if Ollama is running
pub async fn check_ollama() -> bool {
    let client = reqwest::Client::new();
    match client
        .get(format!("{}/api/tags", OLLAMA_BASE_URL))
        .timeout(Duration::from_secs(2))
        .send()
        .await
    {
        Ok(resp) => resp.status().is_success(),
        Err(_) => false,
    }
}

/// Generate text using Ollama
pub async fn generate_text(model: &str, prompt: &str) -> Result<String, String> {
    let client = reqwest::Client::new();
    let request = OllamaGenerateRequest {
        model: model.to_string(),
        prompt: prompt.to_string(),
        stream: false,
    };

    let response = client
        .post(format!("{}/api/generate", OLLAMA_BASE_URL))
        .json(&request)
        .timeout(Duration::from_secs(30))
        .send()
        .await
        .map_err(|e| format!("Ollama request failed: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Ollama API error: {}", response.status()));
    }

    let result: OllamaGenerateResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    Ok(result.response)
}

/// Wait for Ollama to be ready (with retries)
pub async fn wait_for_ollama(max_retries: u32) -> bool {
    for i in 0..max_retries {
        if check_ollama().await {
            return true;
        }
        if i < max_retries - 1 {
            sleep(Duration::from_secs(1)).await;
        }
    }
    false
}

