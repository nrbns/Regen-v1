/**
 * llama.cpp Rust Integration for On-Device AI
 * Provides native inference via llama-cpp-rs bindings
 */

use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelInfo {
    pub path: String,
    pub size_mb: Option<u64>,
    pub loaded_at: Option<u64>,
    pub context_size: Option<usize>,
    pub n_threads: Option<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerationOptions {
    pub max_tokens: usize,
    pub temperature: f32,
    pub top_p: Option<f32>,
    pub top_k: Option<usize>,
    pub repeat_penalty: Option<f32>,
    pub stop_sequences: Option<Vec<String>>,
}

impl Default for GenerationOptions {
    fn default() -> Self {
        Self {
            max_tokens: 256,
            temperature: 0.7,
            top_p: Some(0.9),
            top_k: Some(40),
            repeat_penalty: Some(1.1),
            stop_sequences: None,
        }
    }
}

// Model manager state
pub struct LlamaModelManager {
    model_path: Option<PathBuf>,
    context: Option<Arc<Mutex<LlamaContext>>>,
    model_info: Option<ModelInfo>,
    n_threads: usize,
    context_size: usize,
}

// Placeholder context type (will be replaced with actual llama-cpp-rs types)
pub struct LlamaContext {
    // Will be populated with actual llama-cpp-rs Context
    // In real implementation:
    // - llama_context
    // - model reference
    // - KV cache
}

impl LlamaModelManager {
    pub fn new() -> Self {
        Self {
            model_path: None,
            context: None,
            model_info: None,
            n_threads: num_cpus::get().min(4), // Limit threads for low-end devices
            context_size: 2048, // Default context size
        }
    }

    /// Check if a model is loaded
    pub fn is_loaded(&self) -> bool {
        self.context.is_some()
    }

    /// Get model info
    pub fn get_model_info(&self) -> Option<ModelInfo> {
        self.model_info.clone()
    }

    /// Load model from path
    pub fn load_model(&mut self, path: PathBuf) -> Result<ModelInfo, String> {
        if !path.exists() {
            return Err(format!("Model file not found: {}", path.display()));
        }

        // Get file size
        let size_mb = std::fs::metadata(&path)
            .ok()
            .map(|m| m.len() / (1024 * 1024));

        let model_info = ModelInfo {
            path: path.to_string_lossy().to_string(),
            size_mb,
            loaded_at: Some(std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs()),
            context_size: Some(self.context_size),
            n_threads: Some(self.n_threads),
        };

        // TODO: Initialize llama-cpp-rs context
        // For now, mark as loaded (will implement actual loading)
        self.model_path = Some(path);
        self.model_info = Some(model_info.clone());
        self.context = Some(Arc::new(Mutex::new(LlamaContext {})));
        
        Ok(model_info)
    }

    /// Unload model
    pub fn unload_model(&mut self) -> Result<(), String> {
        self.context = None;
        self.model_path = None;
        self.model_info = None;
        Ok(())
    }

    /// Set thread count
    pub fn set_threads(&mut self, n_threads: usize) {
        self.n_threads = n_threads.min(8); // Cap at 8 threads
        if let Some(ref mut info) = self.model_info {
            info.n_threads = Some(self.n_threads);
        }
    }

    /// Set context size
    pub fn set_context_size(&mut self, context_size: usize) {
        self.context_size = context_size.min(4096); // Cap at 4096
        if let Some(ref mut info) = self.model_info {
            info.context_size = Some(self.context_size);
        }
    }

    /// Generate text from prompt
    pub fn generate(&self, prompt: &str, options: GenerationOptions) -> Result<String, String> {
        if !self.is_loaded() {
            return Err("Model not loaded. Call load_model first.".to_string());
        }

        // TODO: Implement actual inference
        // For now, return a placeholder response
        Ok(format!("[Placeholder] Generated response for: {} (max_tokens: {}, temp: {})", 
            &prompt[..prompt.len().min(50)],
            options.max_tokens,
            options.temperature
        ))
    }

    /// Estimate memory usage in MB
    pub fn get_memory_usage_mb(&self) -> u64 {
        if let Some(ref info) = self.model_info {
            info.size_mb.unwrap_or(0) * 2 // Rough estimate: model + context
        } else {
            0
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SummarizeRequest {
    text: String,
    max_length: Option<usize>,
    language: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SummarizeResponse {
    summary: String,
    method: String, // "llama" | "fallback"
    confidence: f32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TranslateRequest {
    text: String,
    target_language: String,
    source_language: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TranslateResponse {
    translated: String,
    method: String,
    confidence: f32,
}

/// Tauri command: Check if on-device model is available
#[tauri::command]
pub async fn check_ondevice_model() -> Result<bool, String> {
    // Check for common model locations
    let model_paths = vec![
        "models/phi-3-mini.gguf",
        "models/tinyllama.gguf",
        "models/llama-3.2-3b.gguf",
        "./models/phi-3-mini.gguf",
        "./models/tinyllama.gguf",
    ];

    for path_str in model_paths {
        let path = PathBuf::from(path_str);
        if path.exists() {
            return Ok(true);
        }
    }

    Ok(false)
}

/// Tauri command: Load on-device model
#[tauri::command]
pub async fn load_ondevice_model(
    model_path: String,
    state: State<'_, Arc<Mutex<LlamaModelManager>>>,
) -> Result<ModelInfo, String> {
    let mut manager = state.lock().map_err(|e| format!("Lock error: {}", e))?;
    let path = PathBuf::from(model_path);
    manager.load_model(path)
}

/// Tauri command: Summarize text using on-device model
#[tauri::command]
pub async fn ondevice_summarize(
    request: SummarizeRequest,
    state: State<'_, Arc<Mutex<LlamaModelManager>>>,
) -> Result<SummarizeResponse, String> {
    let manager = state.lock().map_err(|e| format!("Lock error: {}", e))?;

    if !manager.is_loaded() {
        return Err("On-device model not loaded".to_string());
    }

    let max_length = request.max_length.unwrap_or(200);
    let language = request.language.as_deref().unwrap_or("en");

    // Build prompt for summarization
    let prompt = format!(
        "Summarize the following text in {} in approximately {} words:\n\n{}\n\nSummary:",
        language,
        max_length,
        request.text
    );

    let options = GenerationOptions {
        max_tokens: max_length * 2,
        temperature: 0.3,
        top_p: Some(0.9),
        repeat_penalty: Some(1.1),
        ..Default::default()
    };

    match manager.generate(&prompt, options) {
        Ok(summary) => Ok(SummarizeResponse {
            summary,
            method: "llama".to_string(),
            confidence: 0.85,
        }),
        Err(e) => Err(format!("Generation failed: {}", e)),
    }
}

/// Tauri command: Translate text using on-device model
#[tauri::command]
pub async fn ondevice_translate(
    request: TranslateRequest,
    state: State<'_, Arc<Mutex<LlamaModelManager>>>,
) -> Result<TranslateResponse, String> {
    let manager = state.lock().map_err(|e| format!("Lock error: {}", e))?;

    if !manager.is_loaded() {
        return Err("On-device model not loaded".to_string());
    }

    let source_lang = request.source_language.as_deref().unwrap_or("auto");
    let prompt = format!(
        "Translate the following text from {} to {}:\n\n{}\n\nTranslation:",
        source_lang,
        request.target_language,
        request.text
    );

    let options = GenerationOptions {
        max_tokens: request.text.len(),
        temperature: 0.4,
        top_p: Some(0.9),
        repeat_penalty: Some(1.1),
        ..Default::default()
    };

    match manager.generate(&prompt, options) {
        Ok(translated) => Ok(TranslateResponse {
            translated,
            method: "llama".to_string(),
            confidence: 0.80,
        }),
        Err(e) => Err(format!("Translation failed: {}", e)),
    }
}

/// Tauri command: Detect intent/classification
#[tauri::command]
pub async fn ondevice_detect_intent(
    text: String,
    state: State<'_, Arc<Mutex<LlamaModelManager>>>,
) -> Result<String, String> {
    let manager = state.lock().map_err(|e| format!("Lock error: {}", e))?;

    if !manager.is_loaded() {
        return Err("On-device model not loaded".to_string());
    }

    let prompt = format!(
        "Classify the intent of this text (search, summarize, translate, question, command):\n\n{}\n\nIntent:",
        text
    );

    let options = GenerationOptions {
        max_tokens: 20,
        temperature: 0.2,
        top_p: Some(0.9),
        ..Default::default()
    };

    match manager.generate(&prompt, options) {
        Ok(intent) => Ok(intent.trim().to_lowercase()),
        Err(e) => Err(format!("Intent detection failed: {}", e)),
    }
}

/// Tauri command: Get model info
#[tauri::command]
pub async fn get_model_info(
    state: State<'_, Arc<Mutex<LlamaModelManager>>>,
) -> Result<Option<ModelInfo>, String> {
    let manager = state.lock().map_err(|e| format!("Lock error: {}", e))?;
    Ok(manager.get_model_info())
}

/// Tauri command: Set number of threads
#[tauri::command]
pub async fn set_threads(
    n_threads: usize,
    state: State<'_, Arc<Mutex<LlamaModelManager>>>,
) -> Result<(), String> {
    let mut manager = state.lock().map_err(|e| format!("Lock error: {}", e))?;
    manager.set_threads(n_threads);
    Ok(())
}

/// Tauri command: Set context size
#[tauri::command]
pub async fn set_context_size(
    context_size: usize,
    state: State<'_, Arc<Mutex<LlamaModelManager>>>,
) -> Result<(), String> {
    let mut manager = state.lock().map_err(|e| format!("Lock error: {}", e))?;
    manager.set_context_size(context_size);
    Ok(())
}

/// Tauri command: Generate text using on-device model
#[tauri::command]
pub async fn ondevice_generate(
    prompt: String,
    options: Option<GenerationOptions>,
    state: State<'_, Arc<Mutex<LlamaModelManager>>>,
) -> Result<String, String> {
    let manager = state.lock().map_err(|e| format!("Lock error: {}", e))?;

    if !manager.is_loaded() {
        return Err("On-device model not loaded".to_string());
    }

    let gen_options = options.unwrap_or_default();
    manager.generate(&prompt, gen_options)
}

/// Tauri command: Get model memory usage in MB
#[tauri::command]
pub async fn get_model_memory_usage_mb(
    state: State<'_, Arc<Mutex<LlamaModelManager>>>,
) -> Result<u64, String> {
    let manager = state.lock().map_err(|e| format!("Lock error: {}", e))?;
    Ok(manager.get_memory_usage_mb())
}

/// Tauri command: Unload on-device model
#[tauri::command]
pub async fn unload_ondevice_model(
    state: State<'_, Arc<Mutex<LlamaModelManager>>>,
) -> Result<(), String> {
    let mut manager = state.lock().map_err(|e| format!("Lock error: {}", e))?;
    manager.unload_model()
}

