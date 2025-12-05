/**
 * LLM Adapter - Unified interface for multiple LLM providers
 * Supports OpenAI, Anthropic, and Mistral with automatic fallback
 */
export type LLMProvider = 'openai' | 'anthropic' | 'mistral' | 'ollama';
export type LLMModel = string;
export interface LLMOptions {
    provider?: LLMProvider;
    model?: LLMModel;
    maxTokens?: number;
    temperature?: number;
    topP?: number;
    stream?: boolean;
    systemPrompt?: string;
    stopSequences?: string[];
}
export interface LLMResponse {
    text: string;
    raw: any;
    provider: LLMProvider;
    model: string;
    usage?: {
        promptTokens?: number;
        completionTokens?: number;
        totalTokens?: number;
    };
    latency?: number;
}
export interface LLMError {
    code: string;
    message: string;
    provider: LLMProvider;
    retryable: boolean;
}
/**
 * Send a prompt to an LLM provider
 * Automatically handles retries, fallbacks, and error recovery
 */
export declare function sendPrompt(prompt: string, options?: LLMOptions): Promise<LLMResponse>;
/**
 * Stream a prompt to an LLM provider (for real-time responses)
 */
export declare function streamPrompt(prompt: string, options: LLMOptions | undefined, onChunk: (chunk: string) => void): Promise<LLMResponse>;
/**
 * Get available providers based on configured API keys
 */
export declare function getAvailableProviders(): LLMProvider[];
