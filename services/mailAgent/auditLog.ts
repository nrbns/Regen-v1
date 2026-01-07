/**
 * Audit Logger
 * Immutable append-only log of all agent actions
 * For compliance, debugging, and user transparency
 */

import type { AuditLogEntry } from './types';
import * as fs from 'fs';
import * as path from 'path';

/**
 * In-memory audit store (in production: PostgreSQL)
 */
const auditStore: AuditLogEntry[] = [];

/**
 * File-based audit log (for persistence during dev)
 */
const auditLogFile = path.join(process.cwd(), '.audit-log.jsonl');

/**
 * Audit Logger
 * - Immutable (append-only)
 * - Timestamped entries
 * - Queryable by user/action/date
 */
export class AuditLogger {
  /**
   * Log an action (immutable append)
   */
  async log(entry: Omit<AuditLogEntry, 'id'>): Promise<AuditLogEntry> {
    const logEntry: AuditLogEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...entry,
    };

    // Append to in-memory store
    auditStore.push(logEntry);

    // Persist to file (for development)
    if (process.env.NODE_ENV !== 'test') {
      try {
        fs.appendFileSync(auditLogFile, JSON.stringify(logEntry) + '\n', 'utf-8');
      } catch (error) {
        console.error('[AuditLogger] Failed to persist to file:', error);
        // Non-blocking: continue even if file write fails
      }
    }

    console.log(`[AuditLogger] Logged: ${logEntry.action} for user ${logEntry.userId}`);
    return logEntry;
  }

  /**
   * Query logs by user
   */
  async queryByUser(userId: string): Promise<AuditLogEntry[]> {
    return auditStore.filter((entry) => entry.userId === userId);
  }

  /**
   * Query logs by plan
   */
  async queryByPlan(planId: string): Promise<AuditLogEntry[]> {
    return auditStore.filter((entry) => entry.planId === planId);
  }

  /**
   * Query logs by action
   */
  async queryByAction(action: string): Promise<AuditLogEntry[]> {
    return auditStore.filter((entry) => entry.action === action);
  }

  /**
   * Query logs in date range
   */
  async queryByDateRange(startDate: Date, endDate: Date): Promise<AuditLogEntry[]> {
    return auditStore.filter((entry) => {
      const ts = new Date(entry.timestamp);
      return ts >= startDate && ts <= endDate;
    });
  }

  /**
   * Get all logs for a plan (full audit trail)
   */
  async getFullTrail(planId: string): Promise<AuditLogEntry[]> {
    const entries = await this.queryByPlan(planId);
    return entries.sort((a: AuditLogEntry, b: AuditLogEntry) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      return dateA - dateB;
    });
  }

  /**
   * Export logs as CSV (for analytics/compliance)
   */
  exportAsCSV(entries: AuditLogEntry[]): string {
    const headers = [
      'ID',
      'Timestamp',
      'User ID',
      'Plan ID',
      'Action',
      'Status',
      'Task ID',
      'Result',
      'Error',
    ];

    const rows = entries.map((entry) => [
      entry.id || '',
      new Date(entry.timestamp).toISOString(),
      entry.userId,
      entry.planId,
      entry.action,
      entry.status,
      entry.taskId || '',
      JSON.stringify(entry.result || {}),
      entry.error || '',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    return csv;
  }

  /**
   * Get summary statistics for user
   */
  async getUserStats(userId: string): Promise<{
    totalActions: number;
    successCount: number;
    failureCount: number;
    rejectionCount: number;
    lastAction: Date | null;
  }> {
    const userLogs = await this.queryByUser(userId);

    return {
      totalActions: userLogs.length,
      successCount: userLogs.filter((l) => l.status === 'completed').length,
      failureCount: userLogs.filter((l) => l.status === 'failed').length,
      rejectionCount: userLogs.filter((l) => l.status === 'rejected').length,
      lastAction: userLogs.length > 0 ? new Date(userLogs[userLogs.length - 1].timestamp) : null,
    };
  }

  /**
   * Clear logs (for testing only)
   */
  async clear(): Promise<void> {
    auditStore.length = 0;
    if (fs.existsSync(auditLogFile)) {
      fs.unlinkSync(auditLogFile);
    }
  }
}

/**
 * Global audit logger instance
 */
export const globalAuditLogger = new AuditLogger();
