// Page Text Extractor - Production-Ready Cross-Origin Safe Extraction
// Handles robust HTML->text conversion with caching support

use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::time::Duration;
use md5;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ExtractedPage {
    pub url: String,
    pub title: String,
    pub text: String,
    pub html_hash: String, // For cache key generation
    pub word_count: usize,
    pub extracted_at: String,
}

/// Extract clean text from a URL (server-side, cross-origin safe)
/// Returns deterministic, clean text suitable for chunking and streaming
/// This is an improved version with better HTML cleaning and caching support
pub async fn extract_page_text_improved(url: String) -> Result<ExtractedPage, String> {
    let client = Client::builder()
        .timeout(Duration::from_secs(15))
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    // Fetch HTML
    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Failed to fetch URL: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("HTTP error: {}", response.status()));
    }

    let html = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response body: {}", e))?;

    // Generate hash for caching
    let html_hash = format!("{:x}", md5::compute(&html));

    // Extract title (simple regex-free approach)
    let title = extract_title(&html).unwrap_or_else(|| "Untitled".to_string());

    // Clean HTML to text (simple but effective)
    let text = clean_html_to_text(&html);

    let word_count = text.split_whitespace().count();

    Ok(ExtractedPage {
        url,
        title,
        text,
        html_hash,
        word_count,
        extracted_at: chrono::Utc::now().to_rfc3339(),
    })
}

/// Extract title from HTML
fn extract_title(html: &str) -> Option<String> {
    // Look for <title> tag
    if let Some(start) = html.find("<title>") {
        if let Some(end) = html[start..].find("</title>") {
            let title = &html[start + 7..start + end];
            return Some(decode_html_entities(title.trim()));
        }
    }
    
    // Fallback: look for <h1>
    if let Some(start) = html.find("<h1") {
        if let Some(content_start) = html[start..].find('>') {
            if let Some(end) = html[start + content_start..].find("</h1>") {
                let h1 = &html[start + content_start + 1..start + content_start + end];
                return Some(clean_text(h1));
            }
        }
    }
    
    None
}

/// Clean HTML to plain text (simple but effective)
fn clean_html_to_text(html: &str) -> String {
    let mut text = html.to_string();
    
    // Remove script and style tags
    let script_pattern = regex::Regex::new(r"(?s)<script[^>]*>.*?</script>").unwrap();
    text = script_pattern.replace_all(&text, "").to_string();
    
    let style_pattern = regex::Regex::new(r"(?s)<style[^>]*>.*?</style>").unwrap();
    text = style_pattern.replace_all(&text, "").to_string();
    
    // Remove HTML comments
    let comment_pattern = regex::Regex::new(r"(?s)<!--.*?-->").unwrap();
    text = comment_pattern.replace_all(&text, "").to_string();
    
    // Replace common block elements with newlines
    let block_pattern = regex::Regex::new(r"</?(?:p|div|h[1-6]|li|br|tr|td)[^>]*>").unwrap();
    text = block_pattern.replace_all(&text, "\n").to_string();
    
    // Remove all remaining HTML tags
    let tag_pattern = regex::Regex::new(r"<[^>]+>").unwrap();
    text = tag_pattern.replace_all(&text, "").to_string();
    
    // Decode HTML entities
    text = decode_html_entities(&text);
    
    // Clean whitespace
    clean_text(&text)
}

/// Decode common HTML entities
fn decode_html_entities(text: &str) -> String {
    text.replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
        .replace("&nbsp;", " ")
        .replace("&copy;", "©")
        .replace("&reg;", "®")
}

/// Clean and normalize whitespace
fn clean_text(text: &str) -> String {
    let lines: Vec<&str> = text.lines()
        .map(|l| l.trim())
        .filter(|l| !l.is_empty())
        .collect();
    
    lines.join("\n")
}

