/**
 * LLM Router - Hybrid offline/cloud LLM routing
 * Routes requests to local LLM (offline) or cloud provider (online)
 *
 * Priority: Local (if available) → Cloud (fallback)
 */
import type { LLMProvider } from '../core/llm/adapter';
export interface LLMRequest {
    prompt: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
}
export interface LLMResponse {
    text: string;
    provider: LLMProvider | 'local';
    model: string;
    latency: number;
    tokensUsed?: number;
}
/**
 * Main LLM Router - Routes to local or cloud based on availability
 */
export declare function queryLLM(request: LLMRequest): Promise<LLMResponse>;
/**
 * Stream LLM response (for real-time updates)
 */
export declare function streamLLM(request: LLMRequest): AsyncGenerator<string, void, unknown>;
/**
 * Set LLM preference (offline-first or cloud-first)
 */
export declare function setLLMPreference(preferOffline: boolean): void;
/**
 * Get current LLM preference
 */
export declare function getLLMPreference(): boolean;
