/**
 * Permission Control Service (Week 5 Enhanced)
 * Role-based access control with quotas and rate limiting
 */

export type UserRole = 'viewer' | 'editor' | 'admin';
export type ActionType = 'read' | 'create' | 'update' | 'delete' | 'send' | 'book' | 'export' | 'execute' | 'approve';

/**
 * User quota configuration
 */
export interface UserQuota {
  maxConcurrentExecutions: number;
  maxDailyExecutions: number;
  maxQueueDepth: number;
  priorityLevel: number; // 1=high, 2=normal, 3=low
}

/**
 * Rate limit tracking
 */
interface RateLimitTracker {
  count: number;
  windowStart: number;
  dailyCount: number;
  dailyStart: number;
}

/**
 * User permission config
 */
export interface UserPermissions {
  userId: string;
  role: UserRole;
  permissions: Set<ActionType>;
  customRules?: Record<string, boolean>;
  approvalRequired: Set<ActionType>; // Actions that need approval
  twoFactorRequired: Set<ActionType>; // Actions that need 2FA
  quota: UserQuota;
  currentExecutions: number; // Track concurrent executions
}

/**
 * Action audit entry
 */
export interface ActionAudit {
  id: string;
  userId: string;
  action: ActionType;
  resource: string;
  approved: boolean;
  approver?: string;
  timestamp: Date;
  metadata: Record<string, any>;
}

const userPermissions = new Map<string, UserPermissions>();
const actionAudits: ActionAudit[] = [];
const rateLimitTrackers = new Map<string, RateLimitTracker>();

// Rate limit window (5 minutes)
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const DAILY_WINDOW_MS = 24 * 60 * 60 * 1000;

export class PermissionControl {
  /**
   * Initialize user permissions
   */
  async initializeUser(userId: string, role: UserRole = 'viewer'): Promise<UserPermissions> {
    const permissions = this.getDefaultPermissions(role);

    userPermissions.set(userId, {
      userId,
      role,
      permissions,
      approvalRequired: this.getApprovalsForRole(role),
      twoFactorRequired: this.getTwoFactorActionsForRole(role),
      quota: this.getQuotaForRole(role),
      currentExecutions: 0,
    });

    console.log(`[PermissionControl] Initialized user ${userId} with role ${role}`);
    return userPermissions.get(userId)!;
  }

  /**
   * Check if user can perform action
   */
  async canPerformAction(userId: string, action: ActionType): Promise<boolean> {
    const perms = userPermissions.get(userId);
    if (!perms) {
      return false;
    }

    return perms.permissions.has(action);
  }

  /**
   * Check if action requires approval
   */
  async requiresApproval(userId: string, action: ActionType): Promise<boolean> {
    const perms = userPermissions.get(userId);
    if (!perms) {
      return false;
    }

    return perms.approvalRequired.has(action);
  }

  /**
   * Check if action requires 2FA
   */
  async requires2FA(userId: string, action: ActionType): Promise<boolean> {
    const perms = userPermissions.get(userId);
    if (!perms) {
      return false;
    }

    return perms.twoFactorRequired.has(action);
  }

  /**
   * Grant permission
   */
  async grantPermission(userId: string, action: ActionType): Promise<void> {
    const perms = userPermissions.get(userId);
    if (perms) {
      perms.permissions.add(action);
      userPermissions.set(userId, perms);
      console.log(`[PermissionControl] Granted ${action} to ${userId}`);
    }
  }

  /**
   * Revoke permission
   */
  async revokePermission(userId: string, action: ActionType): Promise<void> {
    const perms = userPermissions.get(userId);
    if (perms) {
      perms.permissions.delete(action);
      userPermissions.set(userId, perms);
      console.log(`[PermissionControl] Revoked ${action} from ${userId}`);
    }
  }

  /**
   * Audit action
   */
  async auditAction(
    userId: string,
    action: ActionType,
    resource: string,
    approved: boolean,
    metadata?: Record<string, any>
  ): Promise<void> {
    const audit: ActionAudit = {
      id: `audit-${Date.now()}`,
      userId,
      action,
      resource,
      approved,
      timestamp: new Date(),
      metadata: metadata || {},
    };

    actionAudits.push(audit);
    console.log(`[PermissionControl] Audited ${action} by ${userId}: ${approved ? 'approved' : 'denied'}`);
  }

  /**
   * Get action history for user
   */
  async getActionHistory(userId: string, limit: number = 100): Promise<ActionAudit[]> {
    return actionAudits
      .filter((a) => a.userId === userId)
      .slice(-limit)
      .reverse();
  }

  /**
   * Get user permissions
   */
  async getPermissions(userId: string): Promise<UserPermissions | null> {
    return userPermissions.get(userId) || null;
  }

  /**
   * Check if user is within quota limits
   */
  async checkQuota(userId: string): Promise<{ allowed: boolean; reason?: string }> {
    const perms = userPermissions.get(userId);
    if (!perms) {
      return { allowed: false, reason: 'User not found' };
    }

    // Check concurrent executions
    if (perms.currentExecutions >= perms.quota.maxConcurrentExecutions) {
      return { 
        allowed: false, 
        reason: `Maximum concurrent executions reached (${perms.quota.maxConcurrentExecutions})` 
      };
    }

    // Check daily limit
    const tracker = rateLimitTrackers.get(userId) || this.initializeTracker();
    rateLimitTrackers.set(userId, tracker);

    this.cleanupExpiredTrackers(tracker);

    if (tracker.dailyCount >= perms.quota.maxDailyExecutions) {
      return { 
        allowed: false, 
        reason: `Daily execution limit reached (${perms.quota.maxDailyExecutions})` 
      };
    }

    return { allowed: true };
  }

  /**
   * Increment execution count (call when starting execution)
   */
  async incrementExecution(userId: string): Promise<void> {
    const perms = userPermissions.get(userId);
    if (perms) {
      perms.currentExecutions++;
      
      const tracker = rateLimitTrackers.get(userId) || this.initializeTracker();
      tracker.count++;
      tracker.dailyCount++;
      rateLimitTrackers.set(userId, tracker);
      
      console.log(`[PermissionControl] User ${userId} executions: ${perms.currentExecutions}/${perms.quota.maxConcurrentExecutions}`);
    }
  }

  /**
   * Decrement execution count (call when execution completes)
   */
  async decrementExecution(userId: string): Promise<void> {
    const perms = userPermissions.get(userId);
    if (perms && perms.currentExecutions > 0) {
      perms.currentExecutions--;
      console.log(`[PermissionControl] User ${userId} executions: ${perms.currentExecutions}/${perms.quota.maxConcurrentExecutions}`);
    }
  }

  /**
   * Get user's priority level for queue
   */
  async getUserPriority(userId: string): Promise<number> {
    const perms = userPermissions.get(userId);
    return perms?.quota.priorityLevel || 2; // Default: normal priority
  }

  /**
   * Get rate limit status
   */
  async getRateLimitStatus(userId: string): Promise<{
    currentExecutions: number;
    maxConcurrentExecutions: number;
    dailyExecutions: number;
    maxDailyExecutions: number;
    priorityLevel: number;
  }> {
    const perms = userPermissions.get(userId);
    const tracker = rateLimitTrackers.get(userId) || this.initializeTracker();

    if (!perms) {
      return {
        currentExecutions: 0,
        maxConcurrentExecutions: 0,
        dailyExecutions: 0,
        maxDailyExecutions: 0,
        priorityLevel: 2,
      };
    }

    this.cleanupExpiredTrackers(tracker);

    return {
      currentExecutions: perms.currentExecutions,
      maxConcurrentExecutions: perms.quota.maxConcurrentExecutions,
      dailyExecutions: tracker.dailyCount,
      maxDailyExecutions: perms.quota.maxDailyExecutions,
      priorityLevel: perms.quota.priorityLevel,
    };
  }

  /**
   * Initialize rate limit tracker
   */
  private initializeTracker(): RateLimitTracker {
    const now = Date.now();
    return {
      count: 0,
      windowStart: now,
      dailyCount: 0,
      dailyStart: now,
    };
  }

  /**
   * Cleanup expired tracking windows
   */
  private cleanupExpiredTrackers(tracker: RateLimitTracker): void {
    const now = Date.now();

    // Reset window if expired
    if (now - tracker.windowStart > RATE_LIMIT_WINDOW_MS) {
      tracker.count = 0;
      tracker.windowStart = now;
    }

    // Reset daily count if new day
    if (now - tracker.dailyStart > DAILY_WINDOW_MS) {
      tracker.dailyCount = 0;
      tracker.dailyStart = now;
    }
  }

  /**
   * Get default permissions for role
   */
  private getDefaultPermissions(role: UserRole): Set<ActionType> {
    const rolePermissions: Record<UserRole, ActionType[]> = {
      viewer: ['read'],
      editor: ['read', 'create', 'update', 'execute'],
      admin: ['read', 'create', 'update', 'delete', 'send', 'book', 'export', 'execute', 'approve'],
    };

    return new Set(rolePermissions[role]);
  }

  /**
   * Get actions requiring approval for role
   */
  private getApprovalsForRole(role: UserRole): Set<ActionType> {
    const approvals: Record<UserRole, ActionType[]> = {
      viewer: [],
      editor: ['send', 'delete'],
      admin: ['delete'],
    };

    return new Set(approvals[role]);
  }

  /**
   * Get actions requiring 2FA for role
   */
  private getTwoFactorActionsForRole(role: UserRole): Set<ActionType> {
    const twoFactor: Record<UserRole, ActionType[]> = {
      viewer: [],
      editor: ['send', 'book', 'delete'],
      admin: ['delete', 'export'],
    };

    return new Set(twoFactor[role]);
  }

  /**
   * Get quota configuration for role
   */
  private getQuotaForRole(role: UserRole): UserQuota {
    const quotas: Record<UserRole, UserQuota> = {
      viewer: {
        maxConcurrentExecutions: 1,
        maxDailyExecutions: 10,
        maxQueueDepth: 5,
        priorityLevel: 3, // Low priority
      },
      editor: {
        maxConcurrentExecutions: 5,
        maxDailyExecutions: 100,
        maxQueueDepth: 20,
        priorityLevel: 2, // Normal priority
      },
      admin: {
        maxConcurrentExecutions: 20,
        maxDailyExecutions: 1000,
        maxQueueDepth: 100,
        priorityLevel: 1, // High priority
      },
    };

    return quotas[role];
  }
}

export const globalPermissionControl = new PermissionControl();
