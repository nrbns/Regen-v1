/**
 * Agent Loop Resume System
 * Saves agent execution state to localStorage and restores on crash/reload
 */
import { type AgentStreamEvent } from '../../state/agentStreamStore';
export interface LoopState {
    runId: string;
    goal: string;
    status: 'idle' | 'connecting' | 'live' | 'complete' | 'error';
    transcript: string;
    events: AgentStreamEvent[];
    error: string | null;
    lastSaved: number;
    mode?: 'research' | 'trade' | 'browse' | 'agent';
    metadata?: {
        language?: string;
        [key: string]: unknown;
    };
}
/**
 * Save current agent loop state
 */
export declare function saveLoopState(state: Partial<LoopState>): void;
/**
 * Load all saved loop states
 */
export declare function loadAllLoopStates(): LoopState[];
/**
 * Load a specific loop state by runId
 */
export declare function loadLoopState(runId: string): LoopState | null;
/**
 * Resume a loop from saved state
 */
export declare function resumeLoop(runId: string): boolean;
/**
 * Delete a saved loop state
 */
export declare function deleteLoopState(runId: string): void;
export declare function startAutoSave(metadata?: LoopState['metadata']): void;
export declare function stopAutoSave(): void;
/**
 * Check for crashed loops on app start and offer to resume
 */
export declare function checkForCrashedLoops(): LoopState[];
