/**
 * Research Cache - IndexedDB storage for fast local retrieval
 * Uses Dexie for IndexedDB management
 */
export interface CachedDocument {
    id: string;
    type: 'tab' | 'pdf' | 'docx' | 'txt' | 'md' | 'html';
    title: string;
    url?: string;
    filename?: string;
    uploadedAt: number;
    chunkCount: number;
    size: number;
    metadata: {
        sourceType: string;
        url?: string;
        title?: string;
    };
}
export interface CachedChunk {
    id: string;
    documentId: string;
    content: string;
    chunkIndex: number;
    startChar: number;
    endChar: number;
    metadata: {
        sourceType: string;
        url?: string;
        title?: string;
        page?: number;
        section?: string;
    };
    contentLower: string;
    cachedAt: number;
}
export interface CachedEmbedding {
    chunkId: string;
    documentId: string;
    embedding?: number[];
    cachedAt: number;
}
/**
 * Cache a document
 */
export declare function cacheDocument(document: {
    id: string;
    type: 'tab' | 'pdf' | 'docx' | 'txt' | 'md' | 'html';
    title: string;
    url?: string;
    filename?: string;
    uploadedAt: number;
    chunkCount: number;
    size: number;
    metadata?: any;
}): Promise<void>;
/**
 * Cache chunks for a document
 */
export declare function cacheChunks(chunks: Array<{
    id: string;
    documentId: string;
    content: string;
    chunkIndex: number;
    startChar: number;
    endChar: number;
    metadata: any;
}>): Promise<void>;
/**
 * Get cached document
 */
export declare function getCachedDocument(documentId: string): Promise<CachedDocument | undefined>;
/**
 * Get cached chunks for a document
 */
export declare function getCachedChunks(documentId: string): Promise<CachedChunk[]>;
/**
 * Search chunks by text (local full-text search)
 */
export declare function searchChunks(query: string, limit?: number): Promise<CachedChunk[]>;
/**
 * List all cached documents (sorted by upload date)
 */
export declare function listCachedDocuments(limit?: number): Promise<CachedDocument[]>;
/**
 * Delete cached document and its chunks
 */
export declare function deleteCachedDocument(documentId: string): Promise<void>;
/**
 * Clear old cache entries (older than specified days)
 */
export declare function clearOldCache(maxAgeDays?: number): Promise<number>;
/**
 * Get cache statistics
 */
export declare function getCacheStats(): Promise<{
    documentCount: number;
    chunkCount: number;
    embeddingCount: number;
    totalSize: number;
}>;
/**
 * Sync documents from backend to cache
 */
export declare function syncDocumentsFromBackend(): Promise<void>;
