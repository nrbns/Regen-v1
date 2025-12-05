/**
 * OmniAgent Runner - Tier 2
 * Executes agent tasks using registered tools
 */
export type AgentTask = {
    type: 'quick_summary';
    url: string;
} | {
    type: 'deep_research';
    topic: string;
    maxSources?: number;
} | {
    type: 'compare_urls';
    urls: string[];
} | {
    type: 'explain_page';
    url: string;
};
export interface AgentResult {
    type: string;
    content: string;
    sources?: Array<{
        url: string;
        title: string;
    }>;
    metadata?: Record<string, unknown>;
}
/**
 * Run an agent task
 */
export declare function runAgent(task: AgentTask): Promise<AgentResult>;
