/**
 * Conflict Resolution Logic
 * Handles conflicts when local and remote data differ
 */

import type {
  ConflictEntry,
  ConflictStrategy,
} from './types';

/**
 * Resolve conflicts based on strategy
 */
export function resolveConflict<T extends { version?: number; updatedAt?: number }>(
  local: T,
  remote: T,
  strategy: ConflictStrategy
): T {
  switch (strategy) {
    case 'last-write-wins':
      // Use the one with the latest timestamp
      const localTime = local.updatedAt || 0;
      const remoteTime = remote.updatedAt || 0;
      return localTime > remoteTime ? local : remote;

    case 'server-wins':
      return remote;

    case 'client-wins':
      return local;

    case 'merge':
      // Merge strategy - combine both, prioritizing remote for conflicts
      return {
        ...local,
        ...remote,
        // Keep local IDs and metadata, but use remote values
        version: Math.max(local.version || 0, remote.version || 0) + 1,
        updatedAt: Date.now(),
      } as T;

    default:
      return local; // Default to local
  }
}

/**
 * Detect conflicts between local and remote data
 */
export function detectConflicts<T extends { id: string; version?: number; updatedAt?: number }>(
  local: T[],
  remote: T[],
  type: 'history' | 'bookmark' | 'bookmarkFolder' | 'settings'
): ConflictEntry[] {
  const conflicts: ConflictEntry[] = [];
  const localMap = new Map(local.map(item => [item.id, item]));
  const remoteMap = new Map(remote.map(item => [item.id, item]));

  // Check for conflicts (same ID, different versions/timestamps)
  for (const [id, localItem] of localMap.entries()) {
    const remoteItem = remoteMap.get(id);
    if (remoteItem) {
      const localVersion = localItem.version || 0;
      const remoteVersion = remoteItem.version || 0;
      const localTime = localItem.updatedAt || 0;
      const remoteTime = remoteItem.updatedAt || 0;

      // Conflict if versions differ or timestamps differ significantly
      if (localVersion !== remoteVersion || Math.abs(localTime - remoteTime) > 1000) {
        conflicts.push({
          type,
          id,
          local: localItem,
          remote: remoteItem,
          strategy: 'last-write-wins', // Default strategy
          resolved: false,
        });
      }
    }
  }

  return conflicts;
}

/**
 * Resolve all conflicts with a strategy
 */
export function resolveAllConflicts(
  conflicts: ConflictEntry[],
  strategy: ConflictStrategy
): any[] {
  return conflicts.map(conflict => {
    const resolved = resolveConflict(conflict.local, conflict.remote, strategy);
    return {
      ...resolved,
      resolved: true,
      conflictId: conflict.id,
    };
  });
}

/**
 * Merge arrays resolving conflicts
 */
export function mergeWithConflictResolution<T extends { id: string; version?: number }>(
  local: T[],
  remote: T[],
  strategy: ConflictStrategy = 'last-write-wins'
): T[] {
  const merged = new Map<string, T>();

  // Add all local items
  for (const item of local) {
    merged.set(item.id, item);
  }

  // Merge remote items
  for (const remoteItem of remote) {
    const localItem = merged.get(remoteItem.id);
    if (localItem) {
      // Conflict - resolve it
      const resolved = resolveConflict(localItem, remoteItem, strategy);
      merged.set(remoteItem.id, resolved);
    } else {
      // New item from remote
      merged.set(remoteItem.id, remoteItem);
    }
  }

  return Array.from(merged.values());
}

/**
 * Detect deleted items (in local but not in remote after sync window)
 */
export function detectDeletions<T extends { id: string; updatedAt?: number }>(
  local: T[],
  remote: T[],
  syncWindowMs: number = 7 * 24 * 60 * 60 * 1000 // 7 days
): string[] {
  const remoteIds = new Set(remote.map(item => item.id));
  const now = Date.now();

  return local
    .filter(item => {
      // Item is in local but not in remote
      if (!remoteIds.has(item.id)) {
        // Only consider deleted if it's older than sync window
        const itemAge = now - (item.updatedAt || 0);
        return itemAge > syncWindowMs;
      }
      return false;
    })
    .map(item => item.id);
}

