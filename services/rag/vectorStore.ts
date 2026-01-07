/**
 * Vector Store Service
 * In-memory vector database with semantic search
 * Production: Replace with Pinecone, Weaviate, Milvus, or Qdrant
 */

/**
 * Vector embedding (768-dim from OpenAI or Anthropic)
 */
export type Vector = number[];

/**
 * Stored document with embedding
 */
export interface StoredDocument {
  id: string;
  userId: string;
  content: string;
  embedding: Vector;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Search result
 */
export interface SearchResult {
  id: string;
  content: string;
  similarity: number;
  metadata: Record<string, any>;
}

/**
 * Simple in-memory vector store
 * Production: Use Pinecone, Weaviate, or Milvus
 */
export class VectorStore {
  private documents = new Map<string, StoredDocument>();
  private userIndexes = new Map<string, Set<string>>(); // userId -> doc IDs

  /**
   * Store document with embedding
   */
  async addDocument(
    userId: string,
    content: string,
    embedding: Vector,
    metadata: Record<string, any> = {}
  ): Promise<string> {
    const id = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const doc: StoredDocument = {
      id,
      userId,
      content,
      embedding,
      metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.documents.set(id, doc);

    // Index by user
    if (!this.userIndexes.has(userId)) {
      this.userIndexes.set(userId, new Set());
    }
    this.userIndexes.get(userId)!.add(id);

    console.log(`[VectorStore] Added document: ${id} for ${userId}`);
    return id;
  }

  /**
   * Search similar documents
   */
  async search(
    userId: string,
    queryEmbedding: Vector,
    limit: number = 5,
    minSimilarity: number = 0.3
  ): Promise<SearchResult[]> {
    const userDocIds = this.userIndexes.get(userId) || new Set();
    const results: SearchResult[] = [];

    for (const docId of userDocIds) {
      const doc = this.documents.get(docId);
      if (!doc) continue;

      const similarity = this.cosineSimilarity(queryEmbedding, doc.embedding);

      if (similarity >= minSimilarity) {
        results.push({
          id: doc.id,
          content: doc.content,
          similarity,
          metadata: doc.metadata,
        });
      }
    }

    // Sort by similarity descending
    results.sort((a, b) => b.similarity - a.similarity);

    return results.slice(0, limit);
  }

  /**
   * Delete document
   */
  async deleteDocument(userId: string, docId: string): Promise<boolean> {
    const doc = this.documents.get(docId);
    if (!doc || doc.userId !== userId) {
      return false;
    }

    this.documents.delete(docId);
    this.userIndexes.get(userId)?.delete(docId);

    console.log(`[VectorStore] Deleted document: ${docId}`);
    return true;
  }

  /**
   * Delete all documents for user
   */
  async clearUserDocuments(userId: string): Promise<number> {
    const docIds = this.userIndexes.get(userId) || new Set();
    let count = 0;

    for (const docId of docIds) {
      this.documents.delete(docId);
      count++;
    }

    this.userIndexes.delete(userId);
    console.log(`[VectorStore] Cleared ${count} documents for ${userId}`);
    return count;
  }

  /**
   * Get document count for user
   */
  async getUserDocumentCount(userId: string): Promise<number> {
    return this.userIndexes.get(userId)?.size || 0;
  }

  /**
   * Cosine similarity between vectors
   */
  private cosineSimilarity(a: Vector, b: Vector): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }

    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Get document by ID
   */
  async getDocument(userId: string, docId: string): Promise<StoredDocument | null> {
    const doc = this.documents.get(docId);
    if (!doc || doc.userId !== userId) {
      return null;
    }
    return doc;
  }

  /**
   * List user documents
   */
  async listUserDocuments(userId: string, limit: number = 100): Promise<StoredDocument[]> {
    const docIds = this.userIndexes.get(userId) || new Set();
    const docs: StoredDocument[] = [];

    for (const docId of docIds) {
      const doc = this.documents.get(docId);
      if (doc) {
        docs.push(doc);
      }
    }

    return docs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, limit);
  }
}

export const globalVectorStore = new VectorStore();
