import type { AgentConfig, AgentExecutionInput, AgentExecutionResult, AgentRunRecord } from './types';
declare class AgentRuntime {
    private agents;
    private runs;
    private listeners;
    constructor();
    registerAgent(config: AgentConfig): void;
    getAgents(): AgentConfig[];
    getAgent(id: string): AgentConfig | undefined;
    onRunUpdate(cb: (run: AgentRunRecord) => void): () => void;
    execute(request: AgentExecutionInput & {
        agentId?: string;
        signal?: AbortSignal;
    }): Promise<AgentExecutionResult>;
    private updateRun;
    private selectAgentForPrompt;
    private buildToolset;
    private registerDefaultAgents;
    private persistAgentMemory;
    private createToolContext;
}
export declare const agentRuntime: AgentRuntime;
export {};
