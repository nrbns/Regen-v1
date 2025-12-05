/**
 * Action Executor - Safely executes parsed actions on the DOM
 * PR: Agent system core component
 */
import type { ParsedAction } from './intentParser';
import type { PageSnapshot } from './domAnalyzer';
export interface ExecutionResult {
    ok: boolean;
    action: ParsedAction;
    error?: string;
    info?: any;
    duration: number;
}
export interface ExecutionOptions {
    stopOnError?: boolean;
    delayBetween?: number;
    onProgress?: (index: number, result: ExecutionResult) => void;
}
/**
 * Execute a single action
 */
export declare function execAction(action: ParsedAction, snapshot?: PageSnapshot): Promise<ExecutionResult>;
/**
 * Execute multiple actions in sequence
 */
export declare function execActions(actions: ParsedAction[], snapshot?: PageSnapshot, options?: ExecutionOptions): Promise<ExecutionResult[]>;
