/**
 * Qdrant Vector Store
 * Production-grade vector database integration for embeddings
 */

const axios = require('axios');
const Pino = require('pino');

const logger = Pino({ name: 'qdrant-store' });

const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const COLLECTION_NAME = process.env.QDRANT_COLLECTION || 'regen-documents';
const VECTOR_SIZE = parseInt(process.env.EMBEDDING_DIM || '384', 10); // Default: all-MiniLM-L6-v2

class QdrantStore {
  constructor() {
    this.baseURL = QDRANT_URL;
    this.collectionName = COLLECTION_NAME;
    this.vectorSize = VECTOR_SIZE;
    this.initialized = false;
  }

  /**
   * Initialize collection
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      // Check if collection exists
      const exists = await this._collectionExists();
      
      if (!exists) {
        await this._createCollection();
        logger.info(`Created Qdrant collection: ${this.collectionName}`);
      } else {
        logger.info(`Using existing Qdrant collection: ${this.collectionName}`);
      }

      this.initialized = true;
    } catch (error) {
      logger.error({ error: error.message }, 'Failed to initialize Qdrant');
      this.initialized = false;
    }
  }

  /**
   * Check if collection exists
   */
  async _collectionExists() {
    try {
      const response = await axios.get(`${this.baseURL}/collections/${this.collectionName}`);
      return response.status === 200;
    } catch (error) {
      if (error.response?.status === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Create collection
   */
  async _createCollection() {
    const response = await axios.put(
      `${this.baseURL}/collections/${this.collectionName}`,
      {
        vectors: {
          size: this.vectorSize,
          distance: 'Cosine',
        },
        optimizers_config: {
          default_segment_number: 2,
        },
        replication_factor: 1,
      }
    );
    return response.data;
  }

  /**
   * Upsert vectors (insert or update)
   * PERFORMANCE FIX #4: Batch upsert with chunking for large datasets
   */
  async upsert(points, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    const { batchSize = 100, wait = true } = options;
    
    // PERFORMANCE FIX #4: Chunk large batches for better performance
    if (points.length <= batchSize) {
      return this._upsertBatch(points, wait);
    }

    // Process in chunks
    const chunks = [];
    for (let i = 0; i < points.length; i += batchSize) {
      chunks.push(points.slice(i, i + batchSize));
    }

    logger.info({ total: points.length, chunks: chunks.length }, 'Upserting in batches');

    const results = [];
    for (const chunk of chunks) {
      try {
        const result = await this._upsertBatch(chunk, wait);
        results.push(result);
      } catch (error) {
        logger.error({ error: error.message, chunkSize: chunk.length }, 'Failed to upsert chunk');
        throw error;
      }
    }

    return { processed: points.length, batches: chunks.length, results };
  }

  /**
   * Upsert a single batch
   */
  async _upsertBatch(points, wait = true) {
    try {
      const response = await axios.put(
        `${this.baseURL}/collections/${this.collectionName}/points`,
        {
          points: points.map(point => ({
            id: point.id,
            vector: point.vector,
            payload: {
              ...point.payload,
              timestamp: point.payload?.timestamp || Date.now(),
            },
          })),
        },
        {
          params: wait ? { wait: 'true' } : {},
        }
      );
      return response.data;
    } catch (error) {
      logger.error({ error: error.message }, 'Failed to upsert batch');
      throw error;
    }
  }

  /**
   * PERFORMANCE FIX #4: Prune old embeddings (>7 days)
   */
  async pruneOldEmbeddings(daysOld = 7) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const cutoffTimestamp = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
      
      // Scroll through all points to find old ones
      const oldPointIds = [];
      let offset = null;
      const limit = 100;

      do {
        const scrollParams = {
          limit,
          with_payload: true,
          with_vector: false,
        };
        if (offset) {
          scrollParams.offset = offset;
        }

        const response = await axios.post(
          `${this.baseURL}/collections/${this.collectionName}/points/scroll`,
          scrollParams
        );

        const points = response.data.result.points || [];
        const nextOffset = response.data.result.next_page_offset;

        // Filter old points
        for (const point of points) {
          const timestamp = point.payload?.timestamp || 0;
          if (timestamp < cutoffTimestamp) {
            oldPointIds.push(point.id);
          }
        }

        offset = nextOffset;
      } while (offset !== null);

      if (oldPointIds.length === 0) {
        logger.info('No old embeddings to prune');
        return { deleted: 0 };
      }

      // Delete old points in batches
      const deleteBatchSize = 100;
      let deleted = 0;

      for (let i = 0; i < oldPointIds.length; i += deleteBatchSize) {
        const batch = oldPointIds.slice(i, i + deleteBatchSize);
        const response = await axios.post(
          `${this.baseURL}/collections/${this.collectionName}/points/delete`,
          { points: batch },
          { params: { wait: 'true' } }
        );
        deleted += batch.length;
      }

      logger.info({ deleted, total: oldPointIds.length }, 'Pruned old embeddings');
      return { deleted, total: oldPointIds.length };
    } catch (error) {
      logger.error({ error: error.message }, 'Failed to prune old embeddings');
      throw error;
    }
  }

  /**
   * Search similar vectors
   */
  async search(queryVector, limit = 10, scoreThreshold = 0.5) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const response = await axios.post(
        `${this.baseURL}/collections/${this.collectionName}/points/search`,
        {
          vector: queryVector,
          limit,
          score_threshold: scoreThreshold,
          with_payload: true,
        }
      );
      return response.data.result || [];
    } catch (error) {
      logger.error({ error: error.message }, 'Failed to search vectors');
      throw error;
    }
  }

  /**
   * Delete points by IDs
   */
  async delete(ids) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const response = await axios.post(
        `${this.baseURL}/collections/${this.collectionName}/points/delete`,
        {
          points: ids,
        }
      );
      return response.data;
    } catch (error) {
      logger.error({ error: error.message }, 'Failed to delete points');
      throw error;
    }
  }

  /**
   * Get collection info
   */
  async getInfo() {
    try {
      const response = await axios.get(
        `${this.baseURL}/collections/${this.collectionName}`
      );
      return response.data.result;
    } catch (error) {
      logger.error({ error: error.message }, 'Failed to get collection info');
      return null;
    }
  }
}

// Singleton instance
let qdrantInstance = null;

function getQdrantStore() {
  if (!qdrantInstance) {
    qdrantInstance = new QdrantStore();
    qdrantInstance.initialize().catch(err => {
      logger.error({ error: err.message }, 'Qdrant initialization failed');
    });
  }
  return qdrantInstance;
}

module.exports = { QdrantStore, getQdrantStore };

