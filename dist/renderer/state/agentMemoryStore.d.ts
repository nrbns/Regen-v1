export type AgentMemoryEntry = {
    id: string;
    agentId: string;
    runId?: string;
    prompt: string;
    response?: string;
    error?: string;
    success: boolean;
    createdAt: number;
    tokens?: {
        prompt?: number | null;
        completion?: number | null;
        total?: number | null;
    };
};
interface AgentMemoryState {
    entries: AgentMemoryEntry[];
    addEntry: (entry: Omit<AgentMemoryEntry, 'id' | 'createdAt'> & {
        createdAt?: number;
    }) => void;
    getRecentForAgent: (agentId?: string | null, limit?: number) => AgentMemoryEntry[];
    clearAgent: (agentId?: string | null) => void;
    clearAll: () => void;
}
export declare const useAgentMemoryStore: import("zustand").UseBoundStore<Omit<import("zustand").StoreApi<AgentMemoryState>, "persist"> & {
    persist: {
        setOptions: (options: Partial<import("zustand/middleware").PersistOptions<AgentMemoryState, AgentMemoryState>>) => void;
        clearStorage: () => void;
        rehydrate: () => Promise<void> | void;
        hasHydrated: () => boolean;
        onHydrate: (fn: (state: AgentMemoryState) => void) => () => void;
        onFinishHydration: (fn: (state: AgentMemoryState) => void) => () => void;
        getOptions: () => Partial<import("zustand/middleware").PersistOptions<AgentMemoryState, AgentMemoryState>>;
    };
}>;
export {};
