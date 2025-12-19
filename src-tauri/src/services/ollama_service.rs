// Ollama Service - Auto-start and model management
use std::env;
use std::process::{Command, Child};
use std::time::Duration;
use std::thread;

pub struct OllamaService {
    process: Option<Child>,
}

impl OllamaService {
    pub fn new() -> Self {
        OllamaService { process: None }
    }

    /// Start Ollama service with CORS enabled
    pub fn start(&mut self) -> Result<(), String> {
        // Allow CORS access
        env::set_var("OLLAMA_ORIGINS", "*");
        env::set_var("OLLAMA_HOST", "127.0.0.1:11434");

        let ollama_path = if cfg!(windows) {
            // Try bundled ollama.exe first, then system PATH
            std::path::PathBuf::from("./bin/ollama.exe")
                .canonicalize()
                .or_else(|_| {
                    // Fallback to system PATH
                    which::which("ollama").map_err(|e| format!("{:?}", e))
                })
                .map_err(|e| format!("Ollama not found: {:?}", e))?
        } else {
            which::which("ollama").map_err(|e| format!("Ollama not found: {:?}", e))?
        };

        // Check if Ollama already running
        if self.check_running() {
            println!("[OllamaService] Ollama already running");
            return Ok(());
        }

        // Start Ollama process
        let child = Command::new(&ollama_path)
            .env("OLLAMA_ORIGINS", "*")
            .env("OLLAMA_HOST", "127.0.0.1:11434")
            .spawn()
            .map_err(|e| format!("Failed to start Ollama: {}", e))?;

        println!("[OllamaService] Started Ollama process");
        self.process = Some(child);

        // Wait for Ollama to be ready
        self.wait_ready()?;

        // Pull required models
        self.pull_models()?;

        Ok(())
    }

    /// Check if Ollama is already running
    fn check_running(&self) -> bool {
        match std::net::TcpStream::connect("127.0.0.1:11434") {
            Ok(_) => {
                println!("[OllamaService] Ollama is running");
                true
            }
            Err(_) => false,
        }
    }

    /// Wait for Ollama to be ready
    fn wait_ready(&self) -> Result<(), String> {
        for i in 0..60 {
            if self.check_running() {
                println!("[OllamaService] Ollama ready after {} seconds", i);
                return Ok(());
            }
            thread::sleep(Duration::from_millis(500));
        }
        Err("Ollama did not start in time".to_string())
    }

    /// Pull required models
    fn pull_models(&self) -> Result<(), String> {
        let models = vec!["phi3:mini", "llava:7b"];

        for model in models {
            println!("[OllamaService] Pulling model: {}", model);

            let output = Command::new("ollama")
                .args(&["pull", model])
                .output()
                .map_err(|e| format!("Failed to pull {}: {}", model, e))?;

            if !output.status.success() {
                let stderr = String::from_utf8_lossy(&output.stderr);
                println!("[OllamaService] Failed to pull {}: {}", model, stderr);
                // Don't fail, just warn
            } else {
                println!("[OllamaService] Successfully pulled {}", model);
            }
        }

        Ok(())
    }

    /// Stop Ollama service
    pub fn stop(&mut self) -> Result<(), String> {
        if let Some(mut process) = self.process.take() {
            process.kill().map_err(|e| format!("Failed to kill Ollama: {}", e))?;
            println!("[OllamaService] Stopped Ollama");
        }
        Ok(())
    }
}

impl Drop for OllamaService {
    fn drop(&mut self) {
        let _ = self.stop();
    }
}
