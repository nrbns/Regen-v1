/**
 * Research Cache - IndexedDB storage for fast local retrieval
 * Uses Dexie for IndexedDB management
 */

import Dexie, { Table } from 'dexie';

export interface CachedDocument {
  id: string;
  type: 'tab' | 'pdf' | 'docx' | 'txt' | 'md' | 'html';
  title: string;
  url?: string;
  filename?: string;
  uploadedAt: number;
  chunkCount: number;
  size: number;
  // Cached metadata
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
  // For local search
  contentLower: string;
  // Timestamp for cache invalidation
  cachedAt: number;
}

export interface CachedEmbedding {
  chunkId: string;
  documentId: string;
  embedding?: number[]; // Vector embedding (optional, for future use)
  cachedAt: number;
}

class ResearchCacheDB extends Dexie {
  documents!: Table<CachedDocument>;
  chunks!: Table<CachedChunk>;
  embeddings!: Table<CachedEmbedding>;

  constructor() {
    super('ResearchCache');
    
    this.version(1).stores({
      documents: 'id, type, uploadedAt, url, title',
      chunks: 'id, documentId, chunkIndex, [documentId+chunkIndex], cachedAt',
      embeddings: 'chunkId, documentId, cachedAt',
    });
  }
}

const db = new ResearchCacheDB();

/**
 * Cache a document
 */
export async function cacheDocument(document: {
  id: string;
  type: 'tab' | 'pdf' | 'docx' | 'txt' | 'md' | 'html';
  title: string;
  url?: string;
  filename?: string;
  uploadedAt: number;
  chunkCount: number;
  size: number;
  metadata?: any;
}): Promise<void> {
  try {
    await db.documents.put({
      ...document,
      metadata: document.metadata || {},
    });
  } catch (error) {
    console.error('[Research Cache] Failed to cache document:', error);
  }
}

/**
 * Cache chunks for a document
 */
export async function cacheChunks(chunks: Array<{
  id: string;
  documentId: string;
  content: string;
  chunkIndex: number;
  startChar: number;
  endChar: number;
  metadata: any;
}>): Promise<void> {
  try {
    const cachedChunks: CachedChunk[] = chunks.map(chunk => ({
      ...chunk,
      contentLower: chunk.content.toLowerCase(),
      cachedAt: Date.now(),
    }));

    await db.chunks.bulkPut(cachedChunks);
  } catch (error) {
    console.error('[Research Cache] Failed to cache chunks:', error);
  }
}

/**
 * Get cached document
 */
export async function getCachedDocument(documentId: string): Promise<CachedDocument | undefined> {
  try {
    return await db.documents.get(documentId);
  } catch (error) {
    console.error('[Research Cache] Failed to get cached document:', error);
    return undefined;
  }
}

/**
 * Get cached chunks for a document
 */
export async function getCachedChunks(documentId: string): Promise<CachedChunk[]> {
  try {
    return await db.chunks
      .where('documentId')
      .equals(documentId)
      .sortBy('chunkIndex');
  } catch (error) {
    console.error('[Research Cache] Failed to get cached chunks:', error);
    return [];
  }
}

/**
 * Search chunks by text (local full-text search)
 */
export async function searchChunks(query: string, limit: number = 20): Promise<CachedChunk[]> {
  try {
    const queryLower = query.toLowerCase();
    const terms = queryLower.split(/\s+/).filter(term => term.length > 2);

    if (terms.length === 0) {
      return [];
    }

    // Simple full-text search using IndexedDB
    // For better performance, we could use a more sophisticated approach
    const allChunks = await db.chunks.toArray();
    
    // Score chunks by term matches
    const scored = allChunks.map(chunk => {
      let score = 0;
      for (const term of terms) {
        const matches = (chunk.contentLower.match(new RegExp(term, 'g')) || []).length;
        score += matches;
      }
      return { chunk, score };
    });

    // Sort by score and return top results
    return scored
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.chunk);
  } catch (error) {
    console.error('[Research Cache] Failed to search chunks:', error);
    return [];
  }
}

/**
 * List all cached documents (sorted by upload date)
 */
export async function listCachedDocuments(limit?: number): Promise<CachedDocument[]> {
  try {
    let query = db.documents.orderBy('uploadedAt').reverse();
    if (limit) {
      query = query.limit(limit);
    }
    return await query.toArray();
  } catch (error) {
    console.error('[Research Cache] Failed to list documents:', error);
    return [];
  }
}

/**
 * Delete cached document and its chunks
 */
export async function deleteCachedDocument(documentId: string): Promise<void> {
  try {
    await db.transaction('rw', db.documents, db.chunks, db.embeddings, async () => {
      await db.documents.delete(documentId);
      await db.chunks.where('documentId').equals(documentId).delete();
      await db.embeddings.where('documentId').equals(documentId).delete();
    });
  } catch (error) {
    console.error('[Research Cache] Failed to delete cached document:', error);
  }
}

/**
 * Clear old cache entries (older than specified days)
 */
export async function clearOldCache(maxAgeDays: number = 30): Promise<number> {
  try {
    const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
    
    // Delete old chunks
    const oldChunks = await db.chunks.where('cachedAt').below(cutoff).delete();
    
    // Delete old embeddings
    const oldEmbeddings = await db.embeddings.where('cachedAt').below(cutoff).delete();
    
    return oldChunks + oldEmbeddings;
  } catch (error) {
    console.error('[Research Cache] Failed to clear old cache:', error);
    return 0;
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  documentCount: number;
  chunkCount: number;
  embeddingCount: number;
  totalSize: number;
}> {
  try {
    const [documents, chunks, embeddings] = await Promise.all([
      db.documents.count(),
      db.chunks.count(),
      db.embeddings.count(),
    ]);

    // Estimate total size (rough calculation)
    const allChunks = await db.chunks.toArray();
    const totalSize = allChunks.reduce((sum, chunk) => sum + chunk.content.length, 0);

    return {
      documentCount: documents,
      chunkCount: chunks,
      embeddingCount: embeddings,
      totalSize,
    };
  } catch (error) {
    console.error('[Research Cache] Failed to get cache stats:', error);
    return {
      documentCount: 0,
      chunkCount: 0,
      embeddingCount: 0,
      totalSize: 0,
    };
  }
}

/**
 * Sync documents from backend to cache
 */
export async function syncDocumentsFromBackend(): Promise<void> {
  try {
    // This would be called from the IPC layer after fetching documents
    // For now, it's a placeholder for future sync logic
    const { ipc } = await import('../ipc-typed');
    const { documents } = await ipc.research.listDocuments();

    // Cache each document
    for (const doc of documents) {
      await cacheDocument({
        id: doc.id,
        type: doc.type as any,
        title: doc.title,
        uploadedAt: doc.uploadedAt,
        chunkCount: doc.chunkCount,
        size: 0, // Size not available from list
      });

      // Fetch and cache chunks
      const { chunks } = await ipc.research.getDocumentChunks(doc.id);
      if (chunks.length > 0) {
        await cacheChunks(chunks.map((chunk: any, idx: number) => ({
          id: chunk.id || `${doc.id}-chunk-${idx}`,
          documentId: doc.id,
          content: chunk.content,
          chunkIndex: chunk.chunkIndex ?? idx,
          startChar: chunk.startChar ?? 0,
          endChar: chunk.endChar ?? chunk.content.length,
          metadata: chunk.metadata || {},
        })));
      }
    }
  } catch (error) {
    console.error('[Research Cache] Failed to sync from backend:', error);
  }
}

