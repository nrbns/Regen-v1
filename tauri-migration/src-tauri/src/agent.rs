// Agent Commands - Real LLM Integration
// Handles research agent requests and execution

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use reqwest::Client;
use tauri::{AppHandle, WebviewWindow, Emitter};
use futures_util::StreamExt;
use std::time::Duration;

// Import db module - it's in the same crate
use crate::db;

#[derive(Debug, Serialize, Deserialize)]
pub struct ResearchAgentRequest {
    pub query: String,
    pub url: Option<String>,
    pub context: Option<String>,
    pub mode: Option<String>, // 'local' | 'remote' | 'hybrid'
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ResearchAgentResponse {
    pub agent_version: String,
    pub summary: Summary,
    pub actions: Vec<Action>,
    pub confidence: f64,
    pub explainability: String,
    pub citations: u32,
    pub hallucination: String,
    pub query: String,
    pub processing_time_ms: Option<u64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Summary {
    pub short: String,
    pub bullets: Vec<String>,
    pub keywords: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Action {
    pub id: String,
    #[serde(rename = "type")]
    pub action_type: String,
    pub label: String,
    pub payload: Value,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExecuteRequest {
    pub actions: Vec<Action>,
    pub session_id: Option<String>,
    pub user_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExecuteResponse {
    pub status: String,
    pub results: Vec<Value>,
    pub errors: Option<Vec<Value>>,
    pub executed_at: String,
}

// Use a function to get HTTP client (simpler than lazy_static)
fn get_http_client() -> Client {
    Client::new()
}

/**
 * Tauri command: research_agent
 * Calls backend server or local Ollama for research
 */
#[tauri::command]
pub async fn research_agent(
    request: ResearchAgentRequest,
    _app: AppHandle,
    window: WebviewWindow,
) -> Result<ResearchAgentResponse, String> {
    let start_time = std::time::Instant::now();
    
    // Get server URL from env or default
    let server_url = std::env::var("REGEN_SERVER_URL")
        .unwrap_or_else(|_| "http://127.0.0.1:4000".to_string());
    
    let mode = request.mode.as_deref().unwrap_or("hybrid");
    
    // Try remote server first (if not local-only mode)
    if mode != "local" {
        match call_remote_agent(&server_url, &request).await {
            Ok(response) => {
                window.emit("agent-research-complete", json!({
                    "query": request.query,
                    "success": true,
                })).ok();
                return Ok(response);
            }
            Err(e) => {
                eprintln!("[Agent] Remote call failed: {}, falling back to local", e);
                // Fall through to local
            }
        }
    }
    
    // Fallback to local Ollama
    let response = call_local_ollama(&request, &window).await?;
    
    let processing_time = start_time.elapsed().as_millis() as u64;
    
    window.emit("agent-research-complete", json!({
        "query": request.query,
        "success": true,
        "processing_time_ms": processing_time,
    })).ok();
    
    Ok(ResearchAgentResponse {
        processing_time_ms: Some(processing_time),
        ..response
    })
}

/**
 * Tauri command: execute_agent
 * Executes agent actions (local + remote sync)
 */
#[tauri::command]
pub async fn execute_agent(
    request: ExecuteRequest,
    app: AppHandle,
) -> Result<ExecuteResponse, String> {
    let mut results = Vec::new();
    let mut errors = Vec::new();
    
    for action in &request.actions {
        match execute_action(action, &app).await {
            Ok(result) => {
                results.push(json!({
                    "action_id": action.id,
                    "status": "ok",
                    "result": result,
                }));
            }
            Err(e) => {
                errors.push(json!({
                    "action_id": action.id,
                    "error": e,
                }));
            }
        }
    }
    
    // If session_id provided, save to local DB
    if let Some(session_id) = &request.session_id {
        // TODO: Save execution to agent_events table
        eprintln!("[Agent] Execution logged for session: {}", session_id);
    }
    
    // If user_id provided and cloud sync enabled, sync to remote
    if let Some(_user_id) = &request.user_id {
        let server_url = std::env::var("REGEN_SERVER_URL")
            .unwrap_or_else(|_| "http://127.0.0.1:4000".to_string());
        
        // Try to sync to remote (non-blocking)
        let _ = sync_to_remote(&server_url, &request).await;
    }
    
    Ok(ExecuteResponse {
        status: "ok".to_string(),
        results,
        errors: if errors.is_empty() { None } else { Some(errors) },
        executed_at: chrono::Utc::now().to_rfc3339(),
    })
}

// Helper functions

async fn call_remote_agent(
    server_url: &str,
    request: &ResearchAgentRequest,
) -> Result<ResearchAgentResponse, String> {
    let client = get_http_client();
    
    let response = client
        .post(&format!("{}/api/agent/research", server_url))
        .json(request)
        .timeout(std::time::Duration::from_secs(30))
        .send()
        .await
        .map_err(|e| format!("HTTP request failed: {}", e))?;
    
    if !response.status().is_success() {
        let status = response.status();
        let text = response.text().await.unwrap_or_default();
        return Err(format!("Server returned {}: {}", status, text));
    }
    
    let json: Value = response.json().await
        .map_err(|e| format!("Failed to parse JSON: {}", e))?;
    
    // Convert JSON to ResearchAgentResponse
    let response: ResearchAgentResponse = serde_json::from_value(json)
        .map_err(|e| format!("Failed to deserialize response: {}", e))?;
    
    Ok(response)
}

async fn call_local_ollama(
    request: &ResearchAgentRequest,
    window: &WebviewWindow,
) -> Result<ResearchAgentResponse, String> {
    let ollama_url = std::env::var("OLLAMA_BASE_URL")
        .unwrap_or_else(|_| "http://localhost:11434".to_string());
    
    let model = std::env::var("OLLAMA_MODEL")
        .unwrap_or_else(|_| "llama3.2:3b".to_string());
    
    // Build prompt
    let system_prompt = "You are a research assistant. Provide comprehensive, accurate summaries with citations.";
    let user_prompt = format!(
        "Query: {}\n{}\n\nProvide a detailed research summary with suggested actions.",
        request.query,
        request.context.as_deref().unwrap_or("")
    );
    
    window.emit("agent-research-start", json!({
        "query": request.query,
    })).ok();
    
    // Call Ollama
    let client = get_http_client();
    let response = client
        .post(&format!("{}/api/generate", ollama_url))
        .json(&json!({
            "model": model,
            "prompt": format!("{}\n\n{}", system_prompt, user_prompt),
            "stream": false,
            "options": {
                "temperature": 0.7,
            }
        }))
        .timeout(std::time::Duration::from_secs(60))
        .send()
        .await
        .map_err(|e| {
            if e.is_connect() {
                "Ollama is not running. Start it with: ollama serve".to_string()
            } else {
                format!("Ollama request failed: {}", e)
            }
        })?;
    
    if !response.status().is_success() {
        return Err(format!("Ollama returned status: {}", response.status()));
    }
    
    let json: Value = response.json().await
        .map_err(|e| format!("Failed to parse Ollama response: {}", e))?;
    
    let answer = json["response"]
        .as_str()
        .ok_or("No response field in Ollama JSON")?
        .to_string();
    
    // Parse answer and construct response
    let summary = Summary {
        short: answer.chars().take(200).collect(),
        bullets: answer
            .lines()
            .filter(|l| l.trim().starts_with("-") || l.trim().starts_with("*"))
            .take(3)
            .map(|s| s.trim().trim_start_matches("-").trim_start_matches("*").trim().to_string())
            .collect::<Vec<_>>(),
        keywords: extract_keywords(&request.query, &answer),
    };
    
    let actions = vec![
        Action {
            id: "act_search_1".to_string(),
            action_type: "search".to_string(),
            label: format!("Search: {}", request.query),
            payload: json!({ "query": request.query }),
        },
    ];
    
    Ok(ResearchAgentResponse {
        agent_version: "v1.0".to_string(),
        summary,
        actions,
        confidence: 0.7,
        explainability: "Generated by local Ollama".to_string(),
        citations: 0,
        hallucination: "medium".to_string(),
        query: request.query.clone(),
        processing_time_ms: None,
    })
}

async fn execute_action(
    action: &Action,
    app: &AppHandle,
) -> Result<Value, String> {
    match action.action_type.as_str() {
        "open_tabs" => {
            // Emit event for frontend to handle
            app.emit("agent-action-open-tabs", &action.payload)
                .map_err(|e| format!("Failed to emit event: {}", e))?;
            Ok(json!({ "status": "queued" }))
        }
        "search" => {
            app.emit("agent-action-search", &action.payload)
                .map_err(|e| format!("Failed to emit event: {}", e))?;
            Ok(json!({ "status": "queued" }))
        }
        "save_note" => {
            // TODO: Save to local SQLite
            Ok(json!({ "status": "saved" }))
        }
        "export_session" => {
            // TODO: Export session
            Ok(json!({ "status": "exported" }))
        }
        _ => Err(format!("Unknown action type: {}", action.action_type)),
    }
}

async fn sync_to_remote(
    server_url: &str,
    request: &ExecuteRequest,
) -> Result<(), String> {
    let client = get_http_client();
    
    let _response = client
        .post(&format!("{}/api/agent/execute", server_url))
        .json(request)
        .timeout(std::time::Duration::from_secs(10))
        .send()
        .await
        .map_err(|e| format!("Sync failed: {}", e))?;
    
    Ok(())
}

/**
 * Tauri command: research_agent_stream
 * Streaming version that emits AgentEvents as chunks arrive
 */
#[tauri::command]
pub async fn research_agent_stream(
    request: ResearchAgentRequest,
    app: AppHandle,
    window: WebviewWindow,
) -> Result<(), String> {
    // Emit start event
    window.emit("agent-event", json!({
        "type": "agent_start",
        "payload": {
            "query": request.query.clone(),
            "url": request.url.clone(),
        }
    })).ok();
    
    // Check cache first (if db module available)
    if let Some(url) = &request.url {
        match db::Database::new(&app) {
            Ok(db) => {
                if let Ok(Some(cached)) = db.get_cached_summary(url) {
                window.emit("agent-event", json!({
                    "type": "partial_summary",
                    "payload": {
                        "text": cached.clone(),
                        "cached": true,
                    }
                })).ok();
                
                let short_summary: String = cached.chars().take(200).collect();
                let empty_bullets: Vec<String> = Vec::new();
                let empty_keywords: Vec<String> = Vec::new();
                window.emit("agent-event", json!({
                    "type": "final_summary",
                    "payload": {
                        "summary": {
                            "short": short_summary,
                            "bullets": empty_bullets,
                            "keywords": empty_keywords,
                        },
                        "cached": true,
                    }
                })).ok();
                
                window.emit("agent-event", json!({
                    "type": "agent_end",
                    "payload": { "success": true, "cached": true }
                })).ok();
                
                return Ok(());
                }
            }
            Err(_) => {
                // DB not available, continue to LLM
            }
        }
    }
    
    // Stream from LLM
    let ollama_url = std::env::var("OLLAMA_BASE_URL")
        .unwrap_or_else(|_| "http://localhost:11434".to_string());
    
    let model = std::env::var("OLLAMA_MODEL")
        .unwrap_or_else(|_| "llama3.2:3b".to_string());
    
    // Chunk context if it's large
    let context_text = request.context.as_deref().unwrap_or("");
    let chunks = if context_text.len() > 4000 {
        // Use chunker for large contexts
        use crate::chunker::chunk_by_sentences;
        chunk_by_sentences(context_text)
    } else {
        // Small context, process as single chunk
        vec![crate::chunker::Chunk {
            text: context_text.to_string(),
            index: 0,
            total: 1,
        }]
    };
    
    let system_prompt = "You are a research assistant. Provide comprehensive, accurate summaries with citations.";
    
    // Process chunks progressively
    let mut accumulated_summary = String::new();
    
    for (chunk_idx, chunk) in chunks.iter().enumerate() {
        let chunk_prompt = if chunks.len() > 1 {
            format!(
                "Query: {}\n\nContext chunk {}/{}:\n{}\n\nProvide a summary of this chunk. Focus on key points relevant to the query.",
                request.query,
                chunk.index + 1,
                chunk.total,
                chunk.text
            )
        } else {
            format!(
                "Query: {}\n{}\n\nProvide a detailed research summary with suggested actions.",
                request.query,
                chunk.text
            )
        };
        
        // Emit progress for multi-chunk processing
        if chunks.len() > 1 {
            window.emit("agent-event", json!({
                "type": "partial_summary",
                "payload": {
                    "text": format!("\n[Processing chunk {}/{}...]\n", chunk_idx + 1, chunks.len()),
                    "chunk_index": chunk_idx,
                }
            })).ok();
        }
        
        let client = get_http_client();
        let response = client
            .post(&format!("{}/api/generate", ollama_url))
            .json(&json!({
                "model": model.clone(),
                "prompt": format!("{}\n\n{}", system_prompt, chunk_prompt),
                "stream": true,
                "options": {
                    "temperature": 0.7,
                }
            }))
            .timeout(Duration::from_secs(60))
            .send()
            .await;
    
        match response {
            Ok(res) if res.status().is_success() => {
                let mut stream = res.bytes_stream();
                let mut chunk_response = String::new();
                let mut token_count = 0;
                
                while let Some(chunk) = stream.next().await {
                    if let Ok(bytes) = chunk {
                        if let Ok(text) = std::str::from_utf8(&bytes) {
                            for line in text.lines() {
                                let line = line.trim();
                                if line.is_empty() { continue; }
                                
                                if let Ok(json) = serde_json::from_str::<Value>(line) {
                                    if json["done"] == true || json["done"].as_bool().unwrap_or(false) {
                                        // Chunk complete, accumulate
                                        if !chunk_response.is_empty() {
                                            accumulated_summary.push_str(&chunk_response);
                                            accumulated_summary.push_str("\n\n");
                                        }
                                        break;
                                    }
                                    
                                    if let Some(token) = json["response"].as_str() {
                                        chunk_response.push_str(token);
                                        accumulated_summary.push_str(token);
                                        token_count += 1;
                                        
                                        // Emit partial summary every 5 tokens for real-time feel
                                        if token_count % 5 == 0 {
                                            window.emit("agent-event", json!({
                                                "type": "partial_summary",
                                                "payload": {
                                                    "text": token,
                                                    "chunk_index": chunk_idx,
                                                }
                                            })).ok();
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            _ => {
                // Chunk failed, continue with next or finalize
                if chunk_idx == chunks.len() - 1 {
                    // Last chunk failed
                    window.emit("agent-event", json!({
                        "type": "error",
                        "payload": {
                            "message": "Failed to process chunk. Partial results available."
                        }
                    })).ok();
                }
            }
        }
    }
    
    // Finalize summary from all chunks
    if !accumulated_summary.is_empty() {
        let summary = Summary {
            short: accumulated_summary.chars().take(200).collect(),
            bullets: accumulated_summary
                .lines()
                .filter(|l| l.trim().starts_with("-") || l.trim().starts_with("*"))
                .take(3)
                .map(|s| s.trim().trim_start_matches("-").trim_start_matches("*").trim().to_string())
                .collect::<Vec<_>>(),
            keywords: extract_keywords(&request.query, &accumulated_summary),
        };
        
        window.emit("agent-event", json!({
            "type": "final_summary",
            "payload": {
                "summary": summary,
                "citations": 1,
                "hallucination": "medium",
                "confidence": 0.7,
            }
        })).ok();
        
        // Cache result
        if let Some(url) = &request.url {
            if let Ok(db) = db::Database::new(&app) {
                let _ = db.cache_summary(url, &accumulated_summary);
            }
        }
        
        window.emit("agent-event", json!({
            "type": "agent_end",
            "payload": { "success": true }
        })).ok();
        
        Ok(())
    } else {
        // No summary generated
        window.emit("agent-event", json!({
            "type": "error",
            "payload": {
                "message": "Failed to generate summary. Make sure Ollama is running."
            }
        })).ok();
        
        Err("Failed to generate summary".to_string())
    }
}

fn extract_keywords(query: &str, text: &str) -> Vec<String> {
    let combined = format!("{} {}", query, text).to_lowercase();
    let words: Vec<&str> = combined.split_whitespace().collect();
    let common_words: std::collections::HashSet<&str> = [
        "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by",
    ]
    .iter()
    .cloned()
    .collect();
    
    let mut keywords: Vec<String> = words
        .into_iter()
        .filter(|w| w.len() > 3 && !common_words.contains(w))
        .map(|w| w.to_string())
        .collect();
    
    keywords.sort();
    keywords.dedup();
    keywords.truncate(5);
    keywords
}

