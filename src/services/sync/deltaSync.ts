/**
 * Delta Sync Implementation
 * Calculates and applies only changes (deltas) between syncs
 */

import type {
  SyncData,
  SyncDelta,
} from './types';

/**
 * Calculate delta (changes) between two sync data sets
 */
export function calculateDelta(
  oldData: SyncData,
  newData: SyncData,
  sinceTimestamp: number
): SyncDelta {
  const delta: SyncDelta = {
    lastSynced: Date.now(),
  };

  // History delta
  const historyAdded = newData.history.filter(
    item => !oldData.history.find(old => old.id === item.id) && item.timestamp >= sinceTimestamp
  );
  const historyUpdated = newData.history.filter(
    item => {
      const oldItem = oldData.history.find(old => old.id === item.id);
      return oldItem && (item.updatedAt || item.timestamp) > (oldItem.updatedAt || oldItem.timestamp);
    }
  );
  const historyDeleted = oldData.history
    .filter(old => !newData.history.find(item => item.id === old.id))
    .map(item => item.id);

  if (historyAdded.length > 0 || historyUpdated.length > 0 || historyDeleted.length > 0) {
    delta.history = {
      added: historyAdded,
      updated: historyUpdated,
      deleted: historyDeleted,
    };
  }

  // Bookmarks delta
  const bookmarksAdded = newData.bookmarks.filter(
    item => !oldData.bookmarks.find(old => old.id === item.id) && item.createdAt >= sinceTimestamp
  );
  const bookmarksUpdated = newData.bookmarks.filter(
    item => {
      const oldItem = oldData.bookmarks.find(old => old.id === item.id);
      return oldItem && item.updatedAt > oldItem.updatedAt;
    }
  );
  const bookmarksDeleted = oldData.bookmarks
    .filter(old => !newData.bookmarks.find(item => item.id === old.id))
    .map(item => item.id);

  if (bookmarksAdded.length > 0 || bookmarksUpdated.length > 0 || bookmarksDeleted.length > 0) {
    delta.bookmarks = {
      added: bookmarksAdded,
      updated: bookmarksUpdated,
      deleted: bookmarksDeleted,
    };
  }

  // Settings delta
  const settingsUpdated = newData.settings.filter(
    item => {
      const oldItem = oldData.settings.find(old => old.key === item.key);
      return !oldItem || item.updatedAt > oldItem.updatedAt;
    }
  );
  const settingsDeleted = oldData.settings
    .filter(old => !newData.settings.find(item => item.key === old.key))
    .map(item => item.key);

  if (settingsUpdated.length > 0 || settingsDeleted.length > 0) {
    delta.settings = {
      updated: settingsUpdated,
      deleted: settingsDeleted,
    };
  }

  return delta;
}

/**
 * Apply delta to existing data
 */
export function applyDelta(data: SyncData, delta: SyncDelta): SyncData {
  const result = { ...data };

  // Apply history delta
  if (delta.history) {
    // Add new items
    if (delta.history.added) {
      result.history = [...result.history, ...delta.history.added];
    }

    // Update existing items
    if (delta.history.updated) {
      const updatedMap = new Map(delta.history.updated.map(item => [item.id, item]));
      result.history = result.history.map(item => updatedMap.get(item.id) || item);
    }

    // Remove deleted items
    if (delta.history.deleted) {
      const deletedSet = new Set(delta.history.deleted);
      result.history = result.history.filter(item => !deletedSet.has(item.id));
    }
  }

  // Apply bookmarks delta
  if (delta.bookmarks) {
    if (delta.bookmarks.added) {
      result.bookmarks = [...result.bookmarks, ...delta.bookmarks.added];
    }
    if (delta.bookmarks.updated) {
      const updatedMap = new Map(delta.bookmarks.updated.map(item => [item.id, item]));
      result.bookmarks = result.bookmarks.map(item => updatedMap.get(item.id) || item);
    }
    if (delta.bookmarks.deleted) {
      const deletedSet = new Set(delta.bookmarks.deleted);
      result.bookmarks = result.bookmarks.filter(item => !deletedSet.has(item.id));
    }
  }

  // Apply settings delta
  if (delta.settings) {
    if (delta.settings.updated) {
      const updatedMap = new Map(delta.settings.updated.map(item => [item.key, item]));
      result.settings = result.settings.map(item => updatedMap.get(item.key) || item);
      // Add new settings
      delta.settings.updated.forEach(item => {
        if (!result.settings.find(s => s.key === item.key)) {
          result.settings.push(item);
        }
      });
    }
    if (delta.settings.deleted) {
      const deletedSet = new Set(delta.settings.deleted);
      result.settings = result.settings.filter(item => !deletedSet.has(item.key));
    }
  }

  result.lastSynced = delta.lastSynced;
  return result;
}

/**
 * Check if delta is empty (no changes)
 */
export function isDeltaEmpty(delta: SyncDelta): boolean {
  const hasHistory = delta.history && (
    (delta.history.added && delta.history.added.length > 0) ||
    (delta.history.updated && delta.history.updated.length > 0) ||
    (delta.history.deleted && delta.history.deleted.length > 0)
  );

  const hasBookmarks = delta.bookmarks && (
    (delta.bookmarks.added && delta.bookmarks.added.length > 0) ||
    (delta.bookmarks.updated && delta.bookmarks.updated.length > 0) ||
    (delta.bookmarks.deleted && delta.bookmarks.deleted.length > 0)
  );

  const hasSettings = delta.settings && (
    (delta.settings.updated && delta.settings.updated.length > 0) ||
    (delta.settings.deleted && delta.settings.deleted.length > 0)
  );

  return !hasHistory && !hasBookmarks && !hasSettings;
}

