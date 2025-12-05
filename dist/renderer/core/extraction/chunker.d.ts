/**
 * Text Chunker with Progressive Summarization
 * Faster than competitor agents - partial results in 200ms-800ms
 */
export interface Chunk {
    id: string;
    text: string;
    index: number;
    startOffset: number;
    endOffset: number;
    wordCount: number;
    summary?: string;
}
export interface ChunkOptions {
    maxChunkSize?: number;
    overlap?: number;
    minChunkSize?: number;
    preserveSentences?: boolean;
}
/**
 * Chunk text into smaller pieces for processing
 */
export declare function chunkText(text: string, options?: ChunkOptions): Chunk[];
/**
 * Progressive summarization - summarize chunks incrementally
 */
export declare function summarizeChunksProgressive(chunks: Chunk[], options?: {
    onProgress?: (chunk: Chunk, summary: string) => void;
    summarizeFn?: (text: string) => Promise<string>;
}): Promise<string>;
/**
 * Extract and chunk page content deterministically
 */
export declare function extractAndChunkPage(url: string, options?: ChunkOptions): Promise<{
    chunks: Chunk[];
    metadata: {
        url: string;
        totalWords: number;
    };
}>;
/**
 * Fast partial summary (200-800ms target)
 */
export declare function getPartialSummary(chunks: Chunk[], maxChunks?: number): Promise<string>;
