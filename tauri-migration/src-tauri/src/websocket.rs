// WebSocket Server for Real-time Agent Streaming
// Listens on ws://127.0.0.1:18080/agent_ws

use tokio::net::{TcpListener, TcpStream};
use tokio_tungstenite::{accept_async, tungstenite::Message};
use futures_util::{SinkExt, StreamExt};
use serde_json::{json, Value};
use std::sync::Arc;
use tokio::sync::Mutex;
use std::collections::HashMap;
use uuid::Uuid;

use crate::agent::stream_agent_to_websocket;

// Active WebSocket connections
type Connections = Arc<Mutex<HashMap<String, tokio::sync::mpsc::Sender<Message>>>>;

#[derive(Debug, Clone)]
pub struct AgentContext {
    pub query: String,
    pub url: Option<String>,
    pub context: Option<String>,
    pub mode: Option<String>,
    pub session_id: Option<String>,
    // PR: Fix tab switch - track which tab this agent operation belongs to
    pub tab_id: Option<String>,
}

/// Start WebSocket server on port 18080
pub async fn start_websocket_server(app: tauri::AppHandle) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let addr = "127.0.0.1:18080";
    let listener = TcpListener::bind(addr).await?;
    
    println!("[WebSocket] Server listening on ws://{}/agent_ws", addr);
    
    let connections: Connections = Arc::new(Mutex::new(HashMap::new()));
    
    while let Ok((stream, _)) = listener.accept().await {
        let connections_clone = connections.clone();
        let app_clone = app.clone();
        
        tokio::spawn(async move {
            if let Err(e) = handle_connection(stream, connections_clone, app_clone).await {
                eprintln!("[WebSocket] Connection error: {}", e);
            }
        });
    }
    
    Ok(())
}

/// Handle individual WebSocket connection
async fn handle_connection(
    stream: TcpStream,
    connections: Connections,
    app: tauri::AppHandle,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let ws_stream = accept_async(stream).await?;
    let (mut ws_sender, mut ws_receiver) = ws_stream.split();
    
    let connection_id = Uuid::new_v4().to_string();
    
    // Create channel for sending messages to this connection
    let (tx, mut rx) = tokio::sync::mpsc::channel::<Message>(100);
    
    // Store connection
    {
        let mut conns = connections.lock().await;
        conns.insert(connection_id.clone(), tx);
    }
    
    println!("[WebSocket] Client connected: {}", connection_id);
    
    // Send welcome message
    let welcome = json!({
        "type": "connected",
        "connection_id": connection_id,
        "message": "Connected to Regen Agent WebSocket"
    });
    ws_sender.send(Message::Text(welcome.to_string())).await?;
    
    // Spawn task to forward messages from channel to WebSocket
    let mut sender_clone = ws_sender;
    tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            if sender_clone.send(msg).await.is_err() {
                break;
            }
        }
    });
    
    // Handle incoming messages
    while let Some(msg) = ws_receiver.next().await {
        match msg {
            Ok(Message::Text(text)) => {
                if let Err(e) = handle_message(&text, &connection_id, &connections, &app).await {
                    eprintln!("[WebSocket] Error handling message: {}", e);
                    
                    // Send error to client
                    let error_msg = json!({
                        "type": "error",
                        "payload": {
                            "message": format!("Error: {}", e)
                        }
                    });
                    let conns = connections.lock().await;
                    if let Some(tx) = conns.get(&connection_id) {
                        let _ = tx.send(Message::Text(error_msg.to_string())).await;
                    }
                }
            }
            Ok(Message::Close(_)) => {
                println!("[WebSocket] Client disconnected: {}", connection_id);
                break;
            }
            Err(e) => {
                eprintln!("[WebSocket] Error: {}", e);
                break;
            }
            _ => {}
        }
    }
    
    // Remove connection
    {
        let mut conns = connections.lock().await;
        conns.remove(&connection_id);
    }
    
    Ok(())
}

/// Handle incoming WebSocket message
async fn handle_message(
    text: &str,
    connection_id: &str,
    connections: &Connections,
    app: &tauri::AppHandle,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let msg: Value = serde_json::from_str(text)?;
    
    match msg["type"].as_str() {
        Some("start_agent") => {
            let ctx = AgentContext {
                query: msg["query"].as_str().unwrap_or("").to_string(),
                url: msg["url"].as_str().map(|s| s.to_string()),
                context: msg["context"].as_str().map(|s| s.to_string()),
                mode: msg["mode"].as_str().map(|s| s.to_string()),
                session_id: msg["session_id"].as_str().map(|s| s.to_string()),
                // PR: Fix tab switch - extract tabId from message
                tab_id: msg["tabId"].as_str()
                    .or_else(|| msg["tab_id"].as_str())
                    .map(|s| s.to_string()),
            };
            
            println!("[WebSocket] Received start_agent request: tab_id={:?}, session_id={:?}, url={:?}", 
                ctx.tab_id, ctx.session_id, ctx.url);
            
            // Get connection sender
            let conns = connections.lock().await;
            let tx = conns.get(connection_id).ok_or("Connection not found")?.clone();
            drop(conns);
            
            // Stream agent response
            stream_agent_to_websocket(ctx, tx, app.clone()).await?;
        }
        Some("ping") => {
            // Respond to ping
            let conns = connections.lock().await;
            if let Some(tx) = conns.get(connection_id) {
                let pong = json!({
                    "type": "pong",
                    "timestamp": chrono::Utc::now().timestamp()
                });
                let _ = tx.send(Message::Text(pong.to_string())).await;
            }
        }
        _ => {
            return Err(format!("Unknown message type: {}", msg["type"]).into());
        }
    }
    
    Ok(())
}

/// Broadcast message to all connections
#[allow(dead_code)]
pub async fn broadcast_to_all(
    connections: &Connections,
    message: Value,
) {
    let conns = connections.lock().await;
    for (_, tx) in conns.iter() {
        let _ = tx.send(Message::Text(message.to_string())).await;
    }
}

