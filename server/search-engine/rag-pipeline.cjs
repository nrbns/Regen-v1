/**
 * Production RAG Pipeline
 * Orchestrates: Crawl → Store → Chunk → Embed → Index → Query → Synthesize
 */

const { getStorage } = require('./storage.cjs');
const { Chunker } = require('./chunker.cjs');
const { getEmbedder } = require('./embedder.cjs');
const { getQdrantStore } = require('./qdrant-store.cjs');
const Pino = require('pino');

const logger = Pino({ name: 'rag-pipeline' });

class RAGPipeline {
  constructor() {
    this.storage = getStorage();
    this.chunker = new Chunker();
    this.embedder = getEmbedder();
    this.qdrant = getQdrantStore();
  }

  /**
   * Process and index a document
   */
  async indexDocument(url, html, metadata = {}) {
    try {
      logger.info({ url }, 'Indexing document');

      // 1. Store HTML snapshot
      const snapshot = await this.storage.storeSnapshot(url, html, metadata);
      if (!snapshot) {
        logger.warn({ url }, 'Failed to store snapshot, continuing without it');
      }

      // 2. Chunk the content
      const chunks = this.chunker.chunkHTML(html, {
        ...metadata,
        url,
        snapshotKey: snapshot?.key,
      });

      logger.debug({ url, chunkCount: chunks.length }, 'Chunked document');

      // 3. Generate embeddings for all chunks in batch
      // PERFORMANCE FIX #4: Use batch embedding for better performance
      const chunkTexts = chunks.map(chunk => chunk.text);
      const embeddingResults = await this.embedder.embedBatch(chunkTexts, {
        concurrency: 5,
        batchSize: 10,
      });

      // 4. Build points array from batch results
      const points = [];
      for (let i = 0; i < embeddingResults.length; i++) {
        const result = embeddingResults[i];
        const chunk = chunks[i];
        
        if (result.embedding) {
          points.push({
            id: `${url}-${i}`, // Simple ID generation
            vector: result.embedding,
            payload: {
              url,
              text: chunk.text,
              start: chunk.start,
              end: chunk.end,
              chunkIndex: i,
              totalChunks: chunks.length,
              ...metadata,
              snapshotKey: snapshot?.key,
              timestamp: Date.now(),
            },
          });
        } else {
          logger.warn({ url, chunkIndex: i, error: result.error }, 'Failed to embed chunk in batch');
        }
      }

      // 5. Store in Qdrant with batch upsert
      if (points.length > 0) {
        await this.qdrant.upsert(points, { batchSize: 100 });
        logger.info({ url, pointsCount: points.length }, 'Indexed document in Qdrant');
      }

      return {
        success: true,
        url,
        chunks: chunks.length,
        points: points.length,
        snapshot: snapshot?.key,
      };
    } catch (error) {
      logger.error({ url, error: error.message }, 'Failed to index document');
      throw error;
    }
  }

  /**
   * Search documents (vector + lexical hybrid)
   */
  async search(query, options = {}) {
    const {
      limit = 10,
      scoreThreshold = 0.5,
      useLexical = true, // BM25 fallback
    } = options;

    try {
      // 1. Generate query embedding
      const queryEmbedding = await this.embedder.embed(query);

      // 2. Vector search in Qdrant
      const vectorResults = await this.qdrant.search(queryEmbedding, limit * 2, scoreThreshold);

      // 3. Lexical search (simple keyword matching for now)
      // TODO: Implement proper BM25 with full-text search
      let lexicalResults = [];
      if (useLexical) {
        // Simple keyword matching (can be enhanced with proper BM25)
        const keywords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
        // For now, we'll rely on vector search
        // In production, add proper full-text search index
      }

      // 4. Combine and rerank results
      const results = this._rerankResults(vectorResults, query, limit);

      return {
        query,
        results,
        count: results.length,
      };
    } catch (error) {
      logger.error({ query, error: error.message }, 'Search failed');
      throw error;
    }
  }

  /**
   * Rerank results (simple approach - can be enhanced with LLM reranker)
   */
  _rerankResults(vectorResults, query, limit) {
    // Simple reranking: boost results with query keywords in text
    const keywords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    
    const scored = vectorResults.map(result => {
      const text = (result.payload?.text || '').toLowerCase();
      let score = result.score || 0;
      
      // Boost score for keyword matches
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          score += 0.1; // Small boost
        }
      }
      
      return {
        ...result,
        finalScore: score,
      };
    });

    // Sort by final score and limit
    return scored
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, limit)
      .map(result => ({
        id: result.id,
        score: result.finalScore,
        url: result.payload?.url,
        text: result.payload?.text,
        chunkIndex: result.payload?.chunkIndex,
        metadata: result.payload,
      }));
  }

  /**
   * Synthesize answer from search results (streaming)
   */
  async synthesize(query, searchResults, streamCallback) {
    // This will be implemented with LLM streaming
    // For now, return a simple synthesis
    const sources = searchResults.slice(0, 5);
    const context = sources.map(s => s.text).join('\n\n');
    
    // TODO: Implement actual LLM streaming synthesis
    // This is a placeholder
    const answer = `Based on the search results, here's what I found about "${query}":\n\n${context.substring(0, 500)}...`;
    
    if (streamCallback) {
      // Simulate streaming
      const words = answer.split(' ');
      for (let i = 0; i < words.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 50));
        streamCallback(words[i] + ' ');
      }
    }
    
    return {
      answer,
      sources: sources.map(s => ({
        url: s.url,
        text: s.text,
        score: s.score,
      })),
    };
  }
}

// Singleton instance
let pipelineInstance = null;

function getRAGPipeline() {
  if (!pipelineInstance) {
    pipelineInstance = new RAGPipeline();
  }
  return pipelineInstance;
}

module.exports = { RAGPipeline, getRAGPipeline };

