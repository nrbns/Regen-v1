/**
 * Command History - Track recently used commands
 */
const STORAGE_KEY = 'command-history';
const MAX_HISTORY = 50;
class CommandHistory {
    history = [];
    constructor() {
        this.load();
    }
    load() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                this.history = JSON.parse(stored);
            }
        }
        catch (error) {
            console.warn('[CommandHistory] Failed to load history:', error);
            this.history = [];
        }
    }
    save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.history));
        }
        catch (error) {
            console.warn('[CommandHistory] Failed to save history:', error);
        }
    }
    /**
     * Record a command execution
     */
    record(commandId, query) {
        // Remove existing entry if present
        this.history = this.history.filter(entry => entry.commandId !== commandId);
        // Add to front
        this.history.unshift({
            commandId,
            timestamp: Date.now(),
            query,
        });
        // Limit history size
        if (this.history.length > MAX_HISTORY) {
            this.history = this.history.slice(0, MAX_HISTORY);
        }
        this.save();
    }
    /**
     * Get recent commands
     */
    getRecent(limit = 10) {
        return this.history.slice(0, limit);
    }
    /**
     * Get command usage count
     */
    getUsageCount(commandId) {
        return this.history.filter(entry => entry.commandId === commandId).length;
    }
    /**
     * Get most used commands
     */
    getMostUsed(limit = 10) {
        const counts = new Map();
        for (const entry of this.history) {
            counts.set(entry.commandId, (counts.get(entry.commandId) || 0) + 1);
        }
        return Array.from(counts.entries())
            .map(([commandId, count]) => ({ commandId, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);
    }
    /**
     * Clear history
     */
    clear() {
        this.history = [];
        this.save();
    }
}
export const commandHistory = new CommandHistory();
