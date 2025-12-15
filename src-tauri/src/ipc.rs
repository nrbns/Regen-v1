// IPC Message Types and Handlers
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct IPCMessage {
    pub id: String,
    pub method: String,
    pub params: serde_json::Value,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct IPCResponse {
    pub id: String,
    pub result: serde_json::Value,
    pub error: Option<String>,
}
