/**
 * Task Resume System - Tier 2
 * Resume unsaved tasks after crash/reload
 */
export interface ResumeResult {
    success: boolean;
    restoredTabs: number;
    restoredMode: string | null;
    error?: string;
}
/**
 * Resume session from snapshot
 */
export declare function resumeSession(): Promise<ResumeResult>;
