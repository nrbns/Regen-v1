/**
 * Permission System - Tier 2
 * Capability-based permission gating
 */
export type Permission = 'scrape:url' | 'scrape:file' | 'agent:execute' | 'agent:network' | 'storage:write' | 'storage:read' | 'network:request' | 'tabs:create' | 'tabs:close';
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
declare class PermissionManager {
    private permissions;
    private history;
    private listeners;
    /**
     * Request a permission
     */
    request(permission: Permission, reason: string, context?: Record<string, unknown>): Promise<boolean>;
    /**
     * Show permission modal (simplified - can be enhanced with UI component)
     */
    private showPermissionModal;
    /**
     * Check if permission is granted
     */
    has(permission: Permission): boolean;
    /**
     * Grant permission
     */
    grant(permission: Permission): void;
    /**
     * Deny permission
     */
    deny(permission: Permission): void;
    /**
     * Subscribe to permission changes
     */
    on(permission: Permission, callback: (decision: PermissionDecision) => void): () => void;
    /**
     * Get permission history
     */
    getHistory(): PermissionRecord[];
}
export declare const permissionManager: PermissionManager;
export {};
