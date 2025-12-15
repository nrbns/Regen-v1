/**
 * Advanced RBAC + Audit Logging (Week 5)
 * Comprehensive authorization and compliance tracking
 */

import { globalPermissionControl, ActionType } from '../../services/security/permissionControl.js';

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  result: 'approved' | 'denied' | 'error';
  reason?: string;
  context: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export interface RBACPolicy {
  id: string;
  name: string;
  roles: string[];
  permissions: ActionType[];
  conditions?: {
    maxPlansPerDay?: number;
    maxConcurrentTasks?: number;
    allowedAgentTypes?: string[];
    timeWindowStart?: string; // ISO time
    timeWindowEnd?: string;   // ISO time
  };
}

export class AuditLogger {
  private logs: AuditLogEntry[] = [];
  private maxLogs = 10000; // In-memory limit

  /**
   * Log audit entry
   */
  logAction(
    userId: string,
    action: string,
    resource: string,
    result: 'approved' | 'denied' | 'error',
    context?: {
      resourceId?: string;
      reason?: string;
      ipAddress?: string;
      userAgent?: string;
      metadata?: Record<string, any>;
    }
  ): void {
    const entry: AuditLogEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      userId,
      action,
      resource,
      resourceId: context?.resourceId,
      result,
      reason: context?.reason,
      context: context?.metadata || {},
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    };

    this.logs.push(entry);

    // Trim if exceeds max
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    console.log(`[Audit] ${userId} ${action} on ${resource}: ${result}`);
  }

  /**
   * Get audit trail for user
   */
  getUserAuditTrail(userId: string, limit: number = 100): AuditLogEntry[] {
    return this.logs
      .filter(l => l.userId === userId)
      .slice(-limit)
      .reverse();
  }

  /**
   * Get audit trail for resource
   */
  getResourceAuditTrail(resourceId: string, limit: number = 100): AuditLogEntry[] {
    return this.logs
      .filter(l => l.resourceId === resourceId)
      .slice(-limit)
      .reverse();
  }

  /**
   * Get failed attempts (suspicious activity)
   */
  getFailedAttempts(userId?: string, minutes: number = 60): AuditLogEntry[] {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return this.logs.filter(l => {
      const match = !userId || l.userId === userId;
      return match && l.result === 'denied' && l.timestamp > cutoff;
    });
  }

  /**
   * Export audit logs (for compliance)
   */
  exportLogs(
    startDate?: Date,
    endDate?: Date,
    format: 'json' | 'csv' = 'json'
  ): string {
    let filtered = this.logs;

    if (startDate) {
      filtered = filtered.filter(l => l.timestamp >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter(l => l.timestamp <= endDate);
    }

    if (format === 'json') {
      return JSON.stringify(filtered, null, 2);
    } else {
      // CSV format
      const headers = ['ID', 'Timestamp', 'User', 'Action', 'Resource', 'Result', 'Reason'];
      const rows = filtered.map(l => [
        l.id,
        l.timestamp.toISOString(),
        l.userId,
        l.action,
        l.resource,
        l.result,
        l.reason || '',
      ]);
      const csv = [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');
      return csv;
    }
  }
}

export class AdvancedRBAC {
  private auditLogger = new AuditLogger();
  private policies: Map<string, RBACPolicy> = new Map();

  /**
   * Register custom RBAC policy
   */
  registerPolicy(policy: RBACPolicy): void {
    this.policies.set(policy.id, policy);
    console.log(`[RBAC] Registered policy: ${policy.name}`);
  }

  /**
   * Evaluate action with advanced conditions
   */
  async evaluateAction(
    userId: string,
    action: string,
    resource: string,
    context?: {
      ipAddress?: string;
      userAgent?: string;
      resourceId?: string;
      agentType?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<{ allowed: boolean; reason?: string }> {
    // Check base permissions
    const perms = await globalPermissionControl.getPermissions(userId);
    if (!perms || !perms.permissions.has(action as ActionType)) {
      this.auditLogger.logAction(userId, action, resource, 'denied', {
        ...context,
        reason: 'Missing permission',
      });
      return { allowed: false, reason: 'Missing permission' };
    }

    // Check policies
    for (const [, policy] of this.policies) {
      if (!policy.roles.includes(perms.role)) continue;

      // Check conditions
      if (policy.conditions?.maxPlansPerDay) {
        // Would check actual plan count
      }
      if (policy.conditions?.allowedAgentTypes && context?.agentType) {
        if (!policy.conditions.allowedAgentTypes.includes(context.agentType)) {
          this.auditLogger.logAction(userId, action, resource, 'denied', {
            ...context,
            reason: `Agent type not allowed: ${context.agentType}`,
          });
          return { allowed: false, reason: 'Agent type not allowed' };
        }
      }
    }

    // Log approval
    this.auditLogger.logAction(userId, action, resource, 'approved', context);
    return { allowed: true };
  }

  /**
   * Get audit trail
   */
  getAuditTrail(userId?: string, limit?: number): AuditLogEntry[] {
    return userId ? this.auditLogger.getUserAuditTrail(userId, limit) : [];
  }

  /**
   * Export audit logs
   */
  exportAuditLogs(startDate?: Date, endDate?: Date): string {
    return this.auditLogger.exportLogs(startDate, endDate);
  }
}

let auditLoggerInstance: AuditLogger | null = null;
let rbacInstance: AdvancedRBAC | null = null;

export function getAuditLogger(): AuditLogger {
  if (!auditLoggerInstance) auditLoggerInstance = new AuditLogger();
  return auditLoggerInstance;
}

export function getAdvancedRBAC(): AdvancedRBAC {
  if (!rbacInstance) rbacInstance = new AdvancedRBAC();
  return rbacInstance;
}

export default { AuditLogger, AdvancedRBAC };
