/**
 * Offline RAG Service (Frontend)
 * High-level API for offline document storage and retrieval
 */

import {
  storePageForRAG,
  searchOfflineRAG,
  getRAGContext,
  deleteFromRAG,
  // type RAGQuery, // Unused
  type RAGResult,
} from '../lib/offline-store/rag';

// Re-export RAGResult for convenience
export type { RAGResult } from '../lib/offline-store/rag';
import {
  getDocument,
  listDocuments,
  getDocumentCount,
  getStorageSize,
  type StoredDocument,
} from '../lib/offline-store/indexedDB';

/**
 * Store current page or URL for offline access
 */
export async function savePageForOffline(options: {
  url: string;
  title?: string;
  autoExtract?: boolean; // Extract content automatically
}): Promise<string> {
  const { url, title, autoExtract = true } = options;

  // If auto-extract, fetch and extract content
  if (autoExtract) {
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:4000';
      const response = await fetch(`${API_BASE}/api/summarize/v2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls: [url],
          includeCitations: false,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const summary = data.summaries?.[0];

        if (summary) {
          return await storePageForRAG({
            url,
            title: title || summary.title || url,
            content: summary.summary || summary.excerpt || '',
            excerpt: summary.excerpt || summary.summary?.slice(0, 200),
            metadata: {
              language: 'en',
              wordCount: summary.summary?.split(/\s+/).length || 0,
            },
          });
        }
      }
    } catch (error) {
      console.warn('[OfflineRAG] Failed to auto-extract, storing URL only:', error);
    }
  }

  // Fallback: store with minimal data
  return await storePageForRAG({
    url,
    title: title || url,
    content: '', // Will be filled later
    excerpt: url,
  });
}

/**
 * Search offline documents
 */
export async function searchOfflineDocuments(
  query: string,
  options: { limit?: number; includeChunks?: boolean } = {}
): Promise<RAGResult> {
  return await searchOfflineRAG(query, options);
}

/**
 * Get RAG context for LLM prompts
 */
export async function getOfflineContext(query: string): Promise<string> {
  return await getRAGContext(query);
}

/**
 * List all stored documents
 */
export async function listStoredDocuments(
  options: {
    limit?: number;
    offset?: number;
  } = {}
): Promise<StoredDocument[]> {
  return await listDocuments(options);
}

/**
 * Get stored document by URL
 */
export async function getStoredDocument(urlOrId: string): Promise<StoredDocument | undefined> {
  return await getDocument(urlOrId);
}

/**
 * Delete stored document
 */
export async function deleteStoredDocument(id: string): Promise<void> {
  return await deleteFromRAG(id);
}

/**
 * Get storage statistics
 */
export async function getStorageStats(): Promise<{
  documentCount: number;
  storageSize: number; // bytes
  storageSizeMB: number;
}> {
  const [count, size] = await Promise.all([getDocumentCount(), getStorageSize()]);

  return {
    documentCount: count,
    storageSize: size,
    storageSizeMB: Math.round((size / (1024 * 1024)) * 100) / 100,
  };
}
