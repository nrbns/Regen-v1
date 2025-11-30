// Text Chunker - Splits text into manageable chunks for LLM processing
// Implements deterministic chunking for progressive summarization

const CHUNK_SIZE: usize = 3500; // ~3-4 KB chunks (slightly under 4KB for safety)
const OVERLAP: usize = 200; // Overlap between chunks to maintain context

#[derive(Clone)]
pub struct Chunk {
    pub text: String,
    pub index: usize,
    pub total: usize,
}

/// Chunk text into 3-4 KB pieces with overlap
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
        
        // Move start forward, but overlap
        if end >= total_words {
            break;
        }
        start = end.saturating_sub(overlap_words);
    }
    
    // Set total for all chunks
    let total = chunks.len();
    for chunk in &mut chunks {
        chunk.total = total;
    }
    
    chunks
}

/// Chunk text by sentences (better for summarization)
pub fn chunk_by_sentences(text: &str) -> Vec<Chunk> {
    if text.len() <= CHUNK_SIZE {
        return vec![Chunk {
            text: text.to_string(),
            index: 0,
            total: 1,
        }];
    }

    // Simple sentence splitting (by periods, exclamation, question marks)
    let sentences: Vec<&str> = text
        .split(|c: char| c == '.' || c == '!' || c == '?')
        .filter(|s| !s.trim().is_empty())
        .collect();

    if sentences.is_empty() {
        return chunk_text(text); // Fallback to word-based chunking
    }

    let mut chunks = Vec::new();
    let mut current_chunk = String::new();
    let mut chunk_index = 0;

    for sentence in sentences {
        let sentence = sentence.trim();
        if sentence.is_empty() {
            continue;
        }

        let sentence_with_punct = format!("{}. ", sentence);
        
        // If adding this sentence would exceed chunk size, start new chunk
        if !current_chunk.is_empty() && (current_chunk.len() + sentence_with_punct.len()) > CHUNK_SIZE {
            chunks.push(Chunk {
                text: current_chunk.trim().to_string(),
                index: chunk_index,
                total: 0, // Will be set later
            });
            chunk_index += 1;
            
            // Start new chunk with overlap (last few sentences of previous chunk)
            let overlap_sentences: Vec<&str> = current_chunk
                .split(|c: char| c == '.' || c == '!' || c == '?')
                .filter(|s| !s.trim().is_empty())
                .rev()
                .take(2)
                .collect::<Vec<_>>()
                .into_iter()
                .rev()
                .collect();
            
            current_chunk = overlap_sentences.join(". ") + ". ";
        }
        
        current_chunk.push_str(&sentence_with_punct);
    }

    // Add final chunk
    if !current_chunk.trim().is_empty() {
        chunks.push(Chunk {
            text: current_chunk.trim().to_string(),
            index: chunk_index,
            total: 0,
        });
    }

    // Set total
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
    fn test_chunk_text_small() {
        let text = "This is a short text.";
        let chunks = chunk_text(text);
        assert_eq!(chunks.len(), 1);
        assert_eq!(chunks[0].text, text);
    }

    #[test]
    fn test_chunk_text_large() {
        let text = "Word ".repeat(10000);
        let chunks = chunk_text(&text);
        assert!(chunks.len() > 1);
        assert!(chunks[0].text.len() <= CHUNK_SIZE + 100); // Allow some variance
    }
}

