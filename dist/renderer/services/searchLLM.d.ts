export interface SearchLLMCitation {
    title: string;
    url: string;
    snippet?: string;
    source?: string;
}
export interface SearchLLMResponse {
    query: string;
    answer: string;
    citations: SearchLLMCitation[];
    raw_results: SearchLLMCitation[];
    timestamp: number;
    latency_ms?: number;
}
export declare function fetchSearchLLM(query: string): Promise<SearchLLMResponse>;
