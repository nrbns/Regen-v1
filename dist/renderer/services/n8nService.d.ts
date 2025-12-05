/**
 * n8n Workflow Service
 * Handles workflow calls, loops, and execution
 */
export interface N8nWorkflowConfig {
    baseUrl?: string;
    webhookUrl?: string;
    apiKey?: string;
    workflowId?: string;
}
export interface N8nWorkflowCall {
    workflowId: string;
    data: Record<string, unknown>;
    language?: string;
    sourceMode?: string;
    metadata?: Record<string, unknown>;
}
export interface N8nWorkflowResult {
    success: boolean;
    workflowId: string;
    data?: unknown;
    error?: string;
    executionId?: string;
}
export interface N8nLoopConfig {
    workflowId: string;
    interval?: number;
    maxIterations?: number;
    condition?: (result: N8nWorkflowResult) => boolean;
    onIteration?: (result: N8nWorkflowResult, iteration: number) => void;
    onComplete?: (results: N8nWorkflowResult[]) => void;
    onError?: (error: Error) => void;
}
/**
 * Call an n8n workflow via webhook
 */
export declare function callN8nWorkflow(call: N8nWorkflowCall, config?: N8nWorkflowConfig): Promise<N8nWorkflowResult>;
/**
 * Execute an n8n workflow in a loop
 * Continues until condition returns false or maxIterations is reached
 */
export declare function runN8nWorkflowLoop(call: N8nWorkflowCall, loopConfig: N8nLoopConfig, config?: N8nWorkflowConfig): Promise<N8nWorkflowResult[]>;
/**
 * List available n8n workflows (requires n8n API)
 */
export declare function listN8nWorkflows(config?: N8nWorkflowConfig): Promise<Array<{
    id: string;
    name: string;
    description?: string;
}>>;
/**
 * Get workflow execution status
 */
export declare function getN8nWorkflowExecution(executionId: string, config?: N8nWorkflowConfig): Promise<{
    status: string;
    data?: unknown;
} | null>;
