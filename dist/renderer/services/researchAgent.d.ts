/**
 * Research Agent Service (Frontend)
 * Client-side service for calling research agent API
 */
export interface ResearchAgentOptions {
    maxResults?: number;
    language?: string;
    useOnDeviceAI?: boolean;
    includeCitations?: boolean;
    format?: 'report' | 'bullets' | 'summary';
}
export interface ResearchAgentResult {
    success: boolean;
    query: string;
    summary: string;
    bullets?: string[];
    sources: Array<{
        url: string;
        title: string;
        snippet: string;
        relevance: number;
    }>;
    citations?: Array<{
        text: string;
        url: string;
    }>;
    confidence: number;
    method: 'ondevice' | 'cloud' | 'hybrid';
    latency_ms: number;
    error?: string;
}
/**
 * Execute research agent query
 */
export declare function executeResearchAgent(query: string, options?: ResearchAgentOptions): Promise<ResearchAgentResult>;
/**
 * Plan research task (returns steps)
 */
export declare function planResearchTask(query: string): Array<{
    step: string;
    description: string;
}>;
/**
 * Run research agent (alias for executeResearchAgent for backward compatibility)
 */
export declare const runResearchAgent: typeof executeResearchAgent;
/**
 * Execute research agent action (alias for executeResearchAgent)
 */
export declare const executeResearchAgentAction: typeof executeResearchAgent;
