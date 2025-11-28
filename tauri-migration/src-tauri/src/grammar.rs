/**
 * Grammar Correction Module
 * Real-time Grammarly-level correction for any input field
 */

use crate::ollama;

/// Correct text using Ollama (phi3:mini for grammar)
pub async fn correct_text(text: String) -> Result<String, String> {
    if text.trim().len() < 3 {
        return Ok(text); // Too short to correct
    }

    let prompt = format!(
        "Fix grammar, spelling, and make it sound professional. Only return the corrected text, nothing else:\n\n{}",
        text
    );

    match ollama::generate_text("phi3:mini", &prompt).await {
        Ok(corrected) => {
            let trimmed = corrected.trim();
            // Only return if different (avoid unnecessary changes)
            if trimmed != text.trim() && trimmed.len() > 0 {
                Ok(trimmed.to_string())
            } else {
                Ok(text)
            }
        }
        Err(e) => {
            // Fallback: return original text if correction fails
            eprintln!("[Grammar] Correction failed: {}", e);
            Ok(text)
        }
    }
}

/// Quick grammar check (faster, less accurate)
pub async fn quick_correct(text: String) -> Result<String, String> {
    // For very short text, use simple rules
    if text.len() < 10 {
        return Ok(text);
    }

    // Use full correction for longer text
    correct_text(text).await
}

