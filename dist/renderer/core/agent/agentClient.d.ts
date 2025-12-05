/**
 * Agent Client - Frontend Integration
 * Calls Tauri commands for agent research and execution
 */
export interface ResearchAgentRequest {
    query: string;
    url?: string;
    context?: string;
    mode?: 'local' | 'remote' | 'hybrid';
}
export interface ResearchAgentResponse {
    agent_version: string;
    summary: {
        short: string;
        bullets: string[];
        keywords: string[];
    };
    actions: Array<{
        id: string;
        type: string;
        label: string;
        payload: any;
    }>;
    confidence: number;
    explainability: string;
    citations: number;
    hallucination: 'low' | 'medium' | 'high';
    query: string;
    processing_time_ms?: number;
}
export interface ExecuteRequest {
    actions: Array<{
        id: string;
        type: string;
        label: string;
        payload: any;
    }>;
    session_id?: string;
    user_id?: string;
}
export interface ExecuteResponse {
    status: string;
    results: any[];
    errors?: any[];
    executed_at: string;
}
/**
 * Call research agent
 */
export declare function researchAgent(request: ResearchAgentRequest): Promise<ResearchAgentResponse>;
/**
 * Execute agent actions
 */
export declare function executeAgent(request: ExecuteRequest): Promise<ExecuteResponse>;
/**
 * Start streaming agent research
 */
export declare function researchAgentStream(request: ResearchAgentRequest): Promise<void>;
/**
 * Listen for agent events (Tauri window events)
 */
export declare function onAgentEventStream(callback: (event: {
    type: string;
    payload: any;
}) => void): Promise<() => void>;
/**
 * Listen for agent events (legacy window events)
 */
export declare function onAgentEvent(event: 'agent-research-start' | 'agent-research-complete', callback: (data: any) => void): () => void;
