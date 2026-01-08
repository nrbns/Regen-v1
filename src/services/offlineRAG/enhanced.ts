/**
 * Enhanced Offline RAG Service
 * Advanced features with hybrid search, semantic search, and better caching
 */

import {
  savePageForOffline,
  searchOfflineDocuments,
  // getOfflineContext, // Unused
  // listStoredDocuments, // Unused
  // getStorageStats, // Unused
} from '../offlineRAG';
import { semanticSearch } from '../../lib/offline-store/semantic-search';
import { hybridSearch } from '../../lib/offline-store/hybrid-search';
import { generateEmbedding } from '../../lib/offline-store/embeddings';

export interface EnhancedRAGOptions {
  method?: 'keyword' | 'semantic' | 'hybrid';
  useEmbeddings?: boolean;
  cacheResults?: boolean;
}

/**
 * Enhanced search with multiple methods
 */
export async function enhancedSearch(
  query: string,
  options: EnhancedRAGOptions & { limit?: number } = {}
): Promise<any> {
  const { method = 'hybrid', limit = 10, useEmbeddings: _useEmbeddings = true } = options;

  switch (method) {
    case 'semantic':
      return await semanticSearch(query, { limit, useHybrid: false });
    case 'hybrid':
      return await hybridSearch(query, { limit });
    default:
      return await searchOfflineDocuments(query, { limit });
  }
}

/**
 * Save page with automatic embedding generation
 */
export async function savePageWithEmbeddings(options: {
  url: string;
  title: string;
  content: string;
  excerpt?: string;
  generateEmbedding?: boolean;
}): Promise<string> {
  const { generateEmbedding: genEmbedding = true, ...saveOptions } = options;

  // Save page
  const docId = await savePageForOffline({
    url: saveOptions.url,
    title: saveOptions.title,
    autoExtract: false, // We already have content
  });

  // Generate and store embedding if enabled
  if (genEmbedding) {
    try {
      const _embedding = await generateEmbedding(
        `${saveOptions.title}\n\n${saveOptions.content.slice(0, 1000)}`
      );
      // TODO: Store embedding with document
      // This would require updating the document in IndexedDB
    } catch (error) {
      console.warn('[EnhancedRAG] Failed to generate embedding:', error);
    }
  }

  return docId;
}

/**
 * Get enhanced RAG context with semantic similarity
 */
export async function getEnhancedRAGContext(
  query: string,
  options: { maxDocuments?: number; minSimilarity?: number } = {}
): Promise<string> {
  const { maxDocuments = 3, minSimilarity = 0.6 } = options;

  // Use semantic search for better context
  const results = await semanticSearch(query, {
    limit: maxDocuments,
    minSimilarity,
    useHybrid: false,
  });

  // Build context from semantically similar documents
  const contextParts: string[] = [];
  for (const result of results.documents) {
    const doc = result.document;
    contextParts.push(`[Document: ${doc.title}]`);
    contextParts.push(`URL: ${doc.url}`);
    contextParts.push(`Similarity: ${(result.score * 100).toFixed(1)}%`);
    contextParts.push(`Content: ${doc.excerpt || doc.content.slice(0, 500)}...`);
    contextParts.push('---');
  }

  return contextParts.join('\n\n');
}
