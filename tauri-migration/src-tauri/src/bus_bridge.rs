/**
 * Realtime Bus Bridge
 * Connects Tauri to WebSocket message bus
 * PR: Tauri-bus integration
 */

use tauri::{Window, Emitter, Listener};
use serde_json::{json, Value};
use tokio::sync::mpsc;
use std::sync::Arc;
use tokio::sync::Mutex;

#[allow(dead_code)]
pub struct BusBridge {
    bus_url: String,
    ws_client: Option<Arc<Mutex<tokio_tungstenite::WebSocketStream<tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>>>>>,
    window: Option<Window>,
    message_tx: Option<mpsc::UnboundedSender<Value>>,
}

#[allow(dead_code)]
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
    #[allow(dead_code)]
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
#[allow(dead_code)]
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
#[allow(dead_code)]
pub fn setup_content_listener(window: Window) {
    // Listen for postMessage from content scripts
    let window_clone = window.clone();
    window.listen("regen:extract", move |event| {
        // Get payload - event.payload() returns &str in Tauri 2.x, parse to Value
        if let Ok(payload) = serde_json::from_str::<Value>(event.payload()) {
            // Forward to bus
            let mut bridge = BusBridge::new("ws://localhost:4002".to_string());
            let window_for_task = window_clone.clone();
            bridge.set_window(window_for_task);
            
            // Spawn async task
            tauri::async_runtime::spawn(async move {
                if let Err(e) = bridge.publish("agent.requests", payload).await {
                    eprintln!("[BusBridge] Failed to publish extraction: {}", e);
                }
            });
        } else {
            eprintln!("[BusBridge] Failed to parse event payload as JSON");
        }
    });
}

