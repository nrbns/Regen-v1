/**
 * Multi-Agent Handoff System
 * Enables agents to pass data and trigger actions in other modes
 */
export type HandoffTarget = 'research' | 'trade' | 'browse' | 'agent' | 'n8n';
export interface HandoffPayload {
    type: string;
    data: Record<string, unknown>;
    sourceMode: string;
    targetMode: HandoffTarget;
    language?: string;
    metadata?: {
        priority?: 'low' | 'medium' | 'high';
        autoExecute?: boolean;
        [key: string]: unknown;
    };
}
export interface HandoffResult {
    success: boolean;
    targetId?: string;
    error?: string;
    data?: unknown;
}
/**
 * Send handoff from one agent/mode to another
 */
export declare function sendHandoff(payload: HandoffPayload): Promise<HandoffResult>;
/**
 * Handoff to n8n workflow
 */
export declare function handoffToN8n(payload: HandoffPayload, language: string): Promise<HandoffResult>;
/**
 * Helper: Research → Trade handoff
 * Example: "Research Nifty news" → "Alert me when Nifty changes"
 */
export declare function researchToTrade(researchSummary: string, symbol?: string, language?: string): Promise<HandoffResult>;
/**
 * Helper: Trade → Research handoff
 * Example: "Analyze AAPL" → "Research AAPL fundamentals"
 */
export declare function tradeToResearch(symbol: string, query: string, language?: string): Promise<HandoffResult>;
