/**
 * Services Module
 * Central hub for all service module exports
 */

// Agent Services
export * from './mailAgent';
export * from './bookingAgent';
export * from './pptAgent';
export * from './agentOrchestrator';

// RAG Services
export {
  RAGEngine,
  VectorStore,
  EmbeddingService,
  EmailRAGService,
  globalRAGEngine,
  globalVectorStore,
  globalEmbeddingService,
} from './rag';

// Security Services
export {
  PermissionControl,
  TokenVault,
  TwoFactorAuth,
  RateLimiter,
  globalPermissionControl,
  requireAuth,
  require2FA,
  rateLimit,
} from './security';

// LLM Client
export { LLMClient, getCachedLLMClient, simpleCompletion, isLLMAvailable } from './llmClient';

// Voice Services
export * from './voice';

