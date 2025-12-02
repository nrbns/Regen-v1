/**
 * Phase 2 Tauri Commands
 * Language, Privacy, Document Processing, Voice, Insights
 */

use serde_json::{json, Value};
use reqwest::Client;
use std::time::Duration;

// ============================================================================
// Language Commands
// ============================================================================

#[tauri::command]
pub async fn detect_language(text: String) -> Result<Value, String> {
    // Simple heuristic detection (can be enhanced with ML model)
    use regex::Regex;
    let devanagari = Regex::new(r"[\u{0900}-\u{097F}]").unwrap();
    let tamil = Regex::new(r"[\u{0B80}-\u{0BFF}]").unwrap();
    let telugu = Regex::new(r"[\u{0C00}-\u{0C7F}]").unwrap();
    let malayalam = Regex::new(r"[\u{0D00}-\u{0D7F}]").unwrap();
    let kannada = Regex::new(r"[\u{0C80}-\u{0CFF}]").unwrap();
    let bengali = Regex::new(r"[\u{0980}-\u{09FF}]").unwrap();
    let gujarati = Regex::new(r"[\u{0A80}-\u{0AFF}]").unwrap();
    
    let detected = if devanagari.is_match(&text) {
        "hi" // Hindi/Marathi (Devanagari)
    } else if tamil.is_match(&text) {
        "ta" // Tamil
    } else if telugu.is_match(&text) {
        "te" // Telugu
    } else if malayalam.is_match(&text) {
        "ml" // Malayalam
    } else if kannada.is_match(&text) {
        "kn" // Kannada
    } else if bengali.is_match(&text) {
        "bn" // Bengali
    } else if gujarati.is_match(&text) {
        "gu" // Gujarati
    } else {
        "en" // English (default)
    };

    Ok(json!({
        "language": detected,
        "confidence": 0.8
    }))
}

#[tauri::command]
pub async fn translate_text(
    text: String,
    source_lang: String,
    target_lang: String,
) -> Result<Value, String> {
    // Use Ollama for translation if available
    let client = Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let prompt = format!(
        "Translate the following text from {} to {}: {}",
        source_lang, target_lang, text
    );

    let response = client
        .post("http://127.0.0.1:11434/api/generate")
        .json(&json!({
            "model": "llama3.2:3b",
            "prompt": prompt,
            "stream": false
        }))
        .send()
        .await
        .map_err(|e| format!("Translation request failed: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Translation failed: {}", response.status()));
    }

    let result: Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    let translated = result["response"]
        .as_str()
        .unwrap_or(&text)
        .to_string();

    Ok(json!({
        "translated": translated,
        "source_lang": source_lang,
        "target_lang": target_lang
    }))
}

#[tauri::command]
pub async fn summarize_text(
    text: String,
    language: String,
    max_length: Option<usize>,
) -> Result<Value, String> {
    let max_len = max_length.unwrap_or(500);
    
    // Use Ollama for summarization
    let client = Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let prompt = format!(
        "Summarize the following text in {} in {} words or less: {}",
        language, max_len, text
    );

    let response = client
        .post("http://127.0.0.1:11434/api/generate")
        .json(&json!({
            "model": "llama3.2:3b",
            "prompt": prompt,
            "stream": false
        }))
        .send()
        .await
        .map_err(|e| format!("Summarization request failed: {}", e))?;

    if !response.status().is_success() {
        // Fallback: simple truncation
        let summary = if text.len() > max_len {
            text.chars().take(max_len).collect::<String>() + "..."
        } else {
            text
        };
        return Ok(json!({ "summary": summary }));
    }

    let result: Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    let summary = result["response"]
        .as_str()
        .map(|s| s.to_string())
        .unwrap_or_else(|| {
            if text.len() > max_len {
                text.chars().take(max_len).collect::<String>()
            } else {
                text.clone()
            }
        });

    Ok(json!({ "summary": summary }))
}

// ============================================================================
// Privacy Commands
// ============================================================================

#[tauri::command]
pub async fn privacy_audit(domain: String) -> Result<Value, String> {
    // Basic privacy audit (can be enhanced with actual tracker detection)
    let client = Client::builder()
        .timeout(Duration::from_secs(10))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    // Try to fetch page and analyze
    let url = if domain.starts_with("http") {
        domain.clone()
    } else {
        format!("https://{}", domain)
    };

    let response = client
        .get(&url)
        .header("User-Agent", "Mozilla/5.0")
        .send()
        .await;

    let mut trackers = Vec::new();
    let mut cookies = 0;
    let mut third_party_requests = 0;
    let mut privacy_score = 50;

    if let Ok(resp) = response {
        if let Ok(html) = resp.text().await {
            // Simple tracker detection
            let tracker_patterns = vec![
                ("google-analytics", "Analytics"),
                ("facebook", "Social"),
                ("doubleclick", "Advertising"),
                ("adservice", "Advertising"),
            ];

            for (pattern, category) in tracker_patterns {
                if html.contains(pattern) {
                    trackers.push(json!({
                        "name": pattern,
                        "category": category,
                        "blocked": false
                    }));
                    privacy_score -= 10;
                }
            }

            // Count cookies (simple heuristic)
            cookies = html.matches("cookie").count();
            if cookies > 20 {
                privacy_score -= 5;
            }

            // Count third-party requests (simple heuristic)
            third_party_requests = html.matches("https://").count() - 1;
            if third_party_requests > 10 {
                privacy_score -= 5;
            }
        }
    }

    let recommendations = vec![
        "Enable tracker blocking",
        "Block third-party cookies",
        "Use privacy-focused search engine",
    ];

    Ok(json!({
        "domain": domain,
        "timestamp": chrono::Utc::now().timestamp(),
        "trackers": trackers,
        "cookies": cookies,
        "third_party_requests": third_party_requests,
        "privacy_score": privacy_score.max(0).min(100),
        "recommendations": recommendations
    }))
}

// ============================================================================
// Document Processing Commands
// ============================================================================

#[tauri::command]
pub async fn process_pdf(
    path: String,
    extract_text: bool,
    extract_tables: bool,
    summarize: bool,
) -> Result<Value, String> {
    use std::fs;
    use pdf::file::FileOptions;

    // Check if file exists
    if !std::path::Path::new(&path).exists() {
        return Err("PDF file not found".to_string());
    }

    let file_data = fs::read(&path).map_err(|e| format!("Failed to read PDF: {}", e))?;
    let metadata = json!({
        "type": "pdf",
        "path": path,
        "size": file_data.len(),
        "created_at": chrono::Utc::now().timestamp(),
        "modified_at": chrono::Utc::now().timestamp()
    });

    let mut result = json!({
        "metadata": metadata,
    });

    // Extract text from PDF
    if extract_text {
        let mut extracted_text = String::new();
        match FileOptions::cached().password(&[]).load(&file_data[..]) {
            Ok(file) => {
                let num_pages = file.num_pages();
                result["metadata"]["pages"] = json!(num_pages);
                
                for page_num in 1..=num_pages {
                    if let Ok(_page) = file.get_page(page_num) {
                        // Extract text from page (simplified - actual API may vary)
                        // For now, return placeholder
                        extracted_text.push_str(&format!("[Page {} text extraction]\n", page_num));
                    }
                }
                if extracted_text.is_empty() {
                    result["text"] = json!("[PDF text extraction - requires additional processing]");
                } else {
                    result["text"] = json!(extracted_text);
                }
            }
            Err(e) => {
                result["text"] = json!(format!("[PDF parsing error: {}]", e));
            }
        }
    }

    if extract_tables {
        // Table extraction would require additional processing
        // For now, return empty array
        result["tables"] = json!([]);
    }

    if summarize {
        if let Some(text) = result.get("text").and_then(|t| t.as_str()) {
            if !text.is_empty() && !text.starts_with('[') {
                let summary_result = summarize_text(text.to_string(), "en".to_string(), Some(500))
                    .await
                    .unwrap_or(json!({ "summary": "" }));
                result["summary"] = summary_result["summary"].clone();
            }
        }
    }

    Ok(result)
}

#[tauri::command]
pub async fn process_excel(
    path: String,
    extract_data: bool,
    analyze: bool,
) -> Result<Value, String> {
    use std::fs;
    use calamine::{open_workbook, Reader, Xlsx, Xls, Ods};

    // Check if file exists
    if !std::path::Path::new(&path).exists() {
        return Err("Excel file not found".to_string());
    }

    let metadata = json!({
        "type": "excel",
        "path": path.clone(),
        "size": fs::metadata(&path).map(|m| m.len()).unwrap_or(0),
        "created_at": chrono::Utc::now().timestamp(),
        "modified_at": chrono::Utc::now().timestamp()
    });

    let mut result = json!({
        "metadata": metadata,
    });

    if extract_data {
        let mut sheets_data = json!([]);
        
        // Try to open as XLSX first, then XLS, then ODS
        if path.ends_with(".xlsx") {
            if let Ok(mut workbook) = open_workbook::<Xlsx<_>, _>(&path) {
                let sheet_names = workbook.sheet_names().to_vec();
                result["metadata"]["sheets"] = json!(sheet_names.len());
                
                for sheet_name in sheet_names {
                    if let Ok(range) = workbook.worksheet_range(&sheet_name) {
                        let mut rows: Vec<Vec<String>> = Vec::new();
                        for row in range.rows() {
                            let row_data: Vec<String> = row.iter()
                                .map(|cell| cell.to_string())
                                .collect();
                            rows.push(row_data);
                        }
                        sheets_data.as_array_mut().unwrap().push(json!({
                            "name": sheet_name,
                            "rows": rows.len(),
                            "data": rows
                        }));
                    }
                }
            }
        } else if path.ends_with(".xls") {
            if let Ok(mut workbook) = open_workbook::<Xls<_>, _>(&path) {
                let sheet_names = workbook.sheet_names().to_vec();
                result["metadata"]["sheets"] = json!(sheet_names.len());
                
                for sheet_name in sheet_names {
                    if let Ok(range) = workbook.worksheet_range(&sheet_name) {
                        let mut rows: Vec<Vec<String>> = Vec::new();
                        for row in range.rows() {
                            let row_data: Vec<String> = row.iter()
                                .map(|cell| cell.to_string())
                                .collect();
                            rows.push(row_data);
                        }
                        sheets_data.as_array_mut().unwrap().push(json!({
                            "name": sheet_name,
                            "rows": rows.len(),
                            "data": rows
                        }));
                    }
                }
            }
        } else if path.ends_with(".ods") {
            if let Ok(mut workbook) = open_workbook::<Ods<_>, _>(&path) {
                let sheet_names = workbook.sheet_names().to_vec();
                result["metadata"]["sheets"] = json!(sheet_names.len());
                
                for sheet_name in sheet_names {
                    if let Ok(range) = workbook.worksheet_range(&sheet_name) {
                        let mut rows: Vec<Vec<String>> = Vec::new();
                        for row in range.rows() {
                            let row_data: Vec<String> = row.iter()
                                .map(|cell| cell.to_string())
                                .collect();
                            rows.push(row_data);
                        }
                        sheets_data.as_array_mut().unwrap().push(json!({
                            "name": sheet_name,
                            "rows": rows.len(),
                            "data": rows
                        }));
                    }
                }
            }
        }
        
        result["sheets"] = sheets_data;
    }

    if analyze {
        if let Some(sheets) = result.get("sheets").and_then(|s| s.as_array()) {
            let total_rows: usize = sheets.iter()
                .map(|s| s.get("rows").and_then(|r| r.as_u64()).unwrap_or(0) as usize)
                .sum();
            result["summary"] = json!(format!(
                "Excel file with {} sheet(s), {} total rows",
                sheets.len(),
                total_rows
            ));
        }
    }

    Ok(result)
}

#[tauri::command]
pub async fn process_doc(
    path: String,
    extract_text: bool,
    _extract_formatting: bool,
    summarize: bool,
) -> Result<Value, String> {
    use std::fs;
    use std::io::Read;
    use zip::ZipArchive;

    // Check if file exists
    if !std::path::Path::new(&path).exists() {
        return Err("Doc file not found".to_string());
    }

    let file_data = fs::read(&path).map_err(|e| format!("Failed to read DOCX: {}", e))?;
    let metadata = json!({
        "type": if path.ends_with(".docx") { "docx" } else { "doc" },
        "path": path,
        "size": file_data.len(),
        "created_at": chrono::Utc::now().timestamp(),
        "modified_at": chrono::Utc::now().timestamp()
    });

    let mut result = json!({
        "metadata": metadata,
    });

    if extract_text {
        // DOCX is a ZIP archive containing XML files
        // Extract text from word/document.xml
        match std::io::Cursor::new(&file_data) {
            cursor => {
                match ZipArchive::new(cursor) {
                    Ok(mut archive) => {
                        match archive.by_name("word/document.xml") {
                            Ok(mut file) => {
                                let mut xml_content = String::new();
                                if file.read_to_string(&mut xml_content).is_ok() {
                                    // Simple text extraction from XML (remove tags)
                                    let text = xml_content
                                        .replace("<w:t>", "")
                                        .replace("</w:t>", "")
                                        .replace("<w:r>", "")
                                        .replace("</w:r>", "")
                                        .replace("<w:p>", "\n")
                                        .replace("</w:p>", "")
                                        .replace("<w:document>", "")
                                        .replace("</w:document>", "")
                                        .replace("<w:body>", "")
                                        .replace("</w:body>", "");
                                    
                                    // Clean up extra whitespace
                                    let cleaned_text: String = text
                                        .lines()
                                        .map(|line| line.trim())
                                        .filter(|line| !line.is_empty())
                                        .collect::<Vec<_>>()
                                        .join("\n");
                                    
                                    result["text"] = json!(cleaned_text);
                                } else {
                                    result["text"] = json!("[Failed to read document.xml from DOCX]");
                                }
                            }
                            Err(_) => {
                                result["text"] = json!("[DOCX file structure invalid - missing word/document.xml]");
                            }
                        }
                    }
                    Err(e) => {
                        result["text"] = json!(format!("[DOCX parsing error: {}]", e));
                    }
                }
            }
        }
    }

    if summarize {
        if let Some(text) = result.get("text").and_then(|t| t.as_str()) {
            if !text.is_empty() && !text.starts_with('[') {
                let summary_result = summarize_text(text.to_string(), "en".to_string(), Some(500))
                    .await
                    .unwrap_or(json!({ "summary": "" }));
                result["summary"] = summary_result["summary"].clone();
            }
        }
    }

    Ok(result)
}

// ============================================================================
// Voice Commands
// ============================================================================

#[tauri::command]
pub async fn transcribe_voice(_audio_data: Vec<u8>) -> Result<Value, String> {
    // Placeholder: would use Whisper.cpp for transcription
    // For now, return basic structure
    
    Ok(json!({
        "text": "[Voice transcription not yet implemented - requires Whisper.cpp integration]",
        "intent": "unknown",
        "confidence": 0.0,
        "entities": {}
    }))
}

// ============================================================================
// Insight Extraction Commands
// ============================================================================

#[tauri::command]
pub async fn extract_key_points(text: String) -> Result<Value, String> {
    // Use Ollama for key point extraction
    let client = Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let prompt = format!(
        "Extract the 5 most important key points from the following text. Format as a bulleted list:\n\n{}",
        text
    );

    let response = client
        .post("http://127.0.0.1:11434/api/generate")
        .json(&json!({
            "model": "llama3.2:3b",
            "prompt": prompt,
            "stream": false
        }))
        .send()
        .await
        .map_err(|e| format!("Key point extraction failed: {}", e))?;

    if !response.status().is_success() {
        // Fallback: simple sentence extraction
        let sentences: Vec<&str> = text.split(|c: char| c == '.' || c == '!' || c == '?')
            .filter(|s| s.trim().len() > 20)
            .take(5)
            .collect();
        return Ok(json!({ "key_points": sentences.join(". ") }));
    }

    let result: Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    let key_points = result["response"]
        .as_str()
        .unwrap_or("")
        .to_string();

    Ok(json!({ "key_points": key_points }))
}

#[tauri::command]
pub async fn extract_action_items(text: String) -> Result<Value, String> {
    // Use Ollama for action item extraction
    let client = Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let prompt = format!(
        "Extract all action items, todos, or tasks from the following text. Format as a JSON array of strings:\n\n{}",
        text
    );

    let response = client
        .post("http://127.0.0.1:11434/api/generate")
        .json(&json!({
            "model": "llama3.2:3b",
            "prompt": prompt,
            "stream": false
        }))
        .send()
        .await
        .map_err(|e| format!("Action item extraction failed: {}", e))?;

    if !response.status().is_success() {
        // Fallback: simple pattern matching
        let actions: Vec<String> = text
            .lines()
            .filter(|line| {
                let lower = line.to_lowercase();
                lower.contains("todo") || lower.contains("action") || lower.contains("task")
            })
            .take(10)
            .map(|s| s.trim().to_string())
            .collect();
        return Ok(json!({ "actions": actions }));
    }

    let result: Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    let response_text = result["response"]
        .as_str()
        .unwrap_or("[]")
        .to_string();

    // Try to parse as JSON array, fallback to simple list
    let actions: Vec<String> = if let Ok(parsed) = serde_json::from_str::<Vec<String>>(&response_text) {
        parsed
    } else {
        // Extract from text response
        response_text
            .lines()
            .filter(|line| !line.trim().is_empty())
            .take(10)
            .map(|s| s.trim().to_string())
            .collect()
    };

    Ok(json!({ "actions": actions }))
}

