import type { ActionExecutionResult } from '../services/agenticActions';
type ActionProgress = {
    action: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    progress?: number;
    message?: string;
    cancellable?: boolean;
};
type VoiceControlState = {
    status: 'idle' | 'listening' | 'running' | 'error';
    transcript: string;
    stream: string;
    actions: string[];
    actionResults: ActionExecutionResult[];
    actionProgress: Record<string, ActionProgress>;
    error?: string;
    setStatus: (status: VoiceControlState['status']) => void;
    setTranscript: (text: string) => void;
    appendStream: (chunk: string) => void;
    setActions: (actions: string[]) => void;
    setActionResults: (results: ActionExecutionResult[]) => void;
    setActionProgress: (action: string, progress: ActionProgress) => void;
    clearActionProgress: (action: string) => void;
    cancelledActions: Set<string>;
    cancelAction: (action: string) => void;
    isActionCancelled: (action: string) => boolean;
    setError: (message: string | undefined) => void;
    reset: () => void;
};
export declare const useVoiceControlStore: import("zustand").UseBoundStore<import("zustand").StoreApi<VoiceControlState>>;
export type StreamStatus = 'idle' | 'connecting' | 'live' | 'complete' | 'error';
export interface AgentStreamEvent {
    id: string;
    type: 'start' | 'step' | 'log' | 'done' | 'consent' | 'error';
    step?: number;
    status?: string;
    content?: string;
    timestamp: number;
    risk?: 'low' | 'medium' | 'high';
    approved?: boolean;
    tabId?: string | null;
    sessionId?: string | null;
}
interface AgentStreamState {
    runId: string | null;
    status: StreamStatus;
    transcript: string;
    events: AgentStreamEvent[];
    error: string | undefined;
    lastGoal: string | null;
    activeTabId: string | null;
    setRun: (runId: string, goal: string | null, tabId?: string | null) => void;
    setStatus: (status: StreamStatus) => void;
    setError: (error: string | undefined) => void;
    appendEvent: (event: AgentStreamEvent) => void;
    appendTranscript: (delta: string) => void;
    setActiveTabId: (tabId: string | null) => void;
    reset: () => void;
}
export declare const useAgentStreamStore: import("zustand").UseBoundStore<Omit<import("zustand").StoreApi<AgentStreamState>, "persist"> & {
    persist: {
        setOptions: (options: Partial<import("zustand/middleware").PersistOptions<AgentStreamState, {
            runId: string | null;
            status: StreamStatus;
            transcript: string;
            events: AgentStreamEvent[];
            lastGoal: string | null;
            activeTabId: string | null;
        }>>) => void;
        clearStorage: () => void;
        rehydrate: () => Promise<void> | void;
        hasHydrated: () => boolean;
        onHydrate: (fn: (state: AgentStreamState) => void) => () => void;
        onFinishHydration: (fn: (state: AgentStreamState) => void) => () => void;
        getOptions: () => Partial<import("zustand/middleware").PersistOptions<AgentStreamState, {
            runId: string | null;
            status: StreamStatus;
            transcript: string;
            events: AgentStreamEvent[];
            lastGoal: string | null;
            activeTabId: string | null;
        }>>;
    };
}>;
export {};
