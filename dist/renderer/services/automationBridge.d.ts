/**
 * Automation Bridge - Connects PlaybookForge to AgentConsole
 * Handles automation execution, status, and feedback
 */
export interface AutomationPlaybook {
    id: string;
    title: string;
    goal: string;
    steps: Array<{
        skill: string;
        args: Record<string, any>;
    }>;
    output?: {
        type: string;
        schema?: Record<string, any>;
    };
}
export type AutomationStatus = 'idle' | 'running' | 'success' | 'error' | 'cancelled';
export interface AutomationExecution {
    id: string;
    playbookId: string;
    status: AutomationStatus;
    startTime: number;
    endTime?: number;
    error?: string;
    result?: any;
    progress?: number;
}
/**
 * Execute an automation playbook
 */
export declare function executeAutomation(playbook: AutomationPlaybook): Promise<string>;
/**
 * Get current automation execution status
 */
export declare function getAutomationStatus(): AutomationExecution | null;
/**
 * Subscribe to automation status updates
 */
export declare function onAutomationStatusUpdate(callback: (execution: AutomationExecution | null) => void): () => void;
/**
 * Update automation execution status
 */
export declare function updateAutomationStatus(executionId: string, updates: Partial<AutomationExecution>): void;
/**
 * Cancel current automation
 */
export declare function cancelAutomation(): void;
/**
 * Complete automation execution
 */
export declare function completeAutomation(executionId: string, result?: any, error?: string): void;
