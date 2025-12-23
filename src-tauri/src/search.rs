// Offline Search - Full-text search using FTS5
// Wraps db.rs search functionality with ranking and multilingual support

use serde::{Deserialize, Serialize};
use crate::db::Database;
use rusqlite::Result as SqliteResult;

pub struct SearchEngine {
    db: Database,
}

impl SearchEngine {
    pub fn new(db: Database) -> Self {
        Self { db }
    }

    // Search pages with query
    pub fn search(&self, query: &str, limit: usize) -> SqliteResult<Vec<SearchResult>> {
        // Use FTS5 search from database
        let pages = self.db.search_pages(query, limit)?;

        // Convert to SearchResult with ranking
        let results: Vec<SearchResult> = pages
            .into_iter()
            .map(|page| {
                // Simple ranking: count query term matches in title (boost) and content
                let title_matches = count_matches(&page.title.to_lowercase(), &query.to_lowercase());
                let content_matches = count_matches(&page.content.to_lowercase(), &query.to_lowercase());
                
                // Boost title matches (10x weight)
                let score = (title_matches * 10) + content_matches;

                SearchResult {
                    url: page.url,
                    title: page.title,
                    snippet: extract_snippet(&page.content, query, 150),
                    score,
                    cached_at: page.cached_at,
                }
            })
            .collect();

        // Sort by score (descending)
        let mut sorted_results = results;
        sorted_results.sort_by(|a, b| b.score.cmp(&a.score));

        Ok(sorted_results)
    }

    // Search with language filter
    pub fn search_with_language(
        &self,
        query: &str,
        language: Option<&str>,
        limit: usize,
    ) -> SqliteResult<Vec<SearchResult>> {
        // For now, search all pages and filter by language
        // TODO: Add language filtering to FTS5 query if needed
        let results = self.search(query, limit * 2)?; // Get more results for filtering

        // Filter by language if specified
        let filtered: Vec<SearchResult> = if let Some(lang) = language {
            // Get pages from DB to check language
            results
                .into_iter()
                .filter_map(|result| {
                    if let Ok(Some(page)) = self.db.get_page(&result.url) {
                        if page.language.as_ref().map(|l| l.as_str()) == Some(lang) {
                            Some(result)
                        } else {
                            None
                        }
                    } else {
                        Some(result) // Include if page not found (fallback)
                    }
                })
                .take(limit)
                .collect()
        } else {
            results.into_iter().take(limit).collect()
        };

        Ok(filtered)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    pub url: String,
    pub title: String,
    pub snippet: String,
    pub score: usize,
    pub cached_at: i64,
}

// Helper: Count substring matches (simple word matching)
fn count_matches(text: &str, query: &str) -> usize {
    let query_words: Vec<&str> = query.split_whitespace().collect();
    let mut matches = 0;
    for word in query_words {
        if text.contains(word) {
            matches += 1;
        }
    }
    matches
}

// Helper: Extract snippet around query terms
fn extract_snippet(content: &str, query: &str, max_length: usize) -> String {
    let content_lower = content.to_lowercase();
    let query_lower = query.to_lowercase();
    
    // Find first occurrence of any query word
    let query_words: Vec<&str> = query_lower.split_whitespace().collect();
    let mut start = 0;
    
    for word in query_words {
        if let Some(pos) = content_lower.find(word) {
            start = pos;
            break;
        }
    }

    // Extract snippet around start position
    let snippet_start = start.saturating_sub(max_length / 3);
    let snippet_end = (start + max_length).min(content.len());
    
    let mut snippet = content[snippet_start..snippet_end].to_string();
    
    // Add ellipsis if truncated
    if snippet_start > 0 {
        snippet = format!("...{}", snippet);
    }
    if snippet_end < content.len() {
        snippet = format!("{}...", snippet);
    }

    snippet.trim().to_string()
}
