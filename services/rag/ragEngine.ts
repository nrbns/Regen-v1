/**
 * RAG (Retrieval-Augmented Generation) Engine
 * Combines vector search with LLM for context-aware responses
 */

import { globalVectorStore } from './vectorStore';
import { globalEmbeddingService } from './embeddingService';
import { LLMClient } from '../mailAgent/llmClient';

/**
 * RAG context
 */
export interface RAGContext {
  query: string;
  documents: Array<{
    id: string;
    content: string;
    similarity: number;
  }>;
  generatedResponse: string;
}

/**
 * RAG Configuration
 */
export interface RAGConfig {
  maxDocuments: number;
  minSimilarity: number;
  contextLength: number;
  systemPrompt: string;
}

/**
 * RAG Engine for context-aware generation
 */
export class RAGEngine {
  private llmClient: LLMClient;
  private config: RAGConfig;

  constructor(config?: Partial<RAGConfig>) {
    this.llmClient = new LLMClient();
    this.config = {
      maxDocuments: 5,
      minSimilarity: 0.4,
      contextLength: 2000,
      systemPrompt:
        'You are a helpful assistant. Use the provided context to answer questions accurately.',
      ...config,
    };
  }

  /**
   * Retrieve and augment (RAG)
   */
  async retrieveAndGenerate(userId: string, query: string): Promise<RAGContext> {
    // 1. Embed query
    const queryEmbedding = await globalEmbeddingService.embed(query);

    // 2. Search for relevant documents
    const documents = await globalVectorStore.search(
      userId,
      queryEmbedding,
      this.config.maxDocuments,
      this.config.minSimilarity
    );

    // 3. Build context from documents
    const context = this.buildContext(documents);

    // 4. Generate response with context
    const response = await this.generateWithContext(query, context);

    return {
      query,
      documents: documents.map(d => ({
        id: d.id,
        content: d.content.substring(0, 200), // Truncate for response
        similarity: d.similarity,
      })),
      generatedResponse: response,
    };
  }

  /**
   * Index document for RAG
   */
  async indexDocument(
    userId: string,
    content: string,
    metadata: Record<string, any> = {}
  ): Promise<string> {
    // Embed content
    const embedding = await globalEmbeddingService.embed(content);

    // Store in vector database
    const docId = await globalVectorStore.addDocument(userId, content, embedding, metadata);

    console.log(`[RAGEngine] Indexed document: ${docId}`);
    return docId;
  }

  /**
   * Index multiple documents (batch)
   */
  async indexBatch(
    userId: string,
    documents: Array<{ content: string; metadata?: Record<string, any> }>
  ): Promise<string[]> {
    const docIds: string[] = [];

    for (const doc of documents) {
      const docId = await this.indexDocument(userId, doc.content, doc.metadata);
      docIds.push(docId);
    }

    return docIds;
  }

  /**
   * Build context string from documents
   */
  private buildContext(
    documents: Array<{
      content: string;
      similarity: number;
    }>
  ): string {
    if (documents.length === 0) {
      return 'No relevant context found.';
    }

    const contextParts = documents.map(
      (doc, i) =>
        `[Source ${i + 1} (similarity: ${(doc.similarity * 100).toFixed(1)}%)]:\n${doc.content}`
    );

    const context = contextParts.join('\n\n');

    // Truncate if too long
    if (context.length > this.config.contextLength) {
      return context.substring(0, this.config.contextLength) + '...';
    }

    return context;
  }

  /**
   * Generate response with context
   */
  private async generateWithContext(query: string, context: string): Promise<string> {
    const prompt = `Context:
${context}

Question: ${query}

Answer based on the context above:`;

    try {
      const response = await this.llmClient.call({
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        system: this.config.systemPrompt,
        max_tokens: 500,
      });

      return response.trim();
    } catch (error) {
      console.error('[RAGEngine] Generation failed:', error);
      return 'Unable to generate response at this time.';
    }
  }

  /**
   * Get document statistics
   */
  async getStats(userId: string): Promise<{
    documentCount: number;
    config: RAGConfig;
  }> {
    const documentCount = await globalVectorStore.getUserDocumentCount(userId);

    return {
      documentCount,
      config: this.config,
    };
  }

  /**
   * Clear user documents
   */
  async clearDocuments(userId: string): Promise<number> {
    return await globalVectorStore.clearUserDocuments(userId);
  }
}

export const globalRAGEngine = new RAGEngine();
