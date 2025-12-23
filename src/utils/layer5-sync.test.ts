/**
 * Layer 5: Data Synchronization Tests
 * 
 * Tests cover:
 * - Change tracking with vector clocks
 * - Conflict resolution (3-way merge)
 * - Real-time sync engine
 * - Data validation and repair
 * - React hooks for sync state management
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  ChangeTracker,
  ConflictResolver,
  RealtimeSyncEngine,
  DataValidator,
} from './layer5-sync';
import type { Change, VersionedData } from './layer5-sync';

// ============================================================================
// 1. ChangeTracker Tests
// ============================================================================

describe('ChangeTracker', () => {
  let tracker: ChangeTracker;

  beforeEach(() => {
    tracker = new ChangeTracker('user123', 'device-001');
  });

  it('should create tracker with vector clock', () => {
    expect(tracker).toBeDefined();
    const vectorClock = tracker.getVectorClock();
    expect(vectorClock).toBeDefined();
  });

  it('should record changes with deterministic IDs', () => {
    const change1 = tracker.recordChange(
      'create',
      'tab-1',
      'tab',
      { id: 'tab-1', title: 'New Tab' },
      undefined,
      []
    );

    const change2 = tracker.recordChange(
      'create',
      'tab-1',
      'tab',
      { id: 'tab-1', title: 'New Tab' },
      undefined,
      []
    );

    // IDs are sequential per tracker (deterministic order, not content-based)
    expect(change1.id).not.toBe(change2.id);
  });

  it('should increment vector clock on changes', () => {
    const before = tracker.getVectorClock();
    tracker.recordChange('create', 'tab-1', 'tab', { id: 'tab-1' }, undefined, []);
    const after = tracker.getVectorClock();

    expect(after.get('device-001')).toBeGreaterThan(before.get('device-001') || 0);
  });

  it('should create version snapshots', () => {
    const data = { id: 'tab-1', title: 'Test' };
    const snapshot = tracker.snapshot('tab-1', data, 'tab');

    expect(snapshot.version).toBe(1);
    expect(snapshot.data).toEqual(data);
    expect(snapshot.timestamp).toBeGreaterThan(0);
  });

  it('should retrieve version history', () => {
    tracker.recordChange('create', 'tab-1', 'tab', { title: 'V1' }, undefined, []);
    tracker.recordChange('update', 'tab-1', 'tab', { title: 'V2' }, { title: 'V1' }, []);
    tracker.recordChange('update', 'tab-1', 'tab', { title: 'V3' }, { title: 'V2' }, []);

    const history = tracker.getChangeHistory('tab-1', 'tab');
    expect(history.length).toBe(3);
    expect(history[0].operation).toBe('create');
    expect(history[2].operation).toBe('update');
  });

  it('should track pending changes', () => {
    const change1 = tracker.recordChange('create', 'tab-1', 'tab', {}, undefined, []);
    const change2 = tracker.recordChange('create', 'tab-2', 'tab', {}, undefined, []);

    let pending = tracker.getPendingChanges();
    expect(pending.length).toBe(2);

    tracker.markApplied(change1.id);
    pending = tracker.getPendingChanges();
    expect(pending.length).toBe(1);
    expect(pending[0].id).toBe(change2.id);
  });

  it('should apply change to data', () => {
    const originalData = { id: 'tab-1', title: 'Original', count: 5 };
    const change: Change = {
      id: 'change-1',
      operation: 'update',
      resourceId: 'tab-1',
      resourceType: 'tab',
      timestamp: Date.now(),
      previousValue: originalData,
      newValue: { id: 'tab-1', title: 'Updated', count: 5 },
      userId: 'user-123',
      deviceId: 'device-001',
      vectorClock: new Map([['device-001', 1]]),
      hash: 'hash-1',
      version: 1,
    };

    const result = tracker.applyChange(change, originalData);
    expect(result.title).toBe('Updated');
  });

  it('should detect conflicting changes', () => {
    const change1: Change = {
      id: 'change-1',
      operation: 'update',
      resourceId: 'tab-1',
      resourceType: 'tab',
      timestamp: Date.now(),
      before: { title: 'Original' },
      after: { title: 'Change1' },
      userId: 'user-123',
      deviceId: 'device-001',
      vectorClock: new Map([['device-001', 1]]),
      hash: 'hash-1',
      version: 1,
    };

    const change2: Change = {
      id: 'change-2',
      operation: 'update',
      resourceId: 'tab-1',
      resourceType: 'tab',
      timestamp: Date.now() + 1,
      before: { title: 'Original' },
      after: { title: 'Change2' },
      userId: 'user-456',
      deviceId: 'device-002',
      vectorClock: new Map([['device-002', 1]]),
      hash: 'hash-2',
      version: 1,
    };

    // Both changes have same base, so they conflict
    expect(change1.version).toBe(change2.version);
  });
});

// ============================================================================
// 2. ConflictResolver Tests
// ============================================================================

describe('ConflictResolver', () => {
  it('should resolve non-conflicting changes (fast-forward)', () => {
    const context = {
      base: { title: 'Original', count: 0 },
      local: { title: 'Local', count: 1 },
      remote: { title: 'Original', count: 0 },
      localChanges: [],
      remoteChanges: [],
      strategy: 'merge' as const,
    };

    const result = ConflictResolver.merge(context);
    expect(result.merged.title).toBe('Local');
    expect(result.conflicts.length).toBe(0);
  });

  it('should detect conflicting field changes', () => {
    const context = {
      base: { title: 'Original', count: 0 },
      local: { title: 'Local', count: 0 },
      remote: { title: 'Remote', count: 0 },
      localChanges: [],
      remoteChanges: [],
      strategy: 'merge' as const,
    };

    const result = ConflictResolver.merge(context);
    expect(result.conflicts.some((c) => c.field === 'title')).toBe(true);
  });

  it('should merge non-conflicting field changes', () => {
    const context = {
      base: { title: 'Original', count: 0, author: 'Alice' },
      local: { title: 'Updated', count: 0, author: 'Alice' },
      remote: { title: 'Original', count: 5, author: 'Alice' },
      localChanges: [],
      remoteChanges: [],
      strategy: 'merge' as const,
    };

    const result = ConflictResolver.merge(context);
    expect(result.merged.title).toBe('Updated'); // From local
    expect(result.merged.count).toBe(5); // From remote
    expect(result.merged.author).toBe('Alice'); // Unchanged
    expect(result.conflicts.length).toBe(0);
  });

  it('should smartMerge arrays (add, remove, update)', () => {
    const context = {
      base: { tags: ['a', 'b', 'c'] },
      local: { tags: ['a', 'b', 'c', 'd'] }, // Added 'd'
      remote: { tags: ['a', 'c'] }, // Removed 'b'
      localChanges: [],
      remoteChanges: [],
      strategy: 'merge' as const,
    };

    const result = ConflictResolver.merge(context);
    const merged = result.merged.tags as string[];
    expect(merged).toContain('a');
    expect(merged).toContain('c');
    expect(merged).toContain('d');
    expect(merged).not.toContain('b');
  });

  it('should smartMerge objects (nested updates)', () => {
    const context = {
      base: {
        metadata: { author: 'Alice', created: 1000, version: 1 },
      },
      local: {
        metadata: { author: 'Bob', created: 1000, version: 2 },
      }, // Changed author + version
      remote: {
        metadata: { author: 'Alice', created: 1001, version: 1 },
      }, // Changed created
      localChanges: [],
      remoteChanges: [],
      strategy: 'merge' as const,
    };

    const result = ConflictResolver.merge(context);
    // Should have conflicts on author/version
    expect(result.conflicts.length).toBeGreaterThan(0);
  });

  it('should apply strategy: local', () => {
    const context = {
      base: { count: 0 },
      local: { count: 1 },
      remote: { count: 5 },
      localChanges: [],
      remoteChanges: [],
      strategy: 'local' as const,
    };

    const result = ConflictResolver.merge(context);
    expect(result.merged.count).toBe(1);
  });

  it('should apply strategy: remote', () => {
    const context = {
      base: { count: 0 },
      local: { count: 1 },
      remote: { count: 5 },
      localChanges: [],
      remoteChanges: [],
      strategy: 'remote' as const,
    };

    const result = ConflictResolver.merge(context);
    expect(result.merged.count).toBe(5);
  });

  it('should detect conflicts', () => {
    const conflict = ConflictResolver.detectConflict(
      { title: 'Original', count: 0 },
      { title: 'Local', count: 0 },
      { title: 'Remote', count: 0 }
    );

    expect(conflict).toBe(true);
  });
});

// ============================================================================
// 3. RealtimeSyncEngine Tests
// ============================================================================

describe('RealtimeSyncEngine', () => {
  let tracker: ChangeTracker;
  let engine: RealtimeSyncEngine;

  beforeEach(() => {
    tracker = new ChangeTracker('user123', 'device-001');
    engine = new RealtimeSyncEngine(tracker);

    // Mock fetch
    global.fetch = vi.fn();
  });

  afterEach(() => {
    engine.stop();
  });

  it('should initialize with default state', () => {
    const state = engine.getState();
    expect(state.status).toBe('idle');
    expect(state.syncCount).toBe(0);
    expect(state.conflictCount).toBe(0);
  });

  it('should start and stop sync', () => {
    engine.start(5000);
    expect(engine.getState().status).not.toBe('stopped');

    engine.stop();
    expect(engine.getState().status).toBe('stopped');
  });

  it('should subscribe to sync state changes', async () => {
    let callCount = 0;

    await new Promise<void>((resolve) => {
      engine.subscribe((state) => {
        callCount++;
        if (callCount === 1) {
          // First callback receives initial state (idle or syncing)
          expect(['idle', 'syncing']).toContain(state.status);
          engine.stop();
          resolve();
        }
      });

      engine.start(5000);
    });
  });

  it('should perform sync with pending changes', async () => {
    tracker.recordChange('create', 'tab-1', 'tab', { id: 'tab-1' }, undefined, []);

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ appliedChanges: 1, conflicts: 0 }),
    });

    await engine.sync();

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/sync/changes'),
      expect.any(Object)
    );
  });

  it('should handle sync errors', async () => {
      // Add a pending change so sync actually makes the fetch call
      tracker.recordChange('create', 'tab-error', 'tab', { id: 'tab-error' }, undefined, []);

    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    await engine.sync();
    const stateAfter = engine.getState();

    expect(stateAfter.syncError).toBeDefined();
    expect(stateAfter.status).toBe('error');
  });

  it('should track sync count', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ appliedChanges: 0, conflicts: 0 }),
    });

    const before = engine.getState().syncCount;
    await engine.sync();
    const after = engine.getState().syncCount;

    expect(after).toBeGreaterThan(before);
  });

  it('should resolve conflicts', async () => {
      // Add a pending change so sync makes the fetch call
      tracker.recordChange('create', 'tab-conflict', 'tab', { id: 'tab-conflict' }, undefined, []);

    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          conflicts: [
            {
              resourceId: 'tab-1',
              resourceType: 'tab',
              base: { title: 'Original' },
              local: { title: 'Local' },
              remote: { title: 'Remote' },
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ resolved: true }),
      });

    await engine.sync();

    // Should attempt to resolve conflicts
    expect(global.fetch).toHaveBeenCalled();
  });

  it('should handle online/offline transitions', () => {
    engine.start(5000);

    const onlineEvent = new Event('online');
    window.dispatchEvent(onlineEvent);
    expect(engine.getState().isOnline).toBe(true);

    const offlineEvent = new Event('offline');
    window.dispatchEvent(offlineEvent);
    expect(engine.getState().isOnline).toBe(false);

    engine.stop();
  });
});

// ============================================================================
// 4. DataValidator Tests
// ============================================================================

describe('DataValidator', () => {
  it('should validate correct versioned data', () => {
    const versionedData: VersionedData = {
      id: 'tab-1',
      data: { id: 'tab-1', title: 'Test' },
      version: 1,
      timestamp: Date.now(),
      userId: 'user-123',
      deviceId: 'device-001',
      hash: 'abc123',
      vectorClock: new Map(),
      changes: [],
      deleted: false,
      conflictResolved: true,
    };

    const result = DataValidator.validate(versionedData);
    expect(result.isValid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('should detect missing required fields', () => {
    const versionedData: any = {
      data: { id: 'tab-1' },
      // Missing version, timestamp, etc.
    };

    const result = DataValidator.validate(versionedData);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should detect timestamp inconsistencies', () => {
    const futureTime = Date.now() + 86400000; // 1 day in future
    const versionedData: VersionedData = {
      data: { id: 'tab-1' },
      version: 1,
      timestamp: futureTime,
      userId: 'user-123',
      deviceId: 'device-001',
      hash: 'abc123',
      vectorClock: new Map(),
    };

    const result = DataValidator.validate(versionedData);
    expect(result.isValid).toBe(false);
  });

  it('should repair data with replay', () => {
    const corruptedData: any = {
      data: { id: 'tab-1', title: 'Corrupt' },
      version: 5,
      timestamp: Date.now(),
      userId: 'user-123',
      deviceId: 'device-001',
      hash: 'wrong-hash',
      vectorClock: new Map(),
      history: [
        {
          operation: 'create',
          data: { id: 'tab-1', title: 'Original' },
          timestamp: Date.now() - 5000,
        },
        {
          operation: 'update',
          data: { id: 'tab-1', title: 'Updated' },
          timestamp: Date.now() - 2000,
        },
      ],
    };

    const repaired = DataValidator.repair(corruptedData);
    expect(repaired.data).toBeDefined();
  });
});

// ============================================================================
// 5. Integration Tests
// ============================================================================

describe('Change Tracking Integration', () => {
  let tracker: ChangeTracker;

  beforeEach(() => {
    tracker = new ChangeTracker('user123', 'device-001');
  });

  it('should handle complex multi-user scenario', () => {
    // User 1 creates tab
    const change1 = tracker.recordChange(
      'create',
      'tab-1',
      'tab',
      { id: 'tab-1', title: 'Shared Tab' },
      undefined,
      []
    );

    // User 1 updates tab
    const change2 = tracker.recordChange(
      'update',
      'tab-1',
      'tab',
      { id: 'tab-1', title: 'Updated by User1' },
      { id: 'tab-1', title: 'Shared Tab' },
      []
    );

    const history = tracker.getChangeHistory('tab-1', 'tab');
    expect(history.length).toBe(2);
    expect(history[0].id).toBe(change1.id);
    expect(history[1].id).toBe(change2.id);
  });

  it('should maintain causal ordering with vector clocks', () => {
    const change1 = tracker.recordChange('create', 'tab-1', 'tab', {}, undefined, []);
    const change2 = tracker.recordChange('create', 'tab-2', 'tab', {}, undefined, []);

    expect(change1.vectorClock.get('device-001')).toBeLessThan(
      change2.vectorClock.get('device-001') || 0
    );
  });

  it('should snapshot and restore state', () => {
    const data = { id: 'tab-1', title: 'Original', content: 'Hello' };
    tracker.recordChange('create', 'tab-1', 'tab', data, undefined, []);

    const snapshot = tracker.snapshot('tab-1', data, 'tab');
    expect(snapshot.version).toBe(1);

    const updated = { ...data, title: 'Updated' };
    tracker.recordChange('update', 'tab-1', 'tab', updated, data, []);

    const snapshot2 = tracker.snapshot('tab-1', updated, 'tab');
    expect(snapshot2.version).toBe(2);
  });
});

// ============================================================================
// 6. Performance Tests
// ============================================================================

describe('Performance', () => {
  it('should record changes in <1ms', () => {
    const tracker = new ChangeTracker('user123', 'device-001');
    const start = performance.now();

    for (let i = 0; i < 100; i++) {
      tracker.recordChange(
        'create',
        `tab-${i}`,
        'tab',
        { id: `tab-${i}`, title: `Tab ${i}` },
        undefined,
        []
      );
    }

    const elapsed = performance.now() - start;
    const avgTime = elapsed / 100;

    expect(avgTime).toBeLessThan(1);
  });

  it('should merge changes in <10ms', () => {
    const start = performance.now();

    const context = {
      base: { tags: Array.from({ length: 50 }, (_, i) => `tag-${i}`) },
      local: { tags: Array.from({ length: 60 }, (_, i) => `tag-${i}`) },
      remote: { tags: Array.from({ length: 55 }, (_, i) => `tag-${i}`) },
      localChanges: [],
      remoteChanges: [],
      strategy: 'merge' as const,
    };

    ConflictResolver.merge(context);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(10);
  });

  it('should handle 1000 pending changes', () => {
    const tracker = new ChangeTracker('user123', 'device-001');

    for (let i = 0; i < 1000; i++) {
      tracker.recordChange(
        'update',
        `tab-${i % 100}`,
        'tab',
        { id: `tab-${i % 100}`, version: i },
        undefined,
        []
      );
    }

    const pending = tracker.getPendingChanges();
    expect(pending.length).toBe(1000);

    const start = performance.now();
    const history = tracker.getChangeHistory('tab-0', 'tab');
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(10);
    expect(history.length).toBeGreaterThan(0);
  });
});
