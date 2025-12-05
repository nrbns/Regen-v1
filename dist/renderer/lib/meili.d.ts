export interface MeiliDocument {
    id: string | number;
    [key: string]: any;
}
export interface MeiliTask {
    taskUid: number;
    status: string;
    type: string;
}
/**
 * Create index if it doesn't exist
 */
export declare function ensureIndex(index: string, primaryKey?: string): Promise<void>;
/**
 * Index documents in safe batches (max 900 per batch, max 10MB)
 */
export declare function indexDocuments(index: string, docs: MeiliDocument[], primaryKey?: string): Promise<MeiliTask[]>;
/**
 * Wait for task to complete
 */
export declare function waitForTask(taskUid: number, timeout?: number): Promise<boolean>;
/**
 * Search documents
 */
export declare function searchDocuments(index: string, query: string, options?: {
    limit?: number;
    offset?: number;
    filter?: string;
    sort?: string[];
}): Promise<{
    hits: any[];
    estimatedTotalHits: number;
    processingTimeMs: number;
}>;
/**
 * Multi-search across multiple indexes
 */
export declare function multiSearch(queries: Array<{
    indexUid: string;
    q: string;
    limit?: number;
    filter?: string;
    sort?: string[];
}>): Promise<{
    results: Array<{
        indexUid: string;
        hits: any[];
        estimatedTotalHits: number;
        processingTimeMs: number;
    }>;
}>;
/**
 * Delete documents
 */
export declare function deleteDocuments(index: string, documentIds: (string | number)[]): Promise<MeiliTask>;
/**
 * Check if MeiliSearch is running
 */
export declare function checkMeiliSearch(): Promise<boolean>;
