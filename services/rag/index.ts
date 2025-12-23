/**
 * RAG Module Exports
 */

export { VectorStore, globalVectorStore } from './vectorStore';
export type { Vector, StoredDocument, SearchResult } from './vectorStore';

export { EmbeddingService, globalEmbeddingService } from './embeddingService';
export type { EmbeddingRequest, EmbeddingResponse } from './embeddingService';

export { RAGEngine, globalRAGEngine } from './ragEngine';
export type { RAGContext, RAGConfig } from './ragEngine';

export { EmailRAGService, emailRAGService } from './emailRAG';
export type { EnhancedEmailSummary } from './emailRAG';
