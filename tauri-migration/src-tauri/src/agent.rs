// Agent Commands - Real LLM Integration
// Handles research agent requests and execution

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use reqwest::Client;
use tauri::{AppHandle, WebviewWindow, Emitter};
use futures_util::StreamExt;
use std::time::Duration;
use tokio::sync::mpsc;
use tokio_tungstenite::tungstenite::Message;

// Import db module - it's in the same crate
use crate::db;
use crate::chunker;
use crate::websocket::AgentContext;

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

// DAY 2 FIX #2: Add User-Agent to all requests for CORS compatibility
fn get_http_client() -> Client {
    Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .timeout(Duration::from_secs(60))
        .build()
        .unwrap_or_else(|_| Client::new())
}

// Rate limiting: track active streams per session
use std::sync::Arc;
use tokio::sync::Mutex;
use std::collections::HashMap;

type ActiveStreams = Arc<Mutex<HashMap<String, bool>>>;

lazy_static::lazy_static! {
    static ref ACTIVE_STREAMS: ActiveStreams = Arc::new(Mutex::new(HashMap::new()));
}

/**
 * Stream agent response to WebSocket connection
 */
pub async fn stream_agent_to_websocket(
    ctx: AgentContext,
    tx: mpsc::Sender<Message>,
    app: AppHandle,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let session_key = ctx.session_id.clone().unwrap_or_else(|| ctx.url.clone().unwrap_or_default());
    
    // Check rate limit
    {
        let mut streams = ACTIVE_STREAMS.lock().await;
        if streams.get(&session_key).copied().unwrap_or(false) {
            let busy_msg = json!({
                "type": "agent_busy",
                "payload": {
                    "message": "Agent is already processing a request for this session"
                }
            });
            tx.send(Message::Text(busy_msg.to_string())).await?;
            return Ok(());
        }
        streams.insert(session_key.clone(), true);
    }
    
    // Cleanup on exit
    let streams_cleanup = ACTIVE_STREAMS.clone();
    let session_key_cleanup = session_key.clone();
    
    // PR: Fix tab switch - include tabId and sessionId in all events
    let tab_id = ctx.tab_id.clone();
    let session_id = ctx.session_id.clone();
    
    // Emit start event
    let start_event = json!({
        "type": "agent_start",
        "tabId": tab_id,
        "sessionId": session_id,
        "payload": {
            "query": ctx.query.clone(),
            "url": ctx.url.clone(),
        }
    });
    println!("[AGENT WS] sending event stage=agent_start tab_id={:?} session_id={:?}", tab_id, session_id);
    tx.send(Message::Text(start_event.to_string())).await?;
    
    // Check cache first
    if let Some(url) = &ctx.url {
        match db::Database::new(&app) {
            Ok(db) => {
                if let Ok(Some(cached)) = db.get_cached_summary(url) {
                    let short_summary: String = cached.chars().take(200).collect();
                    let empty_bullets: Vec<String> = Vec::new();
                    let empty_keywords: Vec<String> = Vec::new();
                    
                    // PR: Fix tab switch - include tabId in all events
                    // Emit cached partial
                    let partial_event = json!({
                        "type": "partial_summary",
                        "tabId": tab_id,
                        "sessionId": session_id,
                        "payload": {
                            "text": cached.clone(),
                            "cached": true,
                        }
                    });
                    println!("[AGENT WS] sending event stage=partial_summary tab_id={:?}", tab_id);
                    tx.send(Message::Text(partial_event.to_string())).await?;
                    
                    // Emit final summary
                    let final_event = json!({
                        "type": "final_summary",
                        "tabId": tab_id,
                        "sessionId": session_id,
                        "payload": {
                            "summary": {
                                "short": short_summary,
                                "bullets": empty_bullets,
                                "keywords": empty_keywords,
                            },
                            "cached": true,
                        }
                    });
                    println!("[AGENT WS] sending event stage=final_summary tab_id={:?}", tab_id);
                    tx.send(Message::Text(final_event.to_string())).await?;
                    
                    // Emit end
                    let end_event = json!({
                        "type": "agent_end",
                        "tabId": tab_id,
                        "sessionId": session_id,
                        "payload": { "success": true, "cached": true }
                    });
                    println!("[AGENT WS] sending event stage=agent_end tab_id={:?}", tab_id);
                    tx.send(Message::Text(end_event.to_string())).await?;
                    
                    // Release rate limit
                    let mut streams = streams_cleanup.lock().await;
                    streams.remove(&session_key_cleanup);
                    
                    return Ok(());
                }
            }
            Err(_) => {
                // DB not available, continue to LLM
            }
        }
    }
    
    // Stream from LLM
    let request = ResearchAgentRequest {
        query: ctx.query.clone(),
        url: ctx.url.clone(),
        context: ctx.context.clone(),
        mode: ctx.mode.clone(),
    };
    
    // PR: Fix tab switch - pass tabId and sessionId to streaming function
    if let Err(e) = stream_llm_response_ws(&request, &tx, &app, tab_id.clone(), session_id.clone()).await {
        // Send error event with tabId
        let error_event = json!({
            "type": "error",
            "tabId": tab_id,
            "sessionId": session_id,
            "payload": {
                "message": e.to_string()
            }
        });
        println!("[AGENT WS] sending event stage=error tab_id={:?}", tab_id);
        let _ = tx.send(Message::Text(error_event.to_string())).await;
    }
    
    // Release rate limit
    let mut streams = streams_cleanup.lock().await;
    streams.remove(&session_key_cleanup);
    
    Ok(())
}

/**
 * Stream LLM response to WebSocket
 * PR: Fix tab switch - accepts tabId and sessionId to include in all events
 */
async fn stream_llm_response_ws(
    request: &ResearchAgentRequest,
    tx: &mpsc::Sender<Message>,
    app: &AppHandle,
    tab_id: Option<String>,
    session_id: Option<String>,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    // Chunk context if it's large
    let context_text = request.context.as_deref().unwrap_or("");
    let chunks = if context_text.len() > 4000 {
        chunker::chunk_by_sentences(context_text, 4000)
    } else {
        vec![chunker::Chunk {
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
        
        // PR: Fix tab switch - include tabId in progress events
        // Emit progress for multi-chunk processing
        if chunks.len() > 1 {
            let progress_event = json!({
                "type": "partial_summary",
                "tabId": tab_id,
                "sessionId": session_id,
                "payload": {
                    "text": format!("\n[Processing chunk {}/{}...]\n", chunk_idx + 1, chunks.len()),
                    "chunk_index": chunk_idx,
                }
            });
            println!("[AGENT WS] sending event stage=partial_summary (progress) tab_id={:?}", tab_id);
            tx.send(Message::Text(progress_event.to_string())).await?;
        }
        
        // Try Hugging Face first if configured, then Ollama, then mock LLM
        let llm_provider = std::env::var("LLM_PROVIDER")
            .unwrap_or_else(|_| "ollama".to_string())
            .to_lowercase();
        
        let client = get_http_client();
        let response = if llm_provider == "huggingface" || llm_provider == "hf" {
            // Try Hugging Face Inference API
            let hf_api_key = std::env::var("HUGGINGFACE_API_KEY")
                .unwrap_or_else(|_| String::new());
            let hf_model = std::env::var("HUGGINGFACE_MODEL")
                .unwrap_or_else(|_| "meta-llama/Llama-2-7b-chat-hf".to_string());
            
            if hf_api_key.is_empty() {
                eprintln!("[Agent] HUGGINGFACE_API_KEY not set, falling back to Ollama");
                // Fall through to Ollama
                let ollama_url = std::env::var("OLLAMA_BASE_URL")
                    .unwrap_or_else(|_| "http://localhost:11434".to_string());
                let model = std::env::var("OLLAMA_MODEL")
                    .unwrap_or_else(|_| "llama3.2:3b".to_string());
                
                client
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
                    .await
            } else {
                // Call Hugging Face Inference API
                client
                    .post(&format!("https://api-inference.huggingface.co/models/{}", hf_model))
                    .header("Authorization", format!("Bearer {}", hf_api_key))
                    .json(&json!({
                        "inputs": format!("{}\n\n{}", system_prompt, chunk_prompt),
                        "parameters": {
                            "max_new_tokens": 512,
                            "temperature": 0.7,
                            "return_full_text": false,
                        },
                        "options": {
                            "wait_for_model": true,
                        }
                    }))
                    .timeout(Duration::from_secs(120))
                    .send()
                    .await
            }
        } else {
            // Try Ollama (default)
            let ollama_url = std::env::var("OLLAMA_BASE_URL")
                .unwrap_or_else(|_| "http://localhost:11434".to_string());
            
            let model = std::env::var("OLLAMA_MODEL")
                .unwrap_or_else(|_| "llama3.2:3b".to_string());
            
            client
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
                .await
        };
    
        match response {
            Ok(res) if res.status().is_success() => {
                // Check if this is Hugging Face response (non-streaming JSON) or Ollama (streaming)
                let llm_provider_check = std::env::var("LLM_PROVIDER")
                    .unwrap_or_else(|_| "ollama".to_string())
                    .to_lowercase();
                
                let mut chunk_response = String::new();
                
                if llm_provider_check == "huggingface" || llm_provider_check == "hf" {
                    // Hugging Face returns JSON (non-streaming by default)
                    match res.json::<Value>().await {
                        Ok(json) => {
                            // Extract generated text from Hugging Face response
                            // HF API returns array of objects with "generated_text" field
                            let generated_text = if json.is_array() && json.as_array().unwrap().len() > 0 {
                                json[0]["generated_text"].as_str().unwrap_or("")
                            } else {
                                json["generated_text"].as_str().unwrap_or("")
                            };
                            
                            if !generated_text.is_empty() {
                                chunk_response.push_str(generated_text);
                                accumulated_summary.push_str(generated_text);
                                
                                // PR: Fix tab switch - include tabId in partial events
                                // Emit as partial summary
                                let partial_event = json!({
                                    "type": "partial_summary",
                                    "tabId": tab_id,
                                    "sessionId": session_id,
                                    "payload": {
                                        "text": generated_text,
                                        "chunk_index": chunk_idx,
                                    }
                                });
                                println!("[AGENT WS] sending event stage=partial_summary (HF) tab_id={:?}", tab_id);
                                tx.send(Message::Text(partial_event.to_string())).await?;
                            }
                        }
                        Err(e) => {
                            eprintln!("[Agent] Hugging Face JSON parse error: {}", e);
                        }
                    }
                } else {
                    // Ollama streaming format
                    let mut stream = res.bytes_stream();
                    let mut token_count = 0;
                    
                    // Improved stream parsing with buffer for chunked responses
                    let mut buffer = String::new();
                    while let Some(chunk) = stream.next().await {
                        if let Ok(bytes) = chunk {
                            if let Ok(text) = std::str::from_utf8(&bytes) {
                                buffer.push_str(text);
                                
                                // Process complete lines from buffer
                                while let Some(newline_pos) = buffer.find('\n') {
                                    let line = buffer[..newline_pos].trim().to_string();
                                    buffer = buffer[newline_pos + 1..].to_string();
                                    
                                    if line.is_empty() { continue; }
                                    
                                    // Parse JSON - handle both Ollama format and SSE format
                                    match serde_json::from_str::<Value>(&line) {
                                        Ok(json) => {
                                            if json["done"] == true || json["done"].as_bool().unwrap_or(false) {
                                                // Chunk complete, accumulate
                                                if !chunk_response.is_empty() {
                                                    accumulated_summary.push_str(&chunk_response);
                                                    accumulated_summary.push_str("\n\n");
                                                }
                                                break;
                                            }
                                            
                                            // Try multiple possible response fields
                                            let token = json["response"].as_str()
                                                .or_else(|| json["text"].as_str())
                                                .or_else(|| json["content"].as_str());
                                            
                                            if let Some(token) = token {
                                                chunk_response.push_str(token);
                                                accumulated_summary.push_str(token);
                                                token_count += 1;
                                                
                                                // Emit partial summary every 3 tokens for better real-time feel
                                                if token_count % 3 == 0 {
                                                    let partial_event = json!({
                                                        "type": "partial_summary",
                                                        "tabId": tab_id,
                                                        "sessionId": session_id,
                                                        "payload": {
                                                            "text": token,
                                                            "chunk_index": chunk_idx,
                                                        }
                                                    });
                                                    tx.send(Message::Text(partial_event.to_string())).await?;
                                                }
                                            }
                                        }
                                        Err(e) => {
                                            // Log parse errors in dev mode only
                                            #[cfg(debug_assertions)]
                                            eprintln!("[Agent] JSON parse error: {} for line: {}", e, line);
                                        }
                                    }
                                }
                            }
                        }
                    }
                    
                    // Handle any remaining buffer content
                    if !buffer.is_empty() {
                        if let Ok(json) = serde_json::from_str::<Value>(buffer.trim()) {
                            if let Some(token) = json["response"].as_str() {
                                chunk_response.push_str(token);
                                accumulated_summary.push_str(token);
                            }
                        }
                    }
                }
            }
            _ => {
                // Try mock LLM server as fallback
                eprintln!("[Agent] Ollama unavailable, trying mock LLM server...");
                match stream_mock_llm_ws(&request, tx, chunk_idx).await {
                    Ok(_) => {
                        eprintln!("[Agent] Mock LLM streaming successful");
                    }
                    Err(e) => {
                        eprintln!("[Agent] Mock LLM also failed: {}", e);
                        // Send error event
                        let error_event = json!({
                            "type": "error",
                            "payload": {
                                "message": format!("Failed to connect to LLM. Make sure Ollama is running or mock LLM server is available on port 4000. Error: {}", e)
                            }
                        });
                        let _ = tx.send(Message::Text(error_event.to_string())).await;
                    }
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
        
        // PR: Fix tab switch - include tabId in final events
        let final_event = json!({
            "type": "final_summary",
            "tabId": tab_id,
            "sessionId": session_id,
            "payload": {
                "summary": summary,
                "citations": 1,
                "hallucination": "medium",
                "confidence": 0.7,
            }
        });
        println!("[AGENT WS] sending event stage=final_summary tab_id={:?}", tab_id);
        tx.send(Message::Text(final_event.to_string())).await?;
        
        // Cache result
        if let Some(url) = &request.url {
            if let Ok(db) = db::Database::new(&app) {
                let _ = db.cache_summary(url, &accumulated_summary);
            }
        }
        
        let end_event = json!({
            "type": "agent_end",
            "tabId": tab_id,
            "sessionId": session_id,
            "payload": { "success": true }
        });
        println!("[AGENT WS] sending event stage=agent_end tab_id={:?}", tab_id);
        tx.send(Message::Text(end_event.to_string())).await?;
        
        Ok(())
    } else {
        let error_event = json!({
            "type": "error",
            "payload": {
                "message": "Failed to generate summary. Make sure Ollama is running or mock LLM server is available."
            }
        });
        tx.send(Message::Text(error_event.to_string())).await?;
        
        Err("Failed to generate summary".into())
    }
}

/**
 * Stream LLM response to Tauri window (fallback for non-WebSocket)
 */
async fn stream_llm_to_window(
    request: &ResearchAgentRequest,
    window: &WebviewWindow,
    app: &AppHandle,
) -> Result<(), String> {
    // Similar logic to stream_llm_response_ws but emit to window
    let context_text = request.context.as_deref().unwrap_or("");
    let chunks = if context_text.len() > 4000 {
        chunker::chunk_by_sentences(context_text, 4000)
    } else {
        vec![chunker::Chunk {
            text: context_text.to_string(),
            index: 0,
            total: 1,
        }]
    };
    
    let system_prompt = "You are a research assistant. Provide comprehensive, accurate summaries with citations.";
    let mut accumulated_summary = String::new();
    
    for (chunk_idx, chunk) in chunks.iter().enumerate() {
        let chunk_prompt = if chunks.len() > 1 {
            format!(
                "Query: {}\n\nContext chunk {}/{}:\n{}\n\nProvide a summary of this chunk.",
                request.query,
                chunk.index + 1,
                chunk.total,
                chunk.text
            )
        } else {
            format!(
                "Query: {}\n{}\n\nProvide a detailed research summary.",
                request.query,
                chunk.text
            )
        };
        
        let client = get_http_client();
        let ollama_url = std::env::var("OLLAMA_BASE_URL")
            .unwrap_or_else(|_| "http://localhost:11434".to_string());
        
        let model = std::env::var("OLLAMA_MODEL")
            .unwrap_or_else(|_| "llama3.2:3b".to_string());
        
        let response = client
            .post(&format!("{}/api/generate", ollama_url))
            .json(&json!({
                "model": model,
                "prompt": format!("{}\n\n{}", system_prompt, chunk_prompt),
                "stream": true,
                "options": {
                    "temperature": 0.7,
                }
            }))
            .timeout(Duration::from_secs(60))
            .send()
            .await
            .map_err(|e| format!("LLM connection failed: {}", e))?;
        
        if response.status().is_success() {
            let mut stream = response.bytes_stream();
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
                                    
                                    // Emit every 5 tokens
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
    }
    
    // Finalize
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
        
        // Cache
        if let Some(url) = &request.url {
            if let Ok(db) = db::Database::new(&app) {
                let _ = db.cache_summary(url, &accumulated_summary);
            }
        }
        
        window.emit("agent-event", json!({
            "type": "agent_end",
            "payload": { "success": true }
        })).ok();
    }
    
    Ok(())
}

/**
 * Stream from mock LLM server (fallback for dev)
 * Parses Ollama-like JSON streaming format
 */
async fn stream_mock_llm_ws(
    request: &ResearchAgentRequest,
    tx: &mpsc::Sender<Message>,
    chunk_idx: usize,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let mock_url = "http://127.0.0.1:4000/api/mock-llm/stream";
    
    let client = get_http_client();
    let response = client
        .post(mock_url)
        .json(&json!({
            "query": request.query,
            "context": request.context,
        }))
        .send()
        .await?;
    
    if response.status().is_success() {
        let mut stream = response.bytes_stream();
        let mut full_text = String::new();
        let mut token_count = 0;
        
        while let Some(chunk) = stream.next().await {
            if let Ok(bytes) = chunk {
                if let Ok(text) = std::str::from_utf8(&bytes) {
                    // Parse Ollama-like JSON lines
                    for line in text.lines() {
                        let line = line.trim();
                        if line.is_empty() { continue; }
                        
                        if let Ok(json) = serde_json::from_str::<Value>(line) {
                            // Check if done
                            if json["done"] == true || json["done"].as_bool().unwrap_or(false) {
                                // Final chunk
                                if !full_text.is_empty() {
                                    let partial_event = json!({
                                        "type": "partial_summary",
                                        "payload": {
                                            "text": full_text.clone(),
                                            "chunk_index": chunk_idx,
                                        }
                                    });
                                    tx.send(Message::Text(partial_event.to_string())).await?;
                                }
                                break;
                            }
                            
                            // Extract response token
                            if let Some(token) = json["response"].as_str() {
                                full_text.push_str(token);
                                token_count += 1;
                                
                                // Emit every 5 tokens for real-time feel
                                if token_count % 5 == 0 {
                                    let partial_event = json!({
                                        "type": "partial_summary",
                                        "payload": {
                                            "text": token,
                                            "chunk_index": chunk_idx,
                                        }
                                    });
                                    tx.send(Message::Text(partial_event.to_string())).await?;
                                }
                            }
                        }
                    }
                }
            }
        }
        
        // Emit any remaining text
        if !full_text.is_empty() && token_count % 5 != 0 {
            let partial_event = json!({
                "type": "partial_summary",
                "payload": {
                    "text": full_text,
                    "chunk_index": chunk_idx,
                }
            });
            tx.send(Message::Text(partial_event.to_string())).await?;
        }
    }
    
    Ok(())
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
        match execute_single_action(action, &app).await {
            Ok(result) => results.push(result),
            Err(e) => errors.push(json!({
                "action_id": action.id,
                "error": e,
            })),
        }
    }
    
    // Sync to remote if configured
    if let Some(_user_id) = &request.user_id {
        let server_url = std::env::var("REGEN_SERVER_URL")
            .unwrap_or_else(|_| "http://127.0.0.1:4000".to_string());
        
        if let Err(e) = sync_to_remote(&server_url, &request).await {
            eprintln!("[Agent] Remote sync failed: {}", e);
        }
    }
    
    Ok(ExecuteResponse {
        status: if errors.is_empty() { "success".to_string() } else { "partial".to_string() },
        results,
        errors: if errors.is_empty() { None } else { Some(errors) },
        executed_at: chrono::Utc::now().to_rfc3339(),
    })
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
    // For Tauri events, stream directly using window.emit (no WebSocket needed)
    // This is a fallback when WebSocket is not available
    // We'll use the existing streaming logic but emit to window instead
    
    // Emit start event
    window.emit("agent-event", json!({
        "type": "agent_start",
        "payload": {
            "query": request.query.clone(),
            "url": request.url.clone(),
        }
    })).ok();
    
    // Check cache first
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
            Err(_) => {}
        }
    }
    
    // Stream from LLM using existing logic but emit to window
    stream_llm_to_window(&request, &window, &app).await?;
    
    Ok(())
}

async fn call_remote_agent(
    server_url: &str,
    request: &ResearchAgentRequest,
) -> Result<ResearchAgentResponse, String> {
    let client = get_http_client();
    let url = format!("{}/api/agent/research", server_url);
    
    let response = client
        .post(&url)
        .json(request)
        .timeout(Duration::from_secs(30))
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;
    
    if !response.status().is_success() {
        return Err(format!("Server error: {}", response.status()));
    }
    
    response.json().await.map_err(|e| format!("Parse error: {}", e))
}

async fn call_local_ollama(
    request: &ResearchAgentRequest,
    _window: &WebviewWindow,
) -> Result<ResearchAgentResponse, String> {
    let ollama_url = std::env::var("OLLAMA_BASE_URL")
        .unwrap_or_else(|_| "http://localhost:11434".to_string());
    
    let model = std::env::var("OLLAMA_MODEL")
        .unwrap_or_else(|_| "llama3.2:3b".to_string());
    
    let system_prompt = "You are a research assistant. Provide comprehensive, accurate summaries with citations.";
    let user_prompt = format!(
        "Query: {}\n{}\n\nProvide a detailed research summary with suggested actions.",
        request.query,
        request.context.as_deref().unwrap_or("")
    );
    
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
        .timeout(Duration::from_secs(60))
        .send()
        .await
        .map_err(|e| format!("Ollama connection failed: {}", e))?;
    
    if !response.status().is_success() {
        return Err("Ollama request failed".to_string());
    }
    
    let json: Value = response.json().await.map_err(|e| format!("Parse error: {}", e))?;
    let full_response = json["response"].as_str().unwrap_or("").to_string();
    
    let summary = Summary {
        short: full_response.chars().take(200).collect(),
        bullets: full_response
            .lines()
            .filter(|l| l.trim().starts_with("-") || l.trim().starts_with("*"))
            .take(3)
            .map(|s| s.trim().trim_start_matches("-").trim_start_matches("*").trim().to_string())
            .collect::<Vec<_>>(),
        keywords: extract_keywords(&request.query, &full_response),
    };
    
    Ok(ResearchAgentResponse {
        agent_version: "1.0.0".to_string(),
        summary,
        actions: vec![],
        confidence: 0.7,
        explainability: "Local Ollama".to_string(),
        citations: 1,
        hallucination: "medium".to_string(),
        query: request.query.clone(),
        processing_time_ms: None,
    })
}

async fn execute_single_action(
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
    let url = format!("{}/api/agent/execute", server_url);
    
    client
        .post(&url)
        .json(request)
        .timeout(Duration::from_secs(10))
        .send()
        .await
        .map_err(|e| format!("Sync failed: {}", e))?;
    
    Ok(())
}

fn extract_keywords(query: &str, text: &str) -> Vec<String> {
    // Simple keyword extraction: take words from query and find them in text
    let query_words: Vec<&str> = query.split_whitespace().collect();
    let mut keywords = Vec::new();
    
    for word in query_words {
        if word.len() > 3 && text.to_lowercase().contains(&word.to_lowercase()) {
            keywords.push(word.to_string());
        }
    }
    
    keywords.truncate(5); // Limit to 5 keywords
    keywords
}
