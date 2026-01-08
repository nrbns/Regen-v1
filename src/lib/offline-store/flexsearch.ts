/**
 * FlexSearch Integration for Offline Full-Text Search
 * Provides fast, in-memory full-text search over stored documents
 */

// @ts-ignore - FlexSearch types may not be available
import FlexSearch from 'flexsearch';

export interface SearchOptions {
  limit?: number;
  threshold?: number; // Score threshold (0-1)
  fields?: string[]; // Fields to search in ['title', 'content', 'excerpt']
  fuzzy?: boolean; // Enable fuzzy matching
  suggest?: boolean; // Return suggestions
}

export interface FlexSearchIndex {
  index: any; // FlexSearch Index instance
  documents: Map<string, any>; // Document map by ID
}

/**
 * Create a new FlexSearch index
 */
export function createSearchIndex(): FlexSearchIndex {
  const index = new FlexSearch.Index({
    preset: 'performance', // 'memory' | 'performance' | 'match' | 'score'
    tokenize: 'forward', // 'forward' | 'reverse' | 'full'
    cache: 100, // Cache size
    context: {
      resolution: 9,
      depth: 2,
      bidirectional: true,
    },
  });

  return {
    index,
    documents: new Map(),
  };
}

/**
 * Add document to search index
 */
export function indexDocument(
  searchIndex: FlexSearchIndex,
  document: {
    id: string;
    title: string;
    content: string;
    excerpt?: string;
    url?: string;
  }
): void {
  // Combine searchable text
  const searchableText = [document.title, document.excerpt || '', document.content].join(' ');

  // Add to index
  searchIndex.index.add(document.id, searchableText);

  // Store document reference
  searchIndex.documents.set(document.id, {
    id: document.id,
    title: document.title,
    excerpt: document.excerpt,
    url: document.url,
  });
}

/**
 * Remove document from search index
 */
export function removeFromIndex(searchIndex: FlexSearchIndex, documentId: string): void {
  searchIndex.index.remove(documentId);
  searchIndex.documents.delete(documentId);
}

/**
 * Search documents
 */
export function searchDocuments(
  searchIndex: FlexSearchIndex,
  query: string,
  options: SearchOptions = {}
): Array<{ id: string; score: number; document: any }> {
  const { limit = 20, threshold = 0.1, fuzzy = true } = options;

  if (!query || query.trim().length === 0) {
    return [];
  }

  // Perform search
  const results = searchIndex.index.search(query, {
    limit,
    threshold,
    suggest: options.suggest || false,
    ...(fuzzy ? { suggest: true } : {}),
  });

  // Map results to documents with scores
  return results
    .map((result: any) => {
      const id = typeof result === 'string' ? result : result.id || result;
      const score = typeof result === 'object' && result.score ? result.score : 1.0;

      const document = searchIndex.documents.get(id);
      if (!document) return null;

      return {
        id,
        score,
        document,
      };
    })
    .filter((r: any) => r !== null)
    .sort((a: any, b: any) => b.score - a.score);
}

/**
 * Global search index instance (singleton)
 */
let globalSearchIndex: FlexSearchIndex | null = null;

/**
 * Get or create global search index
 */
export function getGlobalSearchIndex(): FlexSearchIndex {
  if (!globalSearchIndex) {
    globalSearchIndex = createSearchIndex();
  }
  return globalSearchIndex;
}

/**
 * Initialize search index from stored documents
 */
export async function initializeSearchIndex(): Promise<FlexSearchIndex> {
  const { listDocuments } = await import('./indexedDB');
  const searchIndex = getGlobalSearchIndex();

  // Load all documents and index them
  const documents = await listDocuments({ limit: 1000 }); // Load first 1000

  for (const doc of documents) {
    indexDocument(searchIndex, {
      id: doc.id,
      title: doc.title,
      content: doc.content,
      excerpt: doc.excerpt,
      url: doc.url,
    });
  }

  return searchIndex;
}
