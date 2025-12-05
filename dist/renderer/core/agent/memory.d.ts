/**
 * Agent Memory Layer - Tier 3 Pillar 1
 * Preference learning, task history, pattern recognition
 */
export type MemoryType = 'preference' | 'fact' | 'task_history';
export type MemoryItem = {
    id: string;
    type: MemoryType;
    key: string;
    value: unknown;
    createdAt: number;
    lastUsedAt: number;
    usageCount: number;
};
export interface AgentMemory {
    get: (key: string) => unknown | null;
    set: (key: string, value: unknown) => void;
    remember: (type: MemoryType, key: string, value: unknown) => void;
    getPreferences: () => Record<string, unknown>;
    getTaskHistory: (limit?: number) => MemoryItem[];
    findPatterns: (type: MemoryType) => MemoryItem[];
}
/**
 * Agent Memory implementation
 */
export declare class AgentMemoryImpl implements AgentMemory {
    get(key: string): unknown | null;
    set(key: string, value: unknown): void;
    remember(type: MemoryType, key: string, value: unknown): void;
    getPreferences(): Record<string, unknown>;
    getTaskHistory(limit?: number): MemoryItem[];
    findPatterns(type: MemoryType): MemoryItem[];
    /**
     * Infer preferences from usage patterns
     */
    inferPreferences(): Record<string, unknown>;
}
export declare const agentMemory: AgentMemoryImpl;
