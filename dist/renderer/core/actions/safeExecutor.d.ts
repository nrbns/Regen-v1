/**
 * Safe Action Execution System
 * User-controlled, safe, predictable action execution
 */
export type ActionType = 'navigate' | 'click' | 'type' | 'extract' | 'summarize' | 'save_note' | 'open_tab' | 'close_tab' | 'fill_form' | 'screenshot';
export interface Action {
    type: ActionType;
    args: Record<string, unknown>;
    id?: string;
    requiresConsent?: boolean;
    risk?: 'low' | 'medium' | 'high';
}
export interface ActionResult {
    success: boolean;
    result?: unknown;
    error?: string;
    actionId?: string;
}
export interface ActionConsent {
    actionId: string;
    approved: boolean;
    timestamp: number;
}
declare class SafeActionExecutor {
    private pendingConsents;
    private consentHistory;
    /**
     * Execute action with safety checks
     */
    execute(action: Action, options?: {
        autoApprove?: boolean;
        onConsentRequired?: (action: Action) => Promise<boolean>;
    }): Promise<ActionResult>;
    /**
     * Execute multiple actions in sequence
     */
    executeBatch(actions: Action[], options?: {
        stopOnError?: boolean;
        autoApprove?: boolean;
        onConsentRequired?: (action: Action) => Promise<boolean>;
    }): Promise<ActionResult[]>;
    /**
     * Request user consent for action
     */
    private requestConsent;
    /**
     * Approve action consent
     */
    approveConsent(actionId: string): void;
    /**
     * Reject action consent
     */
    rejectConsent(actionId: string): void;
    /**
     * Validate action before execution
     */
    private validateAction;
    /**
     * Execute action
     */
    private executeAction;
    /**
     * Get consent history
     */
    getConsentHistory(): ActionConsent[];
    /**
     * Clear consent history
     */
    clearConsentHistory(): void;
}
export declare const safeActionExecutor: SafeActionExecutor;
export {};
