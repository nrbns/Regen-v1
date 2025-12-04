// Text Chunker - Splits text into manageable chunks for LLM processing
// Implements deterministic chunking for progressive summarization

const CHUNK_SIZE: usize = 3500; // ~3-4 KB chunks (slightly under 4KB for safety)
#[allow(dead_code)]
const OVERLAP: usize = 200; // Overlap between chunks to maintain context (used in chunk_text)

#[derive(Clone)]
pub struct Chunk {
    pub text: String,
    pub index: usize,
    pub total: usize,
}

/// Chunk text into 3-4 KB pieces with overlap
#[allow(dead_code)]
pub fn chunk_text(text: &str) -> Vec<Chunk> {
    if text.len() <= CHUNK_SIZE {
        return vec![Chunk {
            text: text.to_string(),
            index: 0,
            total: 1,
        }];
    }

    let mut chunks = Vec::new();
    let words: Vec<&str> = text.split_whitespace().collect();
    let total_words = words.len();
    
    if total_words == 0 {
        return chunks;
    }

    // Estimate words per chunk (roughly 5 chars per word average)
    let words_per_chunk = CHUNK_SIZE / 5;
    let overlap_words = OVERLAP / 5;
    
    let mut start = 0;
    let mut chunk_index = 0;
    
    while start < total_words {
        let end = (start + words_per_chunk).min(total_words);
        let chunk_words = &words[start..end];
        let chunk_text = chunk_words.join(" ");
        
        chunks.push(Chunk {
            text: chunk_text,
            index: chunk_index,
            total: 0, // Will be set after we know total
        });
        
        chunk_index += 1;
        start = end.saturating_sub(overlap_words);
    }

    // Set total for all chunks
    let total = chunks.len();
    for chunk in &mut chunks {
        chunk.total = total;
    }

    chunks
}

/// Chunk text by sentences (for better context preservation)
pub fn chunk_by_sentences(text: &str, max_chunk_size: usize) -> Vec<Chunk> {
    if text.len() <= max_chunk_size {
        return vec![Chunk {
            text: text.to_string(),
            index: 0,
            total: 1,
        }];
    }

    let mut chunks = Vec::new();
    let sentences: Vec<&str> = text
        .split(|c: char| c == '.' || c == '!' || c == '?')
        .filter(|s| !s.trim().is_empty())
        .collect();

    if sentences.is_empty() {
        return vec![Chunk {
            text: text.to_string(),
            index: 0,
            total: 1,
        }];
    }

    let mut current_chunk = String::new();
    let mut chunk_index = 0;

    for sentence in sentences {
        let sentence_with_punct = format!("{}. ", sentence.trim());
        
        if current_chunk.len() + sentence_with_punct.len() > max_chunk_size && !current_chunk.is_empty() {
            chunks.push(Chunk {
                text: current_chunk.trim().to_string(),
                index: chunk_index,
                total: 0, // Will be set later
            });
            current_chunk = sentence_with_punct;
            chunk_index += 1;
        } else {
            current_chunk.push_str(&sentence_with_punct);
        }
    }

    // Add remaining chunk
    if !current_chunk.trim().is_empty() {
        chunks.push(Chunk {
            text: current_chunk.trim().to_string(),
            index: chunk_index,
            total: 0,
        });
    }

    // Set total for all chunks
    let total = chunks.len();
    for chunk in &mut chunks {
        chunk.total = total;
    }

    chunks
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_chunking_small_text() {
        let text = "This is a short text.";
        let chunks = chunk_text(text);
        assert_eq!(chunks.len(), 1);
        assert_eq!(chunks[0].text, text);
    }

    #[test]
    fn test_chunking_large_text() {
        // Use a smaller repeat to avoid memory issues
        let text = "word ".repeat(1000);
        let chunks = chunk_text(&text);
        assert!(chunks.len() > 1);
        assert_eq!(chunks[0].index, 0);
    }

    #[test]
    fn test_chunking_empty_text() {
        let text = "";
        let chunks = chunk_text(text);
        assert_eq!(chunks.len(), 1);
    }

    #[test]
    fn test_chunk_by_sentences() {
        let text = "First sentence. Second sentence. Third sentence.";
        let chunks = chunk_by_sentences(text, 20);
        assert!(chunks.len() > 1);
    }
}
