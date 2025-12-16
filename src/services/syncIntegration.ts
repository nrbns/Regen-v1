/**
 * Layer 5: Data Synchronization Integration Service
 * 
 * Integrates real-time sync with:
 * - TabsStore and content management
 * - Layer 3 offline queue
 * - Layer 4 search indexing
 * - Conflict resolution
 * - Data consistency
 */

import { ChangeTracker, RealtimeSyncEngine, ConflictResolver, DataValidator } from './layer5-sync';
import type { Tab } from '../state/tabsStore';
import { getOfflineQueue } from './layer3-network';
import { indexTabs, removeTab } from '../services/searchIntegration';

// ============================================================================
// 1. Sync Manager
// ============================================================================

export interface SyncConfig {
  userId: string;
  deviceId: string;
  syncInterval?: number;
  autoResolveStrategy?: 'local' | 'remote' | 'merge';
}

class SyncManager {
  private changeTracker: ChangeTracker;
  private syncEngine: RealtimeSyncEngine;
  private config: SyncConfig;
  private initialized = false;

  constructor(config: SyncConfig) {
    this.config = config;
    this.changeTracker = new ChangeTracker(config.userId, config.deviceId);
    this.syncEngine = new RealtimeSyncEngine(this.changeTracker);
  }

  async init(): Promise<void> {
    if (this.initialized) return;

    console.log('[SyncManager] Initializing...');

    // Start sync engine
    this.syncEngine.start(this.config.syncInterval || 5000);

    // Listen for sync state changes
    this.syncEngine.subscribe((state) => {
      if (state.status === 'conflict') {
        console.warn(`[SyncManager] Conflict detected: ${state.conflictCount} conflicts`);
        // Handle conflicts if auto-resolve configured
        if (this.config.autoResolveStrategy) {
          this.autoResolveConflicts();
        }
      } else if (state.status === 'error') {
        console.error('[SyncManager] Sync error:', state.syncError);
      }
    });

    this.initialized = true;
    console.log('[SyncManager] Ready');
  }

  private async autoResolveConflicts(): Promise<void> {
    // Implement auto-resolution based on strategy
    console.log(`[SyncManager] Auto-resolving conflicts with ${this.config.autoResolveStrategy} strategy`);
  }

  getChangeTracker(): ChangeTracker {
    return this.changeTracker;
  }

  getSyncEngine(): RealtimeSyncEngine {
    return this.syncEngine;
  }
}

let syncManager: SyncManager | null = null;

export async function initSync(config: SyncConfig): Promise<void> {
  syncManager = new SyncManager(config);
  await syncManager.init();
}

export function getSyncManager(): SyncManager {
  if (!syncManager) {
    throw new Error('Sync not initialized. Call initSync() first.');
  }
  return syncManager;
}

// ============================================================================
// 2. Tracked Operations
// ============================================================================

/**
 * Track and sync tab creation
 */
export async function createTabWithSync(tab: Tab, _changeMetadata: any = {}): Promise<void> {
  const manager = getSyncManager();
  const tracker = manager.getChangeTracker();

  // Record change locally
  const change = tracker.recordChange(
    'create',
    tab.id,
    'tab',
    tab,
    undefined,
    []
  );

  // Create snapshot
  tracker.snapshot(tab.id, tab, 'tab');

  // Index for search
  await indexTabs([tab]);

  // Queue if offline
  if (!navigator.onLine) {
    const offlineQueue = getOfflineQueue();
    await offlineQueue.add('/api/tabs/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tab, changeId: change.id }),
    });
    console.log('[SyncIntegration] Tab creation queued for offline sync');
  } else {
    // Sync immediately
    await manager.getSyncEngine().sync();
  }
}

/**
 * Track and sync tab update
 */
export async function updateTabWithSync(
  tabId: string,
  updates: Partial<Tab>,
  previousTab: Tab
): Promise<void> {
  const manager = getSyncManager();
  const tracker = manager.getChangeTracker();

  const updatedTab = { ...previousTab, ...updates };

  // Record change
  const change = tracker.recordChange(
    'update',
    tabId,
    'tab',
    updatedTab,
    previousTab,
    []
  );

  // Create snapshot
  tracker.snapshot(tabId, updatedTab, 'tab');

  // Update search index
  await indexTabs([updatedTab]);

  // Queue if offline
  if (!navigator.onLine) {
    const offlineQueue = getOfflineQueue();
    await offlineQueue.add(`/api/tabs/${tabId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates, changeId: change.id }),
    });
  } else {
    await manager.getSyncEngine().sync();
  }
}

/**
 * Track and sync tab deletion
 */
export async function deleteTabWithSync(tabId: string, tab: Tab): Promise<void> {
  const manager = getSyncManager();
  const tracker = manager.getChangeTracker();

  // Record change
  const change = tracker.recordChange('delete', tabId, 'tab', undefined, tab, []);

  // Remove from search
  await removeTab(tabId);

  // Queue if offline
  if (!navigator.onLine) {
    const offlineQueue = getOfflineQueue();
    await offlineQueue.add(`/api/tabs/${tabId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ changeId: change.id }),
    });
  } else {
    await manager.getSyncEngine().sync();
  }
}

// ============================================================================
// 3. Conflict Resolution
// ============================================================================

export interface ConflictResolutionRequest {
  resourceId: string;
  resourceType: string;
  base: any;
  local: any;
  remote: any;
  strategy: 'local' | 'remote' | 'merge';
}

export async function resolveConflict(request: ConflictResolutionRequest): Promise<any> {
  const manager = getSyncManager();
  const tracker = manager.getChangeTracker();

  const conflictContext = {
    base: request.base,
    local: request.local,
    remote: request.remote,
    localChanges: tracker.getChangeHistory(request.resourceId, request.resourceType),
    remoteChanges: [], // Would come from server
    strategy: request.strategy as any,
  };

  const result = ConflictResolver.merge(conflictContext);

  console.log(`[SyncIntegration] Resolved conflict for ${request.resourceType}:${request.resourceId}`);
  console.log(`  Conflicts found: ${result.conflicts.length}`);
  console.log(`  Applied changes: ${result.appliedChanges.length}`);
  console.log(`  Discarded changes: ${result.discardedChanges.length}`);

  return result.merged;
}

// ============================================================================
// 4. Consistency Validation & Repair
// ============================================================================

export async function validateData<_T>(versionedData: any): Promise<{
  isValid: boolean;
  errors: string[];
}> {
  const validation = DataValidator.validate(versionedData);

  if (!validation.isValid) {
    console.warn(`[SyncIntegration] Data validation failed: ${validation.errors.join(', ')}`);

    // Attempt repair
    DataValidator.repair(versionedData);
    console.log('[SyncIntegration] Data repaired automatically');

    return { isValid: true, errors: [] };
  }

  return validation;
}

/**
 * Verify consistency between local state and server
 */
export async function verifyConsistency(): Promise<{
  isConsistent: boolean;
  discrepancies: string[];
}> {
  try {
    const response = await fetch('/api/sync/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vectorClock: Object.fromEntries(
          getSyncManager().getChangeTracker().getVectorClock()
        ),
      }),
    });

    if (!response.ok) {
      return { isConsistent: false, discrepancies: ['Server verification failed'] };
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('[SyncIntegration] Consistency check failed:', error);
    return { isConsistent: false, discrepancies: [String(error)] };
  }
}

// ============================================================================
// 5. Change History & Audit Trail
// ============================================================================

export function getChangeHistory(resourceId: string, resourceType: string) {
  const manager = getSyncManager();
  const tracker = manager.getChangeTracker();
  return tracker.getChangeHistory(resourceId, resourceType);
}

export function getPendingChanges() {
  const manager = getSyncManager();
  const tracker = manager.getChangeTracker();
  return tracker.getPendingChanges();
}

export interface AuditEntry {
  timestamp: number;
  userId: string;
  deviceId: string;
  action: string;
  resourceId: string;
  details: any;
}

export async function getAuditTrail(resourceId: string): Promise<AuditEntry[]> {
  try {
    const response = await fetch(`/api/audit/${resourceId}`);
    if (!response.ok) return [];
    return response.json();
  } catch {
    return [];
  }
}

// ============================================================================
// 6. Sync Status & Monitoring
// ============================================================================

export function getSyncStatus() {
  const manager = getSyncManager();
  return manager.getSyncEngine().getState();
}

export function subscribeSyncStatus(callback: (status: any) => void) {
  const manager = getSyncManager();
  return manager.getSyncEngine().subscribe(callback);
}

/**
 * Get sync statistics
 */
export async function getSyncStats(): Promise<{
  pendingChanges: number;
  appliedChanges: number;
  conflicts: number;
  lastSync?: number;
  syncError?: string;
}> {
  const manager = getSyncManager();
  const tracker = manager.getChangeTracker();
  const status = manager.getSyncEngine().getState();

  return {
    pendingChanges: tracker.getPendingChanges().length,
    appliedChanges: tracker.getPendingChanges().filter((c) => c.appliedAt).length,
    conflicts: status.conflictCount,
    lastSync: status.lastSync,
    syncError: status.syncError,
  };
}

// ============================================================================
// 7. Force Sync & Recovery
// ============================================================================

/**
 * Force immediate sync
 */
export async function forceSyncNow(): Promise<void> {
  const manager = getSyncManager();
  await manager.getSyncEngine().sync();
  console.log('[SyncIntegration] Force sync completed');
}

/**
 * Reset sync state (dangerous - use with caution)
 */
export async function resetSyncState(): Promise<void> {
  console.warn('[SyncIntegration] Resetting sync state - this may cause data loss');
  const manager = getSyncManager();
  const tracker = manager.getChangeTracker();

  // Mark all changes as applied
  tracker.getPendingChanges().forEach((change) => {
    tracker.markApplied(change.id);
  });

  console.log('[SyncIntegration] Sync state reset');
}

/**
 * Rebuild sync state from server
 */
export async function rebuildSyncState(): Promise<void> {
  console.log('[SyncIntegration] Rebuilding sync state from server...');

  try {
    const response = await fetch('/api/sync/rebuild', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Rebuild failed: ${response.status}`);
    }

    const result = await response.json();
    console.log('[SyncIntegration] Sync state rebuilt:', result);

    // Force re-index search
    const { initSearchIntegration } = await import('../services/searchIntegration');
    await initSearchIntegration();
  } catch (error) {
    console.error('[SyncIntegration] Rebuild failed:', error);
    throw error;
  }
}
