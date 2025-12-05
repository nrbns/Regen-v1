/**
 * Hugging Face Embedding Integration
 * Uses Hugging Face Inference API for semantic embeddings
 */
/**
 * Generate embedding using Hugging Face API
 */
export declare function generateHuggingFaceEmbedding(text: string, model?: string): Promise<number[]>;
/**
 * Generate batch embeddings using Hugging Face API
 */
export declare function batchGenerateEmbeddings(texts: string[], model?: string): Promise<number[][]>;
/**
 * Check if Hugging Face API is available
 */
export declare function checkHuggingFaceAvailable(): Promise<boolean>;
