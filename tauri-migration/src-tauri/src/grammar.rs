/**
 * Grammar Correction Module
 * Real-time Grammarly-level correction for any input field
 */

use crate::ollama;

/// Correct text using Ollama (phi3:mini for grammar)
/// Optimized: Only corrects text >15 chars to reduce delays
pub async fn correct_text(text: String) -> Result<String, String> {
    // Throttle: Only correct if >15 chars (reduces 3-5s delays)
    if text.trim().len() < 15 {
        return Ok(text); // Too short to correct
    }

    // Quick check: Skip if text looks correct (simple heuristics)
    if text.chars().all(|c| c.is_alphanumeric() || c.is_whitespace() || ",.!?".contains(c)) {
        // Basic validation - if it looks fine, skip expensive LLM call
        let word_count = text.split_whitespace().count();
        if word_count < 5 {
            return Ok(text);
        }
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
#[allow(dead_code)]
pub async fn quick_correct(text: String) -> Result<String, String> {
    // For very short text, use simple rules
    if text.len() < 10 {
        return Ok(text);
    }

    // Use full correction for longer text
    correct_text(text).await
}

