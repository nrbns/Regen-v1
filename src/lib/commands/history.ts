/**
 * Command History - Track recently used commands
 */

const STORAGE_KEY = 'command-history';
const MAX_HISTORY = 50;

export interface CommandHistoryEntry {
  commandId: string;
  timestamp: number;
  query?: string; // Search query used
}

class CommandHistory {
  private history: CommandHistoryEntry[] = [];

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.history = JSON.parse(stored) as CommandHistoryEntry[];
      }
    } catch (error) {
      console.warn('[CommandHistory] Failed to load history:', error);
      this.history = [];
    }
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.history));
    } catch (error) {
      console.warn('[CommandHistory] Failed to save history:', error);
    }
  }

  /**
   * Record a command execution
   */
  record(commandId: string, query?: string): void {
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
  getRecent(limit: number = 10): CommandHistoryEntry[] {
    return this.history.slice(0, limit);
  }

  /**
   * Get command usage count
   */
  getUsageCount(commandId: string): number {
    return this.history.filter(entry => entry.commandId === commandId).length;
  }

  /**
   * Get most used commands
   */
  getMostUsed(limit: number = 10): Array<{ commandId: string; count: number }> {
    const counts = new Map<string, number>();
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
  clear(): void {
    this.history = [];
    this.save();
  }
}

export const commandHistory = new CommandHistory();

