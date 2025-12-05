/**
 * Text Chunker with Progressive Summarization
 * Faster than competitor agents - partial results in 200ms-800ms
 */
/**
 * Chunk text into smaller pieces for processing
 */
export function chunkText(text, options = {}) {
    const { maxChunkSize = 1000, overlap = 100, minChunkSize = 100, preserveSentences = true, } = options;
    if (text.length <= maxChunkSize) {
        return [
            {
                id: `chunk-0`,
                text,
                index: 0,
                startOffset: 0,
                endOffset: text.length,
                wordCount: text.split(/\s+/).length,
            },
        ];
    }
    const chunks = [];
    let currentIndex = 0;
    let startOffset = 0;
    while (startOffset < text.length) {
        let endOffset = Math.min(startOffset + maxChunkSize, text.length);
        // If preserving sentences, try to end at sentence boundary
        if (preserveSentences && endOffset < text.length) {
            const sentenceEnd = findSentenceEnd(text, endOffset);
            if (sentenceEnd > startOffset + minChunkSize) {
                endOffset = sentenceEnd;
            }
        }
        const chunkText = text.slice(startOffset, endOffset);
        const wordCount = chunkText.split(/\s+/).length;
        chunks.push({
            id: `chunk-${currentIndex}`,
            text: chunkText,
            index: currentIndex,
            startOffset,
            endOffset,
            wordCount,
        });
        // Move start with overlap
        startOffset = endOffset - overlap;
        if (startOffset < 0)
            startOffset = 0;
        currentIndex++;
    }
    return chunks;
}
/**
 * Find sentence end near offset
 */
function findSentenceEnd(text, offset) {
    const sentenceEnders = /[.!?]\s+/g;
    let lastMatch = -1;
    let match;
    // Reset regex
    sentenceEnders.lastIndex = 0;
    while ((match = sentenceEnders.exec(text)) !== null) {
        if (match.index > offset) {
            return match.index + match[0].length;
        }
        lastMatch = match.index + match[0].length;
    }
    // If no match found after offset, use last match or return offset
    return lastMatch > offset ? lastMatch : offset;
}
/**
 * Progressive summarization - summarize chunks incrementally
 */
export async function summarizeChunksProgressive(chunks, options = {}) {
    const { onProgress, summarizeFn = defaultSummarize } = options;
    const summaries = [];
    for (const chunk of chunks) {
        try {
            const summary = await summarizeFn(chunk.text);
            chunk.summary = summary;
            summaries.push(summary);
            if (onProgress) {
                onProgress(chunk, summary);
            }
            // Small delay to allow UI updates
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        catch (error) {
            console.error(`[Chunker] Failed to summarize chunk ${chunk.id}:`, error);
            summaries.push(chunk.text.slice(0, 200) + '...');
        }
    }
    return summaries.join('\n\n');
}
/**
 * Default summarization function (can be replaced with LLM call)
 */
async function defaultSummarize(text) {
    // Simple extractive summarization (first 3 sentences)
    const sentences = text.split(/[.!?]+\s+/).filter(s => s.trim().length > 0);
    return sentences.slice(0, 3).join('. ') + '.';
}
/**
 * Extract and chunk page content deterministically
 */
export async function extractAndChunkPage(url, options = {}) {
    // Use Tauri fetch for cross-origin safety
    let text;
    if (typeof window !== 'undefined' && window.__TAURI__) {
        try {
            const result = await window.__TAURI__.invoke('extract_page_text', {
                url,
            });
            text = result?.text || '';
        }
        catch (error) {
            console.error('[Chunker] Failed to extract page:', error);
            text = '';
        }
    }
    else {
        // Fallback: fetch via proxy
        try {
            const response = await fetch(`http://127.0.0.1:4000/api/extract?url=${encodeURIComponent(url)}`);
            const data = await response.json();
            text = data.text || '';
        }
        catch (error) {
            console.error('[Chunker] Failed to extract page:', error);
            text = '';
        }
    }
    if (!text || text.trim().length === 0) {
        return {
            chunks: [],
            metadata: { url, totalWords: 0 },
        };
    }
    const chunks = chunkText(text, options);
    const totalWords = text.split(/\s+/).length;
    return {
        chunks,
        metadata: { url, totalWords },
    };
}
/**
 * Fast partial summary (200-800ms target)
 */
export async function getPartialSummary(chunks, maxChunks = 3) {
    const chunksToSummarize = chunks.slice(0, maxChunks);
    const summaries = [];
    // Process in parallel for speed
    const summaryPromises = chunksToSummarize.map(async (chunk) => {
        try {
            // Use simple extractive summarization for speed
            const sentences = chunk.text.split(/[.!?]+\s+/).filter(s => s.trim().length > 0);
            return sentences.slice(0, 2).join('. ') + '.';
        }
        catch {
            return chunk.text.slice(0, 200) + '...';
        }
    });
    const results = await Promise.all(summaryPromises);
    summaries.push(...results);
    return summaries.join('\n\n');
}
