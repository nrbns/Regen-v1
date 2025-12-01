// Page Text Extractor - Server-side HTML extraction
// Handles cross-origin safe text extraction for agent processing

use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::time::Duration;

#[derive(Debug, Serialize, Deserialize)]
pub struct ExtractedPage {
    pub url: String,
    pub title: String,
    pub text: String,
    pub html_hash: String, // For caching
    pub word_count: usize,
}

/// Extract text from a URL (server-side, cross-origin safe)
pub async fn extract_page_text(url: &str) -> Result<ExtractedPage, String> {
    let client = Client::builder()
        .timeout(Duration::from_secs(10))
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    // Fetch HTML
    let response = client
        .get(url)
        .send()
        .await
        .map_err(|e| format!("Failed to fetch URL: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("HTTP error: {}", response.status()));
    }

    let html = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    // Calculate hash for caching
    let html_hash = format!("{:x}", md5::compute(&html));

    // Extract title
    let title = extract_title(&html).unwrap_or_else(|| {
        reqwest::Url::parse(url)
            .ok()
            .and_then(|u| u.host_str().map(|s| s.to_string()))
            .unwrap_or_else(|| "Untitled".to_string())
    });

    // Extract clean text (simple approach - in production use Readability or similar)
    let text = extract_clean_text(&html);
    
    // PR: Fix tab switch - return proper error if text is empty
    if text.trim().is_empty() {
        return Err(format!("No text content found at URL: {}", url));
    }
    
    let word_count = text.split_whitespace().count();

    Ok(ExtractedPage {
        url: url.to_string(),
        title,
        text,
        html_hash,
        word_count,
    })
}

/// Extract title from HTML
fn extract_title(html: &str) -> Option<String> {
    // Simple regex-free extraction
    if let Some(start) = html.find("<title>") {
        if let Some(end) = html[start..].find("</title>") {
            let title = &html[start + 7..start + end];
            return Some(decode_html_entities(title.trim()));
        }
    }
    None
}

/// Extract clean text from HTML (basic implementation)
fn extract_clean_text(html: &str) -> String {
    // Remove script and style tags
    let mut text = html.to_string();
    
    // Remove script tags
    while let Some(start) = text.find("<script") {
        if let Some(end) = text[start..].find("</script>") {
            text.replace_range(start..start + end + 9, "");
        } else {
            break;
        }
    }
    
    // Remove style tags
    while let Some(start) = text.find("<style") {
        if let Some(end) = text[start..].find("</style>") {
            text.replace_range(start..start + end + 8, "");
        } else {
            break;
        }
    }
    
    // Extract text between tags
    let mut result = String::new();
    let mut in_tag = false;
    let mut in_text = false;
    
    for ch in text.chars() {
        match ch {
            '<' => {
                in_tag = true;
                if in_text {
                    result.push(' ');
                    in_text = false;
                }
            }
            '>' => {
                in_tag = false;
                in_text = true;
            }
            _ if !in_tag => {
                if ch.is_whitespace() {
                    if in_text {
                        result.push(' ');
                        in_text = false;
                    }
                } else {
                    result.push(ch);
                    in_text = true;
                }
            }
            _ => {}
        }
    }
    
    // Clean up whitespace
    result
        .lines()
        .map(|l| l.trim())
        .filter(|l| !l.is_empty())
        .collect::<Vec<_>>()
        .join(" ")
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

/// Decode basic HTML entities
fn decode_html_entities(text: &str) -> String {
    text.replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
        .replace("&nbsp;", " ")
}

