/**
 * Sync Types
 * Type definitions for sync functionality
 */

export type ConflictStrategy = 'last-write-wins' | 'server-wins' | 'client-wins' | 'merge';

export interface SyncEvent {
  id: string;
  type: 'create' | 'update' | 'delete';
  timestamp: number;
  data: Record<string, any>;
}

export interface SyncHistoryEntry {
  id: string;
  url: string;
  title?: string;
  timestamp: number;
  lastVisitTime?: number;
  visitCount?: number;
  updatedAt?: number;
  version?: number;
}

export interface SyncBookmark {
  id: string;
  url: string;
  title?: string;
  folderId?: string | null;
  parentId?: string | null;
  order?: number;
  createdAt: number;
  updatedAt: number;
  version?: number;
}

export interface SyncSetting {
  key: string;
  value: any;
  updatedAt: number;
  version?: number;
}

export interface SyncData {
  history: SyncHistoryEntry[];
  bookmarks: SyncBookmark[];
  bookmarkFolders: any[];
  settings: SyncSetting[];
  lastSynced: number;
  version: number;
}

export interface HistoryDelta {
  added?: SyncHistoryEntry[];
  updated?: SyncHistoryEntry[];
  deleted?: string[];
}

export interface BookmarkDelta {
  added?: SyncBookmark[];
  updated?: SyncBookmark[];
  deleted?: string[];
}

export interface SettingsDelta {
  updated?: SyncSetting[];
  deleted?: string[];
}

export interface SyncDelta {
  history?: HistoryDelta;
  bookmarks?: BookmarkDelta;
  settings?: SettingsDelta;
  lastSynced: number;
}

export interface SyncState {
  lastSyncTime: number;
  pendingEvents: SyncEvent[];
  isOnline: boolean;
}

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: number | null;
  lastSyncError: string | null;
  pendingChanges: number;
  conflictCount: number;
}

export interface SyncResult {
  success: boolean;
  error?: string;
  syncedItems?: {
    history: number;
    bookmarks: number;
    settings: number;
  };
}

export interface ConflictEntry {
  type: 'history' | 'bookmark' | 'bookmarkFolder' | 'settings';
  id: string;
  local: any;
  remote: any;
  strategy: ConflictStrategy;
  resolved: boolean;
}

export interface SyncStorage {
  initialize(password?: string): Promise<void>;
  getAllSyncData(): Promise<SyncData>;
  saveAllSyncData(data: SyncData): Promise<void>;
  saveHistory(history: SyncHistoryEntry[]): Promise<void>;
  saveBookmarks(bookmarks: SyncBookmark[]): Promise<void>;
  saveSettings(settings: SyncSetting[]): Promise<void>;
}

export interface EncryptionConfig {
  algorithm: string;
  keyDerivation: string;
}
