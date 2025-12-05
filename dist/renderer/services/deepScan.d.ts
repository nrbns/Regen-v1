export type DeepScanStep = {
    label: string;
    status: 'running' | 'complete' | 'error';
    detail?: string;
    started_at: string;
    completed_at?: string;
};
export type DeepScanSource = {
    id?: string;
    title?: string;
    url?: string;
    domain?: string;
    snippet?: string;
    text?: string;
    sourceType?: string;
    relevanceScore?: number;
    metadata?: Record<string, unknown>;
    image?: string;
    wordCount?: number;
    lang?: string;
    contentHash?: string;
    fromCache?: boolean;
    rendered?: boolean;
    fetchedAt?: string;
};
export type DeepScanResponse = {
    query: string;
    sources: DeepScanSource[];
    search_results: Array<Record<string, unknown>>;
    steps: DeepScanStep[];
    created_at: string;
};
type DeepScanOptions = {
    urls?: string[];
    maxPages?: number;
    allowRender?: boolean;
};
export declare function runDeepScan(query: string, options?: DeepScanOptions): Promise<DeepScanResponse>;
export {};
