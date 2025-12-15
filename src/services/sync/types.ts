/**
 * Sync Types
 * Type definitions for sync functionality
 */

export interface SyncEvent {
  id: string;
  type: 'create' | 'update' | 'delete';
  timestamp: number;
  data: Record<string, any>;
}

export interface SyncState {
  lastSyncTime: number;
  pendingEvents: SyncEvent[];
  isOnline: boolean;
}

export interface EncryptionConfig {
  algorithm: string;
  keyDerivation: string;
}
