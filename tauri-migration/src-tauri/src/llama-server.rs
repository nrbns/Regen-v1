/**
 * Local llama.cpp Server
 * Runs llama-server locally and exposes WebSocket API
 */

use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::sync::{Arc, Mutex};
use tauri::State;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerStatus {
    running: bool,
    port: Option<u16>,
    model_loaded: bool,
    model_name: Option<String>,
}

pub struct LlamaServerManager {
    process: Option<std::process::Child>,
    port: u16,
    model_path: Option<PathBuf>,
}

impl LlamaServerManager {
    pub fn new() -> Self {
        Self {
            process: None,
            port: 8080, // Default port
            model_path: None,
        }
    }

    /// Start llama-server process
    pub fn start_server(&mut self, model_path: PathBuf) -> Result<ServerStatus, String> {
        if self.process.is_some() {
            return Err("Server already running".to_string());
        }

        if !model_path.exists() {
            return Err(format!("Model file not found: {}", model_path.display()));
        }

        // Try to find llama-server binary
        let llama_server_path = self.find_llama_server()?;

        // Start llama-server process
        let mut cmd = Command::new(llama_server_path);
        cmd.args([
            "--model",
            model_path.to_str().unwrap(),
            "--port",
            &self.port.to_string(),
            "--n-threads",
            "4", // Use 4 threads
        ]);
        cmd.stdout(Stdio::null());
        cmd.stderr(Stdio::null());

        match cmd.spawn() {
            Ok(child) => {
                self.process = Some(child);
                self.model_path = Some(model_path.clone());

                // Wait a bit for server to start
                std::thread::sleep(std::time::Duration::from_secs(2));

                Ok(ServerStatus {
                    running: true,
                    port: Some(self.port),
                    model_loaded: true,
                    model_name: Some(
                        model_path
                            .file_name()
                            .unwrap()
                            .to_string_lossy()
                            .to_string(),
                    ),
                })
            }
            Err(e) => Err(format!("Failed to start server: {}", e)),
        }
    }

    /// Stop server
    pub fn stop_server(&mut self) -> Result<(), String> {
        if let Some(mut child) = self.process.take() {
            child.kill().map_err(|e| format!("Failed to stop server: {}", e))?;
            self.model_path = None;
            Ok(())
        } else {
            Err("Server not running".to_string())
        }
    }

    /// Get server status
    pub fn get_status(&self) -> ServerStatus {
        ServerStatus {
            running: self.process.is_some(),
            port: if self.process.is_some() { Some(self.port) } else { None },
            model_loaded: self.model_path.is_some(),
            model_name: self
                .model_path
                .as_ref()
                .and_then(|p| p.file_name())
                .map(|n| n.to_string_lossy().to_string()),
        }
    }

    /// Find llama-server binary
    fn find_llama_server(&self) -> Result<PathBuf, String> {
        // Check common locations
        let mut possible_paths = vec![
            PathBuf::from("llama-server"),
            PathBuf::from("./llama-server"),
            PathBuf::from("llama-server.exe"),
            PathBuf::from("./llama-server.exe"),
        ];
        
        // Check in bundled location
        if let Ok(exe) = std::env::current_exe() {
            if let Some(parent) = exe.parent() {
                possible_paths.push(parent.join("llama-server"));
                possible_paths.push(parent.join("llama-server.exe"));
            }
        }

        for path in possible_paths {
            if path.exists() {
                return Ok(path);
            }
        }
        
        // Try to find in PATH
        if let Ok(output) = Command::new("which").arg("llama-server").output() {
            if output.status.success() {
                if let Ok(path_str) = String::from_utf8(output.stdout) {
                    return Ok(PathBuf::from(path_str.trim()));
                }
            }
        }

        Err("llama-server binary not found. Please install llama.cpp or provide path.".to_string())
    }
}

/// Tauri command: Start local llama server
#[tauri::command]
pub async fn start_llama_server(
    model_path: String,
    state: State<'_, Arc<Mutex<LlamaServerManager>>>,
) -> Result<ServerStatus, String> {
    let mut manager = state.lock().map_err(|e| format!("Lock error: {}", e))?;
    let path = PathBuf::from(model_path);
    manager.start_server(path)
}

/// Tauri command: Stop llama server
#[tauri::command]
pub async fn stop_llama_server(
    state: State<'_, Arc<Mutex<LlamaServerManager>>>,
) -> Result<(), String> {
    let mut manager = state.lock().map_err(|e| format!("Lock error: {}", e))?;
    manager.stop_server()
}

/// Tauri command: Get server status
#[tauri::command]
pub async fn get_llama_server_status(
    state: State<'_, Arc<Mutex<LlamaServerManager>>>,
) -> Result<ServerStatus, String> {
    let manager = state.lock().map_err(|e| format!("Lock error: {}", e))?;
    Ok(manager.get_status())
}


