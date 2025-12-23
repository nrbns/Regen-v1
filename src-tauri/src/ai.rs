// AI Integration - llama.cpp / Ollama
// Offline-first AI inference

use serde::{Deserialize, Serialize};
use std::process::{Command, Stdio};
use tokio::process::Command as TokioCommand;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIConfig {
    pub provider: AIProvider,
    pub model: String,
    pub max_tokens: usize,
    pub temperature: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AIProvider {
    Ollama,    // Spawn Ollama binary
    LlamaCpp,  // llama.cpp bindings (if implemented)
}

pub struct AIService {
    config: AIConfig,
    ollama_available: bool,
}

impl AIService {
    pub fn new(config: AIConfig) -> Self {
        // Check if Ollama is available
        let ollama_available = which::which("ollama").is_ok();

        Self {
            config,
            ollama_available,
        }
    }

    // Check if AI service is available
    pub fn is_available(&self) -> bool {
        match self.config.provider {
            AIProvider::Ollama => self.ollama_available,
            AIProvider::LlamaCpp => {
                // TODO: Check if llama.cpp library is loaded
                false
            }
        }
    }

    // Generate completion (blocking)
    pub fn complete(&self, prompt: &str) -> Result<String, AIError> {
        if !self.is_available() {
            return Err(AIError::ServiceUnavailable);
        }

        match self.config.provider {
            AIProvider::Ollama => self.complete_ollama(prompt),
            AIProvider::LlamaCpp => Err(AIError::NotImplemented),
        }
    }

    // Generate completion with streaming (async)
    pub async fn complete_stream(
        &self,
        prompt: &str,
    ) -> Result<TokioBufReader<tokio::process::ChildStdout>, AIError> {
        if !self.is_available() {
            return Err(AIError::ServiceUnavailable);
        }

        match self.config.provider {
            AIProvider::Ollama => self.complete_ollama_stream(prompt).await,
            AIProvider::LlamaCpp => Err(AIError::NotImplemented),
        }
    }

    // Ollama completion (blocking)
    fn complete_ollama(&self, prompt: &str) -> Result<String, AIError> {
        let output = Command::new("ollama")
            .arg("run")
            .arg(&self.config.model)
            .arg(prompt)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .map_err(|e| AIError::ExecutionFailed(e.to_string()))?;

        if !output.status.success() {
            let error = String::from_utf8_lossy(&output.stderr);
            return Err(AIError::ExecutionFailed(error.to_string()));
        }

        let response = String::from_utf8_lossy(&output.stdout);
        Ok(response.trim().to_string())
    }

    // Ollama streaming completion (async)
    async fn complete_ollama_stream(
        &self,
        prompt: &str,
    ) -> Result<TokioBufReader<tokio::process::ChildStdout>, AIError> {
        let mut child = TokioCommand::new("ollama")
            .arg("run")
            .arg(&self.config.model)
            .arg(prompt)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| AIError::ExecutionFailed(e.to_string()))?;

        let stdout = child.stdout.take().ok_or_else(|| {
            AIError::ExecutionFailed("Failed to capture stdout".to_string())
        })?;

        // Spawn task to handle stderr (log errors)
        let stderr = child.stderr.take();
        if let Some(stderr) = stderr {
            tokio::spawn(async move {
                let mut reader = TokioBufReader::new(stderr);
                let mut line = String::new();
                while reader.read_line(&mut line).await.is_ok() && !line.is_empty() {
                    eprintln!("[Ollama] {}", line.trim());
                    line.clear();
                }
            });
        }

        // Spawn task to wait for process (prevent zombie)
        tokio::spawn(async move {
            let _ = child.wait().await;
        });

        let reader = TokioBufReader::new(stdout);
        Ok(reader)
    }

    // Detect intent from user query (for agent system)
    pub fn detect_intent(&self, query: &str) -> Result<Intent, AIError> {
        // Simple intent detection prompt
        let prompt = format!(
            "Analyze this user query and determine the intent. Respond with only one word: search, summarize, compare, act, or question.\n\nQuery: {}",
            query
        );

        let response = self.complete(&prompt)?;
        let intent_str = response.trim().to_lowercase();

        let intent = match intent_str.as_str() {
            "search" => Intent::Search,
            "summarize" => Intent::Summarize,
            "compare" => Intent::Compare,
            "act" => Intent::Act,
            "question" => Intent::Question,
            _ => Intent::Question, // Default fallback
        };

        Ok(intent)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Intent {
    Search,     // User wants to search
    Summarize,  // User wants to summarize content
    Compare,    // User wants to compare items
    Act,        // User wants to perform an action
    Question,   // User is asking a question
}

#[derive(Debug, Clone)]
pub enum AIError {
    ServiceUnavailable,
    ExecutionFailed(String),
    NotImplemented,
    InvalidResponse,
}

impl std::fmt::Display for AIError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AIError::ServiceUnavailable => write!(f, "AI service is not available"),
            AIError::ExecutionFailed(msg) => write!(f, "AI execution failed: {}", msg),
            AIError::NotImplemented => write!(f, "Feature not implemented"),
            AIError::InvalidResponse => write!(f, "Invalid AI response"),
        }
    }
}

impl std::error::Error for AIError {}

// Async imports
use tokio::io::{AsyncBufReadExt, BufReader as TokioBufReader};
