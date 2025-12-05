/**
 * Ollama Pre-connect Service - Telepathy Upgrade Phase 3
 * Pre-connect Ollama on app start to eliminate first-request latency
 */
/**
 * Pre-connect to Ollama on app startup
 * This eliminates the first-request latency when embedding is needed
 */
export declare function preconnectOllama(): Promise<boolean>;
/**
 * Check if Ollama is pre-connected
 */
export declare function isOllamaPreconnected(): boolean;
