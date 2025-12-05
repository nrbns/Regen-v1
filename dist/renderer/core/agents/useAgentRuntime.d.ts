import type { AgentRunRecord, AgentExecutionInput, AgentExecutionResult } from './types';
export declare function useAgentRuns(limit?: number): AgentRunRecord[];
export declare function useAgentExecutor(agentId?: string): (input: AgentExecutionInput & {
    signal?: AbortSignal;
}) => Promise<AgentExecutionResult>;
