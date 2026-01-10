/**
 * Audit Log - Persistent audit trail for all actions
 * 
 * Provides persistent storage and UI access to audit log.
 * All tool executions, commands, and security decisions are logged here.
 */

import type { AuditEntry } from './ToolGuard';

export interface PersistentAuditEntry extends AuditEntry {
  id: string;
  timestampISO: string; // ISO 8601 format
  formattedDate: string; // Human-readable date
  formattedTime: string; // Human-readable time
}

class AuditLogManager {
  private maxEntries: number = 1000; // Keep last 1000 entries
  private storageKey: string = 'regen:audit:log';
  private entries: PersistentAuditEntry[] = [];

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Load audit log from persistent storage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.entries = Array.isArray(parsed) ? parsed : [];
        // Ensure we don't exceed max entries
        if (this.entries.length > this.maxEntries) {
          this.entries = this.entries.slice(-this.maxEntries);
          this.saveToStorage();
        }
      }
    } catch (error) {
      console.error('[AuditLog] Failed to load from storage:', error);
      this.entries = [];
    }
  }

  /**
   * Save audit log to persistent storage
   */
  private saveToStorage(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.entries));
    } catch (error) {
      console.error('[AuditLog] Failed to save to storage:', error);
      // If storage is full, remove oldest entries
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        this.entries = this.entries.slice(-500); // Keep only last 500
        try {
          localStorage.setItem(this.storageKey, JSON.stringify(this.entries));
        } catch (retryError) {
          console.error('[AuditLog] Failed to save after cleanup:', retryError);
        }
      }
    }
  }

  /**
   * Add entry to audit log (called by ToolGuard)
   */
  addEntry(entry: AuditEntry): void {
    const timestamp = new Date(entry.timestamp);
    const persistentEntry: PersistentAuditEntry = {
      ...entry,
      id: `audit_${entry.timestamp}_${Math.random().toString(36).substr(2, 9)}`,
      timestampISO: timestamp.toISOString(),
      formattedDate: timestamp.toLocaleDateString(),
      formattedTime: timestamp.toLocaleTimeString(),
    };

    this.entries.push(persistentEntry);

    // Keep only last maxEntries
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries);
    }

    this.saveToStorage();

    // Emit event for UI to listen
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('regen:audit:entry', {
          detail: persistentEntry,
        })
      );
    }
  }

  /**
   * Get all audit entries
   */
  getAllEntries(): PersistentAuditEntry[] {
    return [...this.entries].reverse(); // Most recent first
  }

  /**
   * Get audit entries filtered by criteria
   */
  getEntries(filter?: {
    tool?: string;
    decision?: 'allowed' | 'blocked';
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
  }): PersistentAuditEntry[] {
    let filtered = [...this.entries];

    if (filter?.tool) {
      filtered = filtered.filter(e => e.tool === filter.tool);
    }

    if (filter?.decision) {
      filtered = filtered.filter(
        e => (filter.decision === 'allowed' ? e.decision.allowed : !e.decision.allowed)
      );
    }

    if (filter?.dateFrom) {
      filtered = filtered.filter(e => new Date(e.timestamp) >= filter.dateFrom!);
    }

    if (filter?.dateTo) {
      filtered = filtered.filter(e => new Date(e.timestamp) <= filter.dateTo!);
    }

    if (filter?.limit) {
      filtered = filtered.slice(0, filter.limit);
    }

    return filtered.reverse(); // Most recent first
  }

  /**
   * Get audit statistics
   */
  getStatistics(): {
    totalEntries: number;
    allowedActions: number;
    blockedActions: number;
    byTool: Record<string, { allowed: number; blocked: number }>;
    byRiskLevel: Record<string, number>;
  } {
    const stats = {
      totalEntries: this.entries.length,
      allowedActions: 0,
      blockedActions: 0,
      byTool: {} as Record<string, { allowed: number; blocked: number }>,
      byRiskLevel: {} as Record<string, number>,
    };

    for (const entry of this.entries) {
      if (entry.decision.allowed) {
        stats.allowedActions++;
      } else {
        stats.blockedActions++;
      }

      // By tool
      if (!stats.byTool[entry.tool]) {
        stats.byTool[entry.tool] = { allowed: 0, blocked: 0 };
      }
      if (entry.decision.allowed) {
        stats.byTool[entry.tool].allowed++;
      } else {
        stats.byTool[entry.tool].blocked++;
      }

      // By risk level
      const risk = entry.decision.risk || 'unknown';
      stats.byRiskLevel[risk] = (stats.byRiskLevel[risk] || 0) + 1;
    }

    return stats;
  }

  /**
   * Export audit log to JSON
   */
  exportToJSON(): string {
    return JSON.stringify(this.entries, null, 2);
  }

  /**
   * Export audit log to CSV
   */
  exportToCSV(): string {
    const headers = ['Timestamp', 'Tool', 'Decision', 'Risk', 'Reason', 'Input Preview', 'Context'];
    const rows = this.entries.map(entry => [
      entry.timestampISO,
      entry.tool,
      entry.decision.allowed ? 'ALLOWED' : 'BLOCKED',
      entry.decision.risk,
      entry.decision.reason || '',
      entry.inputPreview.substring(0, 100),
      JSON.stringify(entry.context).substring(0, 100),
    ]);

    return [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  }

  /**
   * Clear audit log
   */
  clear(): void {
    this.entries = [];
    this.saveToStorage();
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('regen:audit:cleared'));
    }
  }

  /**
   * Get audit log size (bytes)
   */
  getSize(): number {
    try {
      return new Blob([JSON.stringify(this.entries)]).size;
    } catch {
      return 0;
    }
  }
}

export const auditLogManager = new AuditLogManager();

// Listen for ToolGuard audit entries
if (typeof window !== 'undefined') {
  window.addEventListener('regen:toolguard:audit', ((e: CustomEvent<AuditEntry>) => {
    auditLogManager.addEntry(e.detail);
  }) as EventListener);
}
