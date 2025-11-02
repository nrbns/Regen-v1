/**
 * OmniBrain - Local RAG Vector Store
 * Stores embeddings for local retrieval-augmented generation
 */

import { getOllamaAdapter } from '../agent/ollama-adapter';
import fs from 'node:fs/promises';
import path from 'node:path';
import { app } from 'electron';

export interface VectorDocument {
  id: string;
  text: string;
  url?: string;
  metadata?: Record<string, unknown>;
  embedding?: number[];
  timestamp: number;
}

export interface SearchResult {
  document: VectorDocument;
  similarity: number;
}

export class VectorStore {
  private documents: VectorDocument[] = [];
  private storagePath: string;

  constructor() {
    this.storagePath = path.join(app.getPath('userData'), 'vector-store');
    this.ensureStorageDir();
  }

  /**
   * Add document to vector store
   */
  async addDocument(document: Omit<VectorDocument, 'id' | 'timestamp' | 'embedding'>): Promise<string> {
    const id = `doc_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    
    // Generate embedding
    const embedding = await this.generateEmbedding(document.text);
    
    const fullDocument: VectorDocument = {
      ...document,
      id,
      timestamp: Date.now(),
      embedding,
    };

    this.documents.push(fullDocument);
    await this.persist();
    
    return id;
  }

  /**
   * Search documents by query
   */
  async search(query: string, limit = 10): Promise<SearchResult[]> {
    // Generate query embedding
    const queryEmbedding = await this.generateEmbedding(query);

    // Calculate similarities
    const results: SearchResult[] = [];

    for (const doc of this.documents) {
      if (!doc.embedding) continue;

      const similarity = this.cosineSimilarity(queryEmbedding, doc.embedding);
      results.push({
        document: doc,
        similarity,
      });
    }

    // Sort by similarity and return top results
    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  /**
   * Get document by ID
   */
  getDocument(id: string): VectorDocument | undefined {
    return this.documents.find(d => d.id === id);
  }

  /**
   * Delete document
   */
  async deleteDocument(id: string): Promise<void> {
    this.documents = this.documents.filter(d => d.id !== id);
    await this.persist();
  }

  /**
   * List all documents
   */
  listDocuments(): VectorDocument[] {
    return [...this.documents];
  }

  /**
   * Clear all documents
   */
  async clear(): Promise<void> {
    this.documents = [];
    await this.persist();
  }

  /**
   * Generate embedding for text
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    const ollama = getOllamaAdapter();
    const isAvailable = await ollama.checkAvailable();

    if (!isAvailable) {
      // Fallback: hash-based embedding
      return this.hashBasedEmbedding(text);
    }

    try {
      const response = await fetch('http://localhost:11434/api/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3.2',
          prompt: text.substring(0, 2048), // Limit text length
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama embeddings error: ${response.statusText}`);
      }

      const data = await response.json() as { embedding: number[] };
      return data.embedding;
    } catch {
      return this.hashBasedEmbedding(text);
    }
  }

  /**
   * Cosine similarity
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator > 0 ? dotProduct / denominator : 0;
  }

  /**
   * Hash-based embedding fallback
   */
  private hashBasedEmbedding(text: string): number[] {
    const vector: number[] = new Array(32).fill(0);
    for (let i = 0; i < text.length; i++) {
      const hash = text.charCodeAt(i);
      vector[hash % 32] += hash / 255;
    }
    const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    return vector.map(v => magnitude > 0 ? v / magnitude : 0);
  }

  /**
   * Persist documents to disk
   */
  private async persist(): Promise<void> {
    const filePath = path.join(this.storagePath, 'documents.json');
    const data = this.documents.map(d => ({
      ...d,
      embedding: d.embedding, // Store embedding
    }));
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  /**
   * Load documents from disk
   */
  async load(): Promise<void> {
    const filePath = path.join(this.storagePath, 'documents.json');
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      this.documents = JSON.parse(content) as VectorDocument[];
    } catch {
      // File doesn't exist yet, start empty
      this.documents = [];
    }
  }

  private async ensureStorageDir(): Promise<void> {
    try {
      await fs.mkdir(this.storagePath, { recursive: true });
      await this.load();
    } catch (error) {
      console.error('[VectorStore] Failed to create storage directory:', error);
    }
  }
}

// Singleton instance
let vectorStoreInstance: VectorStore | null = null;

export function getVectorStore(): VectorStore {
  if (!vectorStoreInstance) {
    vectorStoreInstance = new VectorStore();
    vectorStoreInstance.load(); // Load on init
  }
  return vectorStoreInstance;
}

