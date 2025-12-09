/**
 * Text Chunker Service
 * Splits documents into 512-1024 token chunks for embedding
 */

const Pino = require('pino');

const logger = Pino({ name: 'chunker' });

// Approximate tokens per character (rough estimate: 1 token ≈ 4 characters)
const CHARS_PER_TOKEN = 4;
const MIN_CHUNK_SIZE = 512 * CHARS_PER_TOKEN; // ~2048 chars
const MAX_CHUNK_SIZE = 1024 * CHARS_PER_TOKEN; // ~4096 chars
const OVERLAP_SIZE = 200; // Overlap between chunks (chars)

class Chunker {
  constructor(options = {}) {
    this.minChunkSize = options.minChunkSize || MIN_CHUNK_SIZE;
    this.maxChunkSize = options.maxChunkSize || MAX_CHUNK_SIZE;
    this.overlapSize = options.overlapSize || OVERLAP_SIZE;
  }

  /**
   * Clean and normalize text
   */
  _cleanText(text) {
    return text
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive newlines
      .trim();
  }

  /**
   * Split text into sentences (simple approach)
   */
  _splitSentences(text) {
    // Split on sentence endings, but keep the punctuation
    return text.match(/[^.!?]+[.!?]+/g) || [text];
  }

  /**
   * Chunk text into optimal sizes
   */
  chunk(text, metadata = {}) {
    const cleaned = this._cleanText(text);
    if (cleaned.length <= this.maxChunkSize) {
      return [{
        text: cleaned,
        start: 0,
        end: cleaned.length,
        index: 0,
        metadata,
      }];
    }

    const chunks = [];
    const sentences = this._splitSentences(cleaned);
    let currentChunk = '';
    let currentStart = 0;
    let chunkIndex = 0;

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const potentialChunk = currentChunk + sentence;

      // If adding this sentence would exceed max size, finalize current chunk
      if (potentialChunk.length > this.maxChunkSize && currentChunk.length >= this.minChunkSize) {
        chunks.push({
          text: currentChunk.trim(),
          start: currentStart,
          end: currentStart + currentChunk.length,
          index: chunkIndex++,
          metadata: {
            ...metadata,
            chunkIndex: chunkIndex - 1,
            totalChunks: 0, // Will be set later
          },
        });

        // Start new chunk with overlap
        const overlap = currentChunk.slice(-this.overlapSize);
        currentChunk = overlap + sentence;
        currentStart = currentStart + currentChunk.length - overlap.length - sentence.length;
      } else {
        currentChunk = potentialChunk;
      }
    }

    // Add final chunk
    if (currentChunk.trim().length > 0) {
      chunks.push({
        text: currentChunk.trim(),
        start: currentStart,
        end: currentStart + currentChunk.length,
        index: chunkIndex,
        metadata: {
          ...metadata,
          chunkIndex,
          totalChunks: chunkIndex + 1,
        },
      });
    }

    // Update totalChunks for all chunks
    chunks.forEach(chunk => {
      chunk.metadata.totalChunks = chunks.length;
    });

    logger.debug({ 
      originalLength: cleaned.length, 
      chunkCount: chunks.length,
      avgChunkSize: chunks.reduce((sum, c) => sum + c.text.length, 0) / chunks.length,
    }, 'Chunked text');

    return chunks;
  }

  /**
   * Chunk HTML content (extracts text first)
   */
  chunkHTML(html, metadata = {}) {
    // Simple HTML text extraction (for production, use proper HTML parser)
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove styles
      .replace(/<[^>]+>/g, ' ') // Remove HTML tags
      .replace(/&[^;]+;/g, ' ') // Remove entities
      .trim();

    return this.chunk(text, metadata);
  }

  /**
   * Estimate token count (rough)
   */
  estimateTokens(text) {
    return Math.ceil(text.length / CHARS_PER_TOKEN);
  }
}

module.exports = { Chunker };








