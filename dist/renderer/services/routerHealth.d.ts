/**
 * Router Health Service - Tier 2
 * Monitors health status of AI providers (Ollama + Hugging Face)
 */
export interface RouterHealth {
    ok: boolean;
    ollama: {
        available: boolean;
        avgLatencyMs: number | null;
    };
    hf: {
        available: boolean;
        avgLatencyMs: number | null;
    };
    redis?: 'connected' | 'disconnected';
    metrics?: {
        requests: {
            total: number;
            ollama: number;
            hf: number;
            fallbacks: number;
        };
    };
}
/**
 * Check router health status
 */
export declare function checkRouterHealth(): Promise<RouterHealth>;
/**
 * Start health polling
 */
export declare function startHealthPolling(callback: (health: RouterHealth) => void): void;
/**
 * Stop health polling
 */
export declare function stopHealthPolling(): void;
