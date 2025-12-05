/**
 * EmbeddingService - orchestrates local + remote embedding providers
 * Falls back automatically so SuperMemory stays local-first.
 */
type EmbeddingProvider = 'openai' | 'huggingface' | 'local';
interface GenerateOptions {
    provider?: EmbeddingProvider;
    signal?: AbortSignal;
}
export declare class EmbeddingService {
    private statusCache;
    private preferredOrder;
    generateEmbedding(text: string, options?: GenerateOptions): Promise<number[]>;
    getPreferredProvider(): Promise<EmbeddingProvider>;
    private checkProvider;
    private checkOpenAI;
    private checkHuggingFace;
    private generateOpenAIEmbedding;
    private generateHuggingFaceEmbedding;
    private generateLocalEmbedding;
}
export declare const embeddingService: EmbeddingService;
export declare const generateEmbeddingVector: (text: string, options?: GenerateOptions) => Promise<number[]>;
export {};
