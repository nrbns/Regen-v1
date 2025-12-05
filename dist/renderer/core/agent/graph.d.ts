/**
 * Agent Task Graph - Tier 3 Pillar 1
 * Graph-based multi-step task execution
 */
export type AgentNode = {
    id: string;
    tool: string;
    input: Record<string, unknown>;
    inputFrom?: string[];
    retryCount?: number;
    maxRetries?: number;
    timeout?: number;
};
export type AgentPlan = {
    id: string;
    nodes: AgentNode[];
    metadata?: {
        goal?: string;
        userId?: string;
        createdAt?: number;
    };
};
export type NodeResult = {
    nodeId: string;
    success: boolean;
    output?: unknown;
    error?: string;
    duration: number;
};
export type PlanExecutionResult = {
    planId: string;
    success: boolean;
    results: NodeResult[];
    finalOutput?: unknown;
    error?: string;
    totalDuration: number;
};
export interface ToolContext {
    planId: string;
    nodeId: string;
    previousResults: Map<string, unknown>;
    memory: AgentMemory;
}
export interface AgentMemory {
    get: (key: string) => unknown | null;
    set: (key: string, value: unknown) => void;
    remember: (type: 'preference' | 'fact' | 'task_history', key: string, value: unknown) => void;
}
declare class AgentTaskGraph {
    private toolRegistry;
    /**
     * Register a tool
     */
    registerTool(name: string, handler: (input: unknown, ctx: ToolContext) => Promise<unknown>): void;
    /**
     * Create a plan from a goal
     */
    createPlan(goal: string, nodes: Omit<AgentNode, 'id'>[]): AgentPlan;
    /**
     * Execute a plan
     */
    runPlan(plan: AgentPlan, memory: AgentMemory): Promise<PlanExecutionResult>;
    /**
     * Resolve node input from previous results
     */
    private resolveNodeInput;
    /**
     * Execute with timeout
     */
    private executeWithTimeout;
    /**
     * Retry a failed node
     */
    private retryNode;
}
export declare const agentTaskGraph: AgentTaskGraph;
export {};
