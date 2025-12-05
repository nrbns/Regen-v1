/**
 * useAgentStream Hook
 * React hook for real-time agent task updates via WebSocket
 */
interface AgentStep {
    type: 'tool_call' | 'tool_result' | 'plan' | 'error';
    tool?: string;
    params?: any;
    result?: any;
    error?: string;
    timestamp: number;
}
interface AgentTask {
    id: string;
    task: string;
    status: 'planning' | 'executing' | 'completed' | 'error' | 'cancelled';
    steps: AgentStep[];
    progress: number;
    startTime?: number;
    endTime?: number;
}
interface UseAgentStreamOptions {
    sessionId?: string;
    wsUrl?: string;
    autoReconnect?: boolean;
    onTaskStart?: (task: AgentTask) => void;
    onTaskComplete?: (task: AgentTask) => void;
    onTaskError?: (task: AgentTask, error: string) => void;
    onStep?: (step: AgentStep) => void;
}
interface UseAgentStreamReturn {
    isConnected: boolean;
    currentTask: AgentTask | null;
    executeTask: (task: string, options?: any) => Promise<string | null>;
    cancelTask: (taskId: string) => Promise<boolean>;
    getTaskStatus: (taskId: string) => Promise<AgentTask | null>;
    getTools: () => Promise<any[]>;
}
export declare function useAgentStream(options?: UseAgentStreamOptions): UseAgentStreamReturn;
export {};
