/**
 * Layer 5: Data Synchronization
 *
 * Implements:
 * 1. Change tracking and versioning
 * 2. Conflict resolution (3-way merge)
 * 3. Real-time sync with optimistic updates
 * 4. Data consistency validation
 * 5. Offline change management
 */

import { useState, useEffect, useCallback } from 'react';

// ============================================================================
// 1. Change Tracking & Versioning
// ============================================================================

export interface Change<T = any> {
  id: string;
  timestamp: number;
  operation: 'create' | 'update' | 'delete';
  resourceId: string;
  resourceType: string;
  previousValue?: T;
  newValue?: T;
  userId: string;
  deviceId: string;
  version: number; // Vector clock version
  vectorClock: Map<string, number>;
  appliedAt?: number;
  parentChangeIds: string[];
  hash: string; // For integrity check
}

export interface VersionedData<T> {
  id: string;
  data: T | undefined;
  version: number;
  timestamp?: number;
  lastModified?: number;
  lastModifiedBy?: string;
  userId?: string;
  deviceId?: string;
  hash?: string;
  vectorClock?: Map<string, number>;
  changes: Change[];
  deleted: boolean;
  conflictResolved: boolean;
}

export class ChangeTracker {
  private changes: Map<string, Change> = new Map();
  private versionedData: Map<string, VersionedData<any>> = new Map();
  private userId: string;
  private deviceId: string;
  private vectorClock: Map<string, number> = new Map();

  constructor(userId: string, deviceId: string) {
    this.userId = userId;
    this.deviceId = deviceId;
  }

  /**
   * Record a change
   */
  recordChange<T>(
    operation: 'create' | 'update' | 'delete',
    resourceId: string,
    resourceType: string,
    newValue?: T,
    previousValue?: T,
    parentChangeIds: string[] = []
  ): Change<T> {
    // Increment vector clock
    const currentVersion = (this.vectorClock.get(this.deviceId) || 0) + 1;
    this.vectorClock.set(this.deviceId, currentVersion);

    const changeId = this.generateChangeId();
    const change: Change<T> = {
      id: changeId,
      timestamp: Date.now(),
      operation,
      resourceId,
      resourceType,
      newValue,
      previousValue,
      userId: this.userId,
      deviceId: this.deviceId,
      version: currentVersion,
      vectorClock: new Map(this.vectorClock),
      parentChangeIds,
      hash: this.hashChange({
        operation,
        resourceId,
        newValue,
        previousValue,
      }),
    };

    this.changes.set(changeId, change);
    console.log(`[ChangeTracker] Recorded ${operation} for ${resourceType}:${resourceId}`);

    return change;
  }

  /**
   * Apply change to data
   */
  applyChange<T>(change: Change<T>, data?: T): T | undefined {
    if (change.operation === 'create') {
      return change.newValue;
    } else if (change.operation === 'update') {
      return change.newValue;
    } else if (change.operation === 'delete') {
      return undefined;
    }
    return data;
  }

  /**
   * Create versioned snapshot
   */
  snapshot<T>(resourceId: string, data: T, resourceType: string): VersionedData<T> {
    const history = this.getChangeHistory(resourceId, resourceType);
    const version = history.length > 0 ? history.length : 1;

    const versioned: VersionedData<T> = {
      id: resourceId,
      data,
      version,
      lastModified: Date.now(),
      lastModifiedBy: this.userId,
      changes: history,
      deleted: false,
      conflictResolved: false,
    };

    this.versionedData.set(resourceId, versioned);
    return versioned;
  }

  /**
   * Get change history for resource
   */
  getChangeHistory(resourceId: string, resourceType: string): Change[] {
    return Array.from(this.changes.values()).filter(
      c => c.resourceId === resourceId && c.resourceType === resourceType
    );
  }

  /**
   * Get all pending changes (not yet applied)
   */
  getPendingChanges(): Change[] {
    return Array.from(this.changes.values()).filter(c => !c.appliedAt);
  }

  /**
   * Mark change as applied
   */
  markApplied(changeId: string): void {
    const change = this.changes.get(changeId);
    if (change) {
      change.appliedAt = Date.now();
    }
  }

  /**
   * Generate deterministic change ID based on content
   */
  private generateChangeId(): string {
    // Use a counter for deterministic IDs
    const count = this.changes.size;
    return `${this.deviceId}-${count}`;
  }

  /**
   * Hash change for integrity verification
   */
  private hashChange(change: any): string {
    const json = JSON.stringify(change);
    let hash = 0;
    for (let i = 0; i < json.length; i++) {
      const char = json.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  getVectorClock(): Map<string, number> {
    return new Map(this.vectorClock);
  }

  updateVectorClock(clock: Map<string, number>): void {
    clock.forEach((version, deviceId) => {
      const current = this.vectorClock.get(deviceId) || 0;
      this.vectorClock.set(deviceId, Math.max(current, version));
    });
  }
}

// ============================================================================
// 2. Conflict Resolution (3-Way Merge)
// ============================================================================

export interface ConflictResolutionContext<T> {
  base: T; // Original state
  local: T; // Local changes
  remote: T; // Remote changes
  localChanges: Change[];
  remoteChanges: Change[];
  strategy: 'local' | 'remote' | 'merge' | 'manual';
}

export interface MergeResult<T> {
  merged: T;
  conflicts: ConflictMarker[];
  appliedChanges: Change[];
  discardedChanges: Change[];
}

export interface ConflictMarker {
  field: string;
  base: any;
  local: any;
  remote: any;
  resolution: 'local' | 'remote' | 'manual' | 'merge';
}

export class ConflictResolver {
  /**
   * Three-way merge
   */
  static merge<T extends Record<string, any>>(
    context: ConflictResolutionContext<T>
  ): MergeResult<T> {
    const conflicts: ConflictMarker[] = [];
    const appliedChanges: Change[] = [];
    const discardedChanges: Change[] = [];

    // Start with base and apply changes
    let merged = { ...context.base } as T;

    // Check each field for conflicts
    const allKeys = new Set([
      ...Object.keys(context.base || {}),
      ...Object.keys(context.local || {}),
      ...Object.keys(context.remote || {}),
    ]);

    allKeys.forEach(field => {
      const baseValue = context.base?.[field];
      const localValue = context.local?.[field];
      const remoteValue = context.remote?.[field];

      // If only one side changed or both changed the same way, no conflict
      if (localValue === remoteValue) {
        // Both same, use it
        merged[field as keyof T] = localValue as any;
      } else if (localValue === baseValue) {
        // Only remote changed
        merged[field as keyof T] = remoteValue as any;
        appliedChanges.push(...context.remoteChanges);
      } else if (remoteValue === baseValue) {
        // Only local changed
        merged[field as keyof T] = localValue as any;
        appliedChanges.push(...context.localChanges);
      } else {
        // Both changed differently - CONFLICT
        conflicts.push({
          field,
          base: baseValue,
          local: localValue,
          remote: remoteValue,
          resolution: context.strategy === 'manual' ? 'manual' : context.strategy,
        });

        // Apply resolution strategy
        if (context.strategy === 'local') {
          merged[field as keyof T] = localValue as any;
          appliedChanges.push(...context.localChanges.filter(c => c.resourceId === field));
          discardedChanges.push(...context.remoteChanges.filter(c => c.resourceId === field));
        } else if (context.strategy === 'remote') {
          merged[field as keyof T] = remoteValue as any;
          appliedChanges.push(...context.remoteChanges.filter(c => c.resourceId === field));
          discardedChanges.push(...context.localChanges.filter(c => c.resourceId === field));
        } else {
          // 'merge' strategy - try smart merge
          merged[field as keyof T] = this.smartMerge(baseValue, localValue, remoteValue) as any;
          appliedChanges.push(...context.localChanges.filter(c => c.resourceId === field));
          appliedChanges.push(...context.remoteChanges.filter(c => c.resourceId === field));
        }
      }
    });

    return {
      merged,
      conflicts,
      appliedChanges,
      discardedChanges,
    };
  }

  /**
   * Smart merge for arrays and objects
   */
  private static smartMerge(base: any, local: any, remote: any): any {
    // For arrays, merge non-overlapping changes
    if (Array.isArray(base) && Array.isArray(local) && Array.isArray(remote)) {
      const merged = [...base];

      // Add items from local not in base
      local.forEach((item, _i) => {
        if (!base.includes(item) && !merged.includes(item)) {
          merged.push(item);
        }
      });

      // Add items from remote not in base
      remote.forEach(item => {
        if (!base.includes(item) && !merged.includes(item)) {
          merged.push(item);
        }
      });

      return merged;
    }

    // For objects, recursively merge properties
    if (
      typeof base === 'object' &&
      typeof local === 'object' &&
      typeof remote === 'object' &&
      base !== null &&
      local !== null &&
      remote !== null
    ) {
      const merged = { ...base };
      const keys = new Set([...Object.keys(base), ...Object.keys(local), ...Object.keys(remote)]);

      keys.forEach(key => {
        if (local[key] === remote[key]) {
          merged[key] = local[key];
        } else if (local[key] === base[key]) {
          merged[key] = remote[key];
        } else if (remote[key] === base[key]) {
          merged[key] = local[key];
        } else {
          // All three different - use local (biased toward local)
          merged[key] = local[key];
        }
      });

      return merged;
    }

    // Default: use local
    return local;
  }

  /**
   * Detect if changes conflict
   */
  static detectConflict(base: any, local: any, remote: any): boolean {
    // Check if all three are different
    return base !== local && local !== remote && base !== remote;
  }
}

// ============================================================================
// 3. Real-Time Sync Engine
// ============================================================================

export interface SyncState {
  status: 'idle' | 'syncing' | 'conflict' | 'error' | 'stopped';
  lastSync?: number;
  pendingChanges: number;
  conflictCount: number;
  syncCount: number;
  syncError?: string;
  isOnline: boolean;
}

export interface SyncEngine {
  sync(): Promise<void>;
  getState(): SyncState;
  resolveConflict(changeId: string, strategy: 'local' | 'remote'): Promise<void>;
}

export class RealtimeSyncEngine {
  private changeTracker: ChangeTracker;
  private state: SyncState = {
    status: 'idle',
    pendingChanges: 0,
    conflictCount: 0,
    syncCount: 0,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  };
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private listeners = new Set<(state: SyncState) => void>();
  private pendingSync: Promise<void> | null = null;

  constructor(changeTracker: ChangeTracker) {
    this.changeTracker = changeTracker;
  }

  /**
   * Start sync engine
   */
  start(intervalMs: number = 5000): void {
    console.log('[SyncEngine] Starting real-time sync');

    // Update initial online status
    this.updateState({ isOnline: navigator.onLine });

    // Emit initial state to subscribers by calling listeners
    this.listeners.forEach(listener => listener({ ...this.state }));

    // Initial sync
    this.sync();

    // Periodic sync
    this.syncInterval = setInterval(() => this.sync(), intervalMs);

    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.updateState({ isOnline: true });
      this.sync();
    });
    window.addEventListener('offline', () => {
      this.updateState({ isOnline: false });
    });
  }

  /**
   * Stop sync engine
   */
  stop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.updateState({ status: 'stopped' });
    console.log('[SyncEngine] Stopped');
  }

  /**
   * Perform sync
   */
  async sync(): Promise<void> {
    if (!navigator.onLine) {
      console.log('[SyncEngine] Offline, skipping sync');
      return;
    }

    if (this.pendingSync) {
      return this.pendingSync;
    }

    this.pendingSync = this.performSync();
    return this.pendingSync;
  }

  private async performSync(): Promise<void> {
    try {
      this.updateState({ status: 'syncing' });

      const pendingChanges = this.changeTracker.getPendingChanges();
      if (pendingChanges.length === 0) {
        this.updateState({
          status: 'idle',
          lastSync: Date.now(),
          pendingChanges: 0,
          syncCount: this.state.syncCount + 1,
        });
        return;
      }

      console.log(`[SyncEngine] Syncing ${pendingChanges.length} changes`);

      // Send to server
      const response = await fetch('/api/sync/changes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          changes: pendingChanges,
          vectorClock: Object.fromEntries(this.changeTracker.getVectorClock()),
        }),
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.status}`);
      }

      const result = await response.json();

      // Process server response
      if (result.conflicts && result.conflicts.length > 0) {
        this.updateState({
          status: 'conflict',
          conflictCount: result.conflicts.length,
          syncCount: this.state.syncCount + 1,
        });
        console.warn(`[SyncEngine] ${result.conflicts.length} conflicts detected`);
      } else {
        // Mark changes as applied
        pendingChanges.forEach(change => {
          this.changeTracker.markApplied(change.id);
        });

        // Update vector clock from server
        if (result.vectorClock) {
          this.changeTracker.updateVectorClock(new Map(Object.entries(result.vectorClock) as any));
        }

        this.updateState({
          status: 'idle',
          lastSync: Date.now(),
          pendingChanges: 0,
          conflictCount: 0,
          syncCount: this.state.syncCount + 1,
        });

        console.log('[SyncEngine] Sync completed successfully');
      }
    } catch (error) {
      this.updateState({
        status: 'error',
        syncError: error instanceof Error ? error.message : 'Unknown error',
        syncCount: this.state.syncCount + 1,
      });
      console.error('[SyncEngine] Sync failed:', error);
    } finally {
      this.pendingSync = null;
    }
  }

  /**
   * Resolve conflict
   */
  async resolveConflict(changeId: string, strategy: 'local' | 'remote'): Promise<void> {
    try {
      await fetch('/api/sync/resolve-conflict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changeId, strategy }),
      });

      // Re-sync
      await this.sync();
    } catch (error) {
      console.error('[SyncEngine] Failed to resolve conflict:', error);
    }
  }

  getState(): SyncState {
    return { ...this.state };
  }

  subscribe(listener: (state: SyncState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private updateState(partial: Partial<SyncState>): void {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach(listener => listener({ ...this.state }));
  }
}

// ============================================================================
// 4. Data Consistency Validation
// ============================================================================

export class DataValidator {
  /**
   * Validate data integrity
   */
  static validate<T>(data: VersionedData<T>): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    const changes = data.changes || [];

    if (!data.id) {
      errors.push('Missing id');
    }
    if (data.version === undefined) {
      errors.push('Missing version');
    }
    if (data.timestamp === undefined && data.lastModified === undefined) {
      errors.push('Missing timestamp');
    }

    // Check version consistency
    if (data.version !== undefined && data.version < 0) {
      errors.push('Invalid version: must be non-negative');
    }

    // Check timestamp consistency
    const lastModified = data.lastModified ?? data.timestamp ?? 0;
    if (lastModified > Date.now()) {
      errors.push('Invalid lastModified: future timestamp');
    }

    // Check change history
    let expectedVersion = 1;
    changes.forEach((change, index) => {
      if (change.version !== expectedVersion) {
        errors.push(`Change ${index}: expected version ${expectedVersion}, got ${change.version}`);
      }
      expectedVersion++;
    });

    // Check data consistency with changes
    let reconstructed: T | undefined = data.data;
    changes.forEach(change => {
      if (change.operation === 'delete') {
        reconstructed = undefined;
      }
    });

    if (data.deleted && reconstructed !== undefined) {
      errors.push('Data marked as deleted but has recent updates');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Repair data by replaying changes
   */
  static repair<T>(versioned: VersionedData<T>): VersionedData<T> {
    let repaired = { ...versioned };
    let reconstructedData: T | undefined = versioned.data;
    const changes = versioned.changes || [];

    // Replay changes in order
    changes.forEach(change => {
      if (change.operation === 'create') {
        reconstructedData = change.newValue;
      } else if (change.operation === 'update') {
        reconstructedData = change.newValue;
      } else if (change.operation === 'delete') {
        reconstructedData = undefined;
      }
    });

    repaired.data = reconstructedData;
    repaired.version = changes.length + 1;

    return repaired;
  }
}

// ============================================================================
// 5. React Hooks for Sync
// ============================================================================

export function useSyncState(syncEngine: RealtimeSyncEngine) {
  const [state, setState] = useState<SyncState>(syncEngine.getState());

  useEffect(() => {
    return syncEngine.subscribe(newState => {
      setState(newState);
    });
  }, [syncEngine]);

  return state;
}

export function useChangeTracking<T extends Record<string, any>>(
  changeTracker: ChangeTracker,
  resourceType: string
) {
  const recordChange = useCallback(
    (
      operation: 'create' | 'update' | 'delete',
      resourceId: string,
      newValue?: T,
      previousValue?: T
    ) => {
      return changeTracker.recordChange(
        operation,
        resourceId,
        resourceType,
        newValue,
        previousValue
      );
    },
    [changeTracker, resourceType]
  );

  const getHistory = useCallback(
    (resourceId: string) => changeTracker.getChangeHistory(resourceId, resourceType),
    [changeTracker, resourceType]
  );

  return { recordChange, getHistory };
}

export function useLiveData<T>(data: T, changeTracker: ChangeTracker, resourceId: string) {
  const [current, setCurrent] = useState(data);
  const [pending, setPending] = useState(false);

  const update = useCallback(
    async (newData: T) => {
      // Optimistic update
      setCurrent(newData);
      setPending(true);

      try {
        // Record change
        changeTracker.recordChange('update', resourceId, 'data', newData, current);

        // Simulate server confirmation
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        // Revert on error
        setCurrent(current);
        console.error('Update failed:', error);
      } finally {
        setPending(false);
      }
    },
    [changeTracker, resourceId, current]
  );

  return { current, pending, update };
}
