/**
 * Command History - Track recently used commands
 */
export interface CommandHistoryEntry {
    commandId: string;
    timestamp: number;
    query?: string;
}
declare class CommandHistory {
    private history;
    constructor();
    private load;
    private save;
    /**
     * Record a command execution
     */
    record(commandId: string, query?: string): void;
    /**
     * Get recent commands
     */
    getRecent(limit?: number): CommandHistoryEntry[];
    /**
     * Get command usage count
     */
    getUsageCount(commandId: string): number;
    /**
     * Get most used commands
     */
    getMostUsed(limit?: number): Array<{
        commandId: string;
        count: number;
    }>;
    /**
     * Clear history
     */
    clear(): void;
}
export declare const commandHistory: CommandHistory;
export {};
