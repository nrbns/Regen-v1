/**
 * Semantic Search for Offline RAG
 * Combines keyword search (FlexSearch) with semantic search (embeddings)
 */

import { searchOfflineRAG, type RAGResult } from './rag';
import { generateEmbedding, findSimilarDocuments, type Embedding } from './embeddings';
import { listDocuments, getDocument, type StoredDocument } from './indexedDB';

export interface SemanticSearchOptions {
  limit?: number;
  minSimilarity?: number; // 0-1
  useHybrid?: boolean; // Combine keyword + semantic
  keywordWeight?: number; // 0-1, weight for keyword search
  semanticWeight?: number; // 0-1, weight for semantic search
}

export interface SemanticSearchResult extends RAGResult {
  method: 'keyword' | 'semantic' | 'hybrid';
  embeddings?: Embedding[];
}

/**
 * Semantic search over offline documents
 */
export async function semanticSearch(
  query: string,
  options: SemanticSearchOptions = {}
): Promise<SemanticSearchResult> {
  const {
    limit = 10,
    minSimilarity = 0.5,
    useHybrid = true,
    keywordWeight = 0.4,
    semanticWeight = 0.6,
  } = options;

  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query);

  // Get all documents with embeddings
  const documents = await listDocuments({ limit: 1000 });

  // Try to get embeddings for documents
  // In production, embeddings would be stored with documents
  const documentsWithEmbeddings = await Promise.all(
    documents.map(async doc => {
      // Generate embedding if not already present
      if (!doc.embeddings || doc.embeddings.length === 0) {
        const embedding = await generateEmbedding(`${doc.title}\n\n${doc.content.slice(0, 1000)}`);
        return {
          id: doc.id,
          embedding,
          document: doc,
        };
      }

      // Use existing embedding
      return {
        id: doc.id,
        embedding: {
          vector: doc.embeddings,
          dimension: doc.embeddings.length,
          model: 'unknown',
        } as Embedding,
        document: doc,
      };
    })
  );

  if (useHybrid) {
    // Hybrid search: combine keyword and semantic
    const keywordResults = await searchOfflineRAG(query, { limit: limit * 2 });
    const semanticResults = await findSimilarDocuments(
      queryEmbedding,
      documentsWithEmbeddings,
      limit * 2
    );

    // Combine results
    const combinedResults = combineResults(
      keywordResults,
      semanticResults,
      documentsWithEmbeddings,
      keywordWeight,
      semanticWeight,
      limit
    );

    return {
      ...keywordResults,
      documents: combinedResults,
      method: 'hybrid',
    };
  } else {
    // Pure semantic search
    const semanticResults = await findSimilarDocuments(
      queryEmbedding,
      documentsWithEmbeddings,
      limit
    );

    // Filter by min similarity
    const filtered = semanticResults.filter(r => r.similarity >= minSimilarity);

    // Get full documents
    const resultDocuments = await Promise.all(
      filtered.map(async ({ id, similarity }) => {
        const doc = await getDocument(id);
        if (!doc) return null;

        return {
          document: doc,
          score: similarity,
          relevance: similarity,
          matchedChunks: undefined,
        };
      })
    );

    const validResults = resultDocuments.filter((r): r is NonNullable<typeof r> => r !== null);

    return {
      documents: validResults,
      totalResults: filtered.length,
      query,
      method: 'semantic',
    };
  }
}

/**
 * Combine keyword and semantic search results
 */
function combineResults(
  keywordResults: RAGResult,
  semanticResults: Array<{ id: string; similarity: number }>,
  documentsWithEmbeddings: Array<{ id: string; embedding: Embedding; document: StoredDocument }>,
  keywordWeight: number,
  semanticWeight: number,
  limit: number
): RAGResult['documents'] {
  // Create maps for quick lookup
  const keywordMap = new Map(keywordResults.documents.map(r => [r.document.id, r.score]));
  const semanticMap = new Map(semanticResults.map(r => [r.id, r.similarity]));

  // Combine scores
  const combinedScores = new Map<string, number>();

  // Add keyword scores
  for (const [id, score] of keywordMap.entries()) {
    combinedScores.set(id, (combinedScores.get(id) || 0) + score * keywordWeight);
  }

  // Add semantic scores
  for (const [id, similarity] of semanticMap.entries()) {
    combinedScores.set(id, (combinedScores.get(id) || 0) + similarity * semanticWeight);
  }

  // Convert to results
  const results: RAGResult['documents'] = [];

  for (const item of documentsWithEmbeddings) {
    const combinedScore = combinedScores.get(item.id);
    if (combinedScore !== undefined) {
      results.push({
        document: item.document,
        score: combinedScore,
        relevance: Math.min(1.0, combinedScore),
        matchedChunks: undefined,
      });
    }
  }

  // Sort by combined score
  results.sort((a, b) => b.score - a.score);

  return results.slice(0, limit);
}
