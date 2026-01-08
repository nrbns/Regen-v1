/**
 * Hybrid Search for Offline RAG
 * Combines keyword (FlexSearch), semantic (embeddings), and metadata search
 */

import { searchOfflineRAG } from './rag';
import { semanticSearch } from './semantic-search';
import { type StoredDocument } from './indexedDB';

export interface HybridSearchOptions {
  limit?: number;
  keywordWeight?: number; // 0-1
  semanticWeight?: number; // 0-1
  metadataWeight?: number; // 0-1
  minScore?: number;
  useFuzzy?: boolean;
}

export interface HybridSearchResult {
  documents: Array<{
    document: StoredDocument;
    keywordScore: number;
    semanticScore: number;
    metadataScore: number;
    combinedScore: number;
    relevance: number;
  }>;
  totalResults: number;
  query: string;
  method: 'hybrid';
}

/**
 * Hybrid search combining all methods
 */
export async function hybridSearch(
  query: string,
  options: HybridSearchOptions = {}
): Promise<HybridSearchResult> {
  const {
    limit = 10,
    keywordWeight = 0.4,
    semanticWeight = 0.5,
    metadataWeight = 0.1,
    minScore = 0.3,
    useFuzzy: _useFuzzy = true,
  } = options;

  // Normalize weights
  const totalWeight = keywordWeight + semanticWeight + metadataWeight;
  const normalizedKeywordWeight = keywordWeight / totalWeight;
  const normalizedSemanticWeight = semanticWeight / totalWeight;
  const normalizedMetadataWeight = metadataWeight / totalWeight;

  // Run searches in parallel
  const [keywordResults, semanticResults] = await Promise.all([
    searchOfflineRAG(query, { limit: limit * 2, includeChunks: false }),
    semanticSearch(query, { limit: limit * 2, useHybrid: false }),
  ]);

  // Create combined result map
  const combinedMap = new Map<
    string,
    {
      document: StoredDocument;
      keywordScore: number;
      semanticScore: number;
      metadataScore: number;
    }
  >();

  // Add keyword results
  for (const result of keywordResults.documents) {
    combinedMap.set(result.document.id, {
      document: result.document,
      keywordScore: result.score,
      semanticScore: 0,
      metadataScore: 0,
    });
  }

  // Add semantic results
  for (const result of semanticResults.documents) {
    const existing = combinedMap.get(result.document.id);
    if (existing) {
      existing.semanticScore = result.score;
    } else {
      combinedMap.set(result.document.id, {
        document: result.document,
        keywordScore: 0,
        semanticScore: result.score,
        metadataScore: 0,
      });
    }
  }

  // Calculate metadata scores (simple tag/domain matching)
  for (const [_id, item] of combinedMap.entries()) {
    const doc = item.document;
    let metadataScore = 0;

    // URL matching
    if (doc.url && doc.url.toLowerCase().includes(query.toLowerCase())) {
      metadataScore += 0.3;
    }

    // Tag matching
    if (doc.metadata?.tags) {
      const matchingTags = doc.metadata.tags.filter(tag =>
        tag.toLowerCase().includes(query.toLowerCase())
      ).length;
      metadataScore += matchingTags * 0.2;
    }

    // Domain matching
    if (doc.url) {
      try {
        const domain = new URL(doc.url).hostname.toLowerCase();
        if (domain.includes(query.toLowerCase())) {
          metadataScore += 0.2;
        }
      } catch {
        // Invalid URL, skip
      }
    }

    item.metadataScore = Math.min(1.0, metadataScore);
  }

  // Calculate combined scores
  const combinedResults = Array.from(combinedMap.values())
    .map(item => {
      const combinedScore =
        item.keywordScore * normalizedKeywordWeight +
        item.semanticScore * normalizedSemanticWeight +
        item.metadataScore * normalizedMetadataWeight;

      return {
        document: item.document,
        keywordScore: item.keywordScore,
        semanticScore: item.semanticScore,
        metadataScore: item.metadataScore,
        combinedScore,
        relevance: Math.min(1.0, combinedScore),
      };
    })
    .filter(item => item.combinedScore >= minScore)
    .sort((a, b) => b.combinedScore - a.combinedScore)
    .slice(0, limit);

  return {
    documents: combinedResults,
    totalResults: combinedResults.length,
    query,
    method: 'hybrid',
  };
}
