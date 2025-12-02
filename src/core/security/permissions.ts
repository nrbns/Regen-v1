/**
 * Permission System - Tier 2
 * Capability-based permission gating
 */

import { log } from '../../utils/logger';
import { toast } from '../../utils/toast';

export type Permission =
  | 'scrape:url'
  | 'scrape:file'
  | 'agent:execute'
  | 'agent:network'
  | 'storage:write'
  | 'storage:read'
  | 'network:request'
  | 'tabs:create'
  | 'tabs:close';

export interface PermissionRequest {
  permission: Permission;
  reason: string;
  context?: Record<string, unknown>;
}

export type PermissionDecision = 'granted' | 'denied' | 'pending';

export interface PermissionRecord {
  permission: Permission;
  decision: PermissionDecision;
  timestamp: number;
  reason?: string;
}

class PermissionManager {
  private permissions: Map<Permission, PermissionDecision> = new Map();
  private history: PermissionRecord[] = [];
  private listeners: Map<Permission, Set<(decision: PermissionDecision) => void>> = new Map();

  /**
   * Request a permission
   */
  async request(
    permission: Permission,
    reason: string,
    context?: Record<string, unknown>
  ): Promise<boolean> {
    // Check if already granted
    const existing = this.permissions.get(permission);
    if (existing === 'granted') {
      return true;
    }

    // Check if denied
    if (existing === 'denied') {
      toast.warning(`Permission denied: ${permission}`);
      return false;
    }

    // Show permission modal (simplified for now)
    const granted = await this.showPermissionModal({ permission, reason, context });

    // Store decision
    this.permissions.set(permission, granted ? 'granted' : 'denied');
    this.history.push({
      permission,
      decision: granted ? 'granted' : 'denied',
      timestamp: Date.now(),
      reason,
    });

    // Notify listeners
    const listeners = this.listeners.get(permission);
    if (listeners) {
      listeners.forEach(listener => listener(granted ? 'granted' : 'denied'));
    }

    log.info('Permission requested', { permission, granted, reason });
    return granted;
  }

  /**
   * Show permission modal (simplified - can be enhanced with UI component)
   */
  private async showPermissionModal(request: PermissionRequest): Promise<boolean> {
    // For now, auto-grant in dev, show toast in production
    if (process.env.NODE_ENV === 'development') {
      return true;
    }

    // In production, this would show a modal
    // For now, we'll use a simple confirm
    const message = `Allow ${request.permission}?\n\nReason: ${request.reason}`;
    return window.confirm(message);
  }

  /**
   * Check if permission is granted
   */
  has(permission: Permission): boolean {
    return this.permissions.get(permission) === 'granted';
  }

  /**
   * Grant permission
   */
  grant(permission: Permission): void {
    this.permissions.set(permission, 'granted');
    this.history.push({
      permission,
      decision: 'granted',
      timestamp: Date.now(),
    });

    const listeners = this.listeners.get(permission);
    if (listeners) {
      listeners.forEach(listener => listener('granted'));
    }
  }

  /**
   * Deny permission
   */
  deny(permission: Permission): void {
    this.permissions.set(permission, 'denied');
    this.history.push({
      permission,
      decision: 'denied',
      timestamp: Date.now(),
    });

    const listeners = this.listeners.get(permission);
    if (listeners) {
      listeners.forEach(listener => listener('denied'));
    }
  }

  /**
   * Subscribe to permission changes
   */
  on(permission: Permission, callback: (decision: PermissionDecision) => void): () => void {
    if (!this.listeners.has(permission)) {
      this.listeners.set(permission, new Set());
    }
    this.listeners.get(permission)!.add(callback);

    return () => {
      this.listeners.get(permission)?.delete(callback);
    };
  }

  /**
   * Get permission history
   */
  getHistory(): PermissionRecord[] {
    return [...this.history];
  }
}

// Singleton instance
export const permissionManager = new PermissionManager();
