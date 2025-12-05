/**
 * Guarded Agent Runner - PR: Fix tab switch race conditions
 * Prevents agent operations from affecting wrong tabs when user switches quickly
 */
/**
 * Guarded run agent - ensures tab still exists and is active before applying results
 */
export declare function guardedRunAgent(tabId: string, options?: {
    extractText?: boolean;
    sendToBackend?: boolean;
    onProgress?: (stage: string, data?: any) => void;
}): Promise<void>;
/**
 * Cancel any active run for a tab
 */
export declare function cancelAgentRun(tabId: string): void;
/**
 * Cancel all active runs
 */
export declare function cancelAllAgentRuns(): void;
