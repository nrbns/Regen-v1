/**
 * Multi-Agent Layered System
 * Specialized agents for Trade, Research, Dev, Document, and Workflow modes
 */
import { type Action } from '../actions/safeExecutor';
export type AgentMode = 'trade' | 'research' | 'dev' | 'document' | 'workflow';
export interface AgentContext {
    mode: AgentMode;
    tabId?: string | null;
    sessionId?: string | null;
    url?: string;
    metadata?: Record<string, unknown>;
}
export interface AgentResult {
    success: boolean;
    data?: unknown;
    actions?: Action[];
    error?: string;
    runId?: string;
}
/**
 * Base Agent Class
 */
declare abstract class BaseAgent {
    protected mode: AgentMode;
    protected context: AgentContext;
    constructor(mode: AgentMode, context: AgentContext);
    abstract execute(query: string): Promise<AgentResult>;
    abstract getCapabilities(): string[];
}
/**
 * Trade Agent - Specialized for trading operations
 */
export declare class TradeAgent extends BaseAgent {
    constructor(context: AgentContext);
    getCapabilities(): string[];
    execute(query: string): Promise<AgentResult>;
}
/**
 * Research Agent - Multi-source research with LLM
 */
export declare class ResearchAgent extends BaseAgent {
    constructor(context: AgentContext);
    getCapabilities(): string[];
    execute(query: string): Promise<AgentResult>;
}
/**
 * Dev Agent - Auto-debug and code extraction
 */
export declare class DevAgent extends BaseAgent {
    constructor(context: AgentContext);
    getCapabilities(): string[];
    execute(query: string): Promise<AgentResult>;
}
/**
 * Document Agent - PDF/Doc insights and actions
 */
export declare class DocumentAgent extends BaseAgent {
    constructor(context: AgentContext);
    getCapabilities(): string[];
    execute(query: string): Promise<AgentResult>;
}
/**
 * Workflow Agent - Arc-like automated workflows
 */
export declare class WorkflowAgent extends BaseAgent {
    constructor(context: AgentContext);
    getCapabilities(): string[];
    execute(query: string): Promise<AgentResult>;
    private parseWorkflow;
}
/**
 * Multi-Agent System Manager
 */
declare class MultiAgentSystem {
    private agents;
    /**
     * Get or create agent for mode
     */
    getAgent(mode: AgentMode, context: AgentContext): BaseAgent;
    /**
     * Execute query with appropriate agent
     */
    execute(mode: AgentMode, query: string, context: AgentContext): Promise<AgentResult>;
    /**
     * Get agent capabilities
     */
    getCapabilities(mode: AgentMode, context: AgentContext): string[];
    /**
     * Execute batch with multiple agents
     */
    executeBatch(tasks: Array<{
        mode: AgentMode;
        query: string;
        context: AgentContext;
    }>): Promise<AgentResult[]>;
}
export declare const multiAgentSystem: MultiAgentSystem;
export {};
