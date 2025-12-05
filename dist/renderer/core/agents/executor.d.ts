/**
 * Agent Executor - Safe execution environment for agent automation
 * Provides permission checks, audit logging, and sandboxing
 */
import type { DOMSelector, ClickOptions, FillOptions } from './primitives';
export type AgentAction = {
    type: 'click';
    selector: DOMSelector;
    options?: ClickOptions;
} | {
    type: 'fill';
    selector: DOMSelector;
    value: string;
    options?: FillOptions;
} | {
    type: 'read';
    selector: DOMSelector;
} | {
    type: 'readPage';
} | {
    type: 'scroll';
    direction: 'up' | 'down' | 'left' | 'right' | 'top' | 'bottom';
    amount?: number;
} | {
    type: 'wait';
    ms: number;
} | {
    type: 'waitForReady';
    timeout?: number;
} | {
    type: 'extract';
} | {
    type: 'save';
    url: string;
    title: string;
    content?: string;
    metadata?: Record<string, any>;
} | {
    type: 'navigate';
    url: string;
};
export type ActionRisk = 'low' | 'medium' | 'high';
export interface ExecutionContext {
    runId: string;
    tabId?: string;
    document?: Document;
    timeout?: number;
    maxSteps?: number;
    allowedDomains?: string[];
    deniedDomains?: string[];
    requireConsent?: boolean;
}
export interface AuditLog {
    runId: string;
    action: AgentAction;
    timestamp: number;
    result: 'success' | 'error' | 'blocked' | 'timeout' | 'consent_denied';
    error?: string;
    duration: number;
    risk: ActionRisk;
    requiresConsent: boolean;
    consentGranted?: boolean;
    metadata?: Record<string, any>;
}
export interface ExecutionResult {
    success: boolean;
    runId: string;
    steps: number;
    duration: number;
    result?: any;
    error?: string;
    auditLog: AuditLog[];
    blocked: boolean;
}
declare class AgentExecutor {
    private auditLogs;
    private activeRuns;
    private defaultTimeout;
    private defaultMaxSteps;
    /**
     * Determine action risk level
     */
    private getActionRisk;
    /**
     * Check if action requires consent
     */
    private requiresConsent;
    /**
     * Request consent for an action
     */
    private requestConsent;
    /**
     * Describe an action for consent prompts
     */
    private describeAction;
    /**
     * Check if domain is allowed
     */
    private isDomainAllowed;
    /**
     * Get document from context
     */
    private getDocument;
    /**
     * Execute a single action
     */
    private executeAction;
    /**
     * Log audit entry
     */
    private logAudit;
    /**
     * Execute a sequence of actions
     */
    execute(actions: AgentAction[], context: ExecutionContext): Promise<ExecutionResult>;
    /**
     * Get audit log for a run
     */
    getAuditLog(runId: string): AuditLog[];
    /**
     * Get all audit logs
     */
    getAllAuditLogs(): Map<string, AuditLog[]>;
    /**
     * Clear audit logs for a run
     */
    clearAuditLog(runId: string): void;
    /**
     * Clear all audit logs
     */
    clearAllAuditLogs(): void;
    /**
     * Cancel an active run
     */
    cancel(runId: string): boolean;
    /**
     * Get active runs
     */
    getActiveRuns(): string[];
}
export declare const executor: AgentExecutor;
export declare const executeActions: (actions: AgentAction[], context: ExecutionContext) => Promise<ExecutionResult>;
export declare const getAuditLog: (runId: string) => AuditLog[];
export declare const cancelRun: (runId: string) => boolean;
export declare const getActiveRuns: () => string[];
export {};
