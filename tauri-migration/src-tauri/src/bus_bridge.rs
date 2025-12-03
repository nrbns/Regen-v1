/**
 * Realtime Bus Bridge
 * Connects Tauri to WebSocket message bus
 * PR: Tauri-bus integration
 */

use tauri::{Window, Manager};
use serde_json::{json, Value};
use tokio::sync::mpsc;
use std::sync::Arc;
use tokio::sync::Mutex;

pub struct BusBridge {
    bus_url: String,
    ws_client: Option<Arc<Mutex<tokio_tungstenite::WebSocketStream<tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>>>>>,
    window: Option<Window>,
    message_tx: Option<mpsc::UnboundedSender<Value>>,
}

impl BusBridge {
    pub fn new(bus_url: String) -> Self {
        Self {
            bus_url,
            ws_client: None,
            window: None,
            message_tx: None,
        }
    }

    pub fn set_window(&mut self, window: Window) {
        self.window = Some(window);
    }

    /// Connect to bus
    pub async fn connect(&mut self) -> Result<(), String> {
        // In production, use tokio_tungstenite for WebSocket
        // For now, emit events that frontend can pick up
        eprintln!("[BusBridge] Connecting to bus: {}", self.bus_url);
        Ok(())
    }

    /// Publish message to bus
    pub async fn publish(&self, channel: &str, data: Value) -> Result<(), String> {
        if let Some(window) = &self.window {
            // Emit to frontend, which will forward to bus
            window.emit("bus:publish", json!({
                "channel": channel,
                "data": data,
            })).map_err(|e| format!("Failed to emit: {}", e))?;
        }
        Ok(())
    }

    /// Subscribe to channel
    pub async fn subscribe(&self, channel: &str) -> Result<(), String> {
        if let Some(window) = &self.window {
            window.emit("bus:subscribe", json!({
                "channel": channel,
            })).map_err(|e| format!("Failed to emit: {}", e))?;
        }
        Ok(())
    }
}

/// Handle content extraction from CEF
#[tauri::command]
pub async fn handle_content_extraction(
    extraction: Value,
    window: Window,
) -> Result<(), String> {
    // Publish to bus via bridge
    let mut bridge = BusBridge::new("ws://localhost:4002".to_string());
    bridge.set_window(window);
    bridge.publish("agent.requests", extraction).await?;
    Ok(())
}

/// Listen for content script messages
pub fn setup_content_listener(window: Window) {
    // Listen for postMessage from content scripts
    window.listen("regen:extract", move |event| {
        if let Some(payload) = event.payload() {
            // Forward to bus
            let mut bridge = BusBridge::new("ws://localhost:4002".to_string());
            bridge.set_window(window.clone());
            
            // Spawn async task
            tauri::async_runtime::spawn(async move {
                if let Err(e) = bridge.publish("agent.requests", payload).await {
                    eprintln!("[BusBridge] Failed to publish extraction: {}", e);
                }
            });
        }
    });
}

