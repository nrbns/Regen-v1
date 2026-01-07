/**
 * Offline RAG (Retrieval-Augmented Generation)
 * Combines IndexedDB storage with FlexSearch for offline document retrieval
 */

import { type StoredDocument, getDocument, storeDocument } from './indexedDB';
import {
  getGlobalSearchIndex,
  indexDocument,
  removeFromIndex,
  searchDocuments,
  type SearchOptions,
  initializeSearchIndex,
} from './flexsearch';
import { type DocumentChunk } from './indexedDB';
import { generateEmbedding } from './embeddings';

export interface RAGQuery {
  query: string;
  limit?: number;
  minScore?: number;
  includeChunks?: boolean;
}

export interface RAGResult {
  documents: Array<{
    document: StoredDocument;
    score: number;
    relevance: number; // 0-1
    matchedChunks?: DocumentChunk[];
  }>;
  totalResults: number;
  query: string;
}

/**
 * Store a webpage or document for offline RAG
 */
export async function storePageForRAG(options: {
  url: string;
  title: string;
  content: string;
  excerpt?: string;
  html?: string;
  metadata?: StoredDocument['metadata'];
  chunkSize?: number; // Characters per chunk
  chunkOverlap?: number; // Overlap between chunks
}): Promise<string> {
  const {
    url,
    title,
    content,
    excerpt,
    html,
    metadata,
    chunkSize = 1000,
    chunkOverlap = 200,
  } = options;

  // Generate ID from URL
  const id = `doc_${btoa(url).replace(/[+/=]/g, '').substring(0, 16)}`;

  // Create chunks for better retrieval
  const chunks: DocumentChunk[] = [];
  let chunkIndex = 0;
  
  for (let i = 0; i < content.length; i += chunkSize - chunkOverlap) {
    const chunkText = content.slice(i, i + chunkSize);
    if (chunkText.trim().length > 0) {
      chunks.push({
        id: `${id}_chunk_${chunkIndex}`,
        documentId: id,
        text: chunkText,
        startIndex: i,
        endIndex: Math.min(i + chunkSize, content.length),
      });
      chunkIndex++;
    }
  }

  // Generate embeddings if enabled
  let embeddings: number[] | undefined;
  try {
    const embedding = await generateEmbedding(`${title}\n\n${content.slice(0, 1000)}`);
    embeddings = embedding.vector;
  } catch (error) {
    console.warn('[RAG] Failed to generate embeddings:', error);
  }

  // Store document in IndexedDB
  const docId = await storeDocument({
    id,
    url,
    title,
    content,
    excerpt: excerpt || content.slice(0, 200),
    html,
    metadata,
    chunks,
    embeddings,
    embeddingModel: 'all-MiniLM-L6-v2',
    embeddingDimension: embeddings?.length,
  });

  // Index in FlexSearch
  const searchIndex = getGlobalSearchIndex();
  indexDocument(searchIndex, {
    id: docId,
    title,
    content,
    excerpt: excerpt || content.slice(0, 200),
    url,
  });

  return docId;
}

/**
 * Search stored documents using RAG
 */
export async function searchOfflineRAG(
  query: string,
  options: SearchOptions & { includeChunks?: boolean } = {}
): Promise<RAGResult> {
  const { includeChunks = false, limit = 10, ...searchOptions } = options;

  // Initialize search index if needed
  const searchIndex = getGlobalSearchIndex();
  if (searchIndex.documents.size === 0) {
    await initializeSearchIndex();
  }

  // Search using FlexSearch
  const searchResults = searchDocuments(searchIndex, query, {
    ...searchOptions,
    limit: limit * 2, // Get more results for better ranking
  });

  // Load full documents from IndexedDB
  const documents: RAGResult['documents'] = [];

  for (const result of searchResults.slice(0, limit)) {
    const fullDoc = await getDocument(result.id);
    if (!fullDoc) continue;

    // Calculate relevance score (0-1)
    const relevance = Math.min(1.0, result.score);

    // Find relevant chunks if requested
    let matchedChunks: DocumentChunk[] | undefined;
    if (includeChunks && fullDoc.chunks) {
      // Find chunks containing query terms
      const queryLower = query.toLowerCase();
      matchedChunks = fullDoc.chunks
        .filter(chunk => chunk.text.toLowerCase().includes(queryLower))
        .slice(0, 3); // Max 3 chunks per document
    }

    documents.push({
      document: fullDoc,
      score: result.score,
      relevance,
      matchedChunks,
    });
  }

  return {
    documents,
    totalResults: searchResults.length,
    query,
  };
}

/**
 * Get relevant context for a query (for LLM prompt building)
 */
export async function getRAGContext(
  query: string,
  options: { maxChunks?: number; maxDocuments?: number } = {}
): Promise<string> {
  const { maxChunks: _maxChunks = 5, maxDocuments = 3 } = options;

  const results = await searchOfflineRAG(query, {
    limit: maxDocuments,
    includeChunks: true,
  });

  // Build context string from top results
  const contextParts: string[] = [];

  for (const result of results.documents) {
    const doc = result.document;
    contextParts.push(`[Document: ${doc.title}]`);
    contextParts.push(`URL: ${doc.url}`);
    
    if (result.matchedChunks && result.matchedChunks.length > 0) {
      // Use matched chunks
      result.matchedChunks.forEach((chunk, idx) => {
        contextParts.push(`Chunk ${idx + 1}: ${chunk.text.slice(0, 500)}...`);
      });
    } else {
      // Use excerpt
      contextParts.push(`Content: ${doc.excerpt || doc.content.slice(0, 500)}...`);
    }
    
    contextParts.push('---');
  }

  return contextParts.join('\n\n');
}

/**
 * Delete a stored document from RAG system
 */
export async function deleteFromRAG(documentId: string): Promise<void> {
  const { deleteDocument } = await import('./indexedDB');
  
  // Remove from search index
  const searchIndex = getGlobalSearchIndex();
  removeFromIndex(searchIndex, documentId);
  
  // Delete from IndexedDB
  await deleteDocument(documentId);
}

