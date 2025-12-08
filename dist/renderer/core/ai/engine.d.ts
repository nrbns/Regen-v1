import { type LLMOptions, type LLMResponse } from '../llm/adapter';
export type AITaskKind = 'search' | 'agent' | 'chat' | 'summary';
export interface AITaskRequest {
    kind: AITaskKind;
    prompt: string;
    context?: Record<string, unknown>;
    mode?: string;
    metadata?: Record<string, string | number | boolean>;
    llm?: LLMOptions;
    stream?: boolean;
    signal?: AbortSignal | null;
}
export interface AITaskResult {
    text: string;
    provider: string;
    model: string;
    usage?: LLMResponse['usage'];
    latency?: number;
    citations?: Array<{
        title?: string;
        url?: string;
        snippet?: string;
        source?: string;
    }>;
    estimated_cost_usd?: number;
}
type StreamHandler = (event: {
    type: 'token' | 'done' | 'error';
    data?: string | AITaskResult;
}) => void;
/**
 * Enhanced AI Engine with provider chaining, rate limiting, and state persistence
 */
export declare class AIEngine {
    private readonly apiBase;
    private readonly requestQueue;
    private readonly providerChain;
    private readonly STATE_KEY;
    runTask(request: AITaskRequest, onStream?: StreamHandler): Promise<AITaskResult>;
    /**
     * Run multiple AI tasks in parallel (e.g., reasoning + summarization)
     * This allows independent tasks to execute simultaneously for faster responses
     */
    runParallelTasks(requests: AITaskRequest[], onStream?: (index: number, event: Parameters<StreamHandler>[0]) => void): Promise<AITaskResult[]>;
    private callBackendTask;
    /**
     * Run local LLM with provider chaining (OpenAI → Anthropic → Ollama)
     */
    private runLocalLLMWithFallback;
    private runLocalLLM;
    /**
     * Save AI task state to localStorage for crash recovery
     */
    private saveState;
    /**
     * Get last AI task state (for crash recovery)
     */
    getLastState(): {
        request: AITaskRequest;
        result?: AITaskResult;
    } | null;
    private resolveSystemPrompt;
    private trackTelemetry;
}
export declare const aiEngine: AIEngine;
export {};
