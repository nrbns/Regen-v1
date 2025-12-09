/**
 * React Hook for Offline RAG
 * Provides easy access to offline document storage and search
 */

import { useState, useCallback, useEffect } from 'react';
import {
  savePageForOffline,
  searchOfflineDocuments,
  listStoredDocuments,
  getStorageStats,
  deleteStoredDocument,
  type RAGResult,
} from '../services/offlineRAG';
import { type StoredDocument } from '../lib/offline-store/indexedDB';
import { toast } from '../utils/toast';

export interface UseOfflineRAGReturn {
  // Storage
  savePage: (url: string, title?: string) => Promise<string | null>;
  deleteDocument: (id: string) => Promise<void>;
  listDocuments: (options?: { limit?: number; offset?: number }) => Promise<StoredDocument[]>;
  
  // Search
  search: (query: string, options?: { limit?: number }) => Promise<RAGResult | null>;
  
  // Stats
  stats: {
    documentCount: number;
    storageSizeMB: number;
    isLoading: boolean;
  };
  refreshStats: () => Promise<void>;
}

/**
 * Hook for using offline RAG
 */
export function useOfflineRAG(): UseOfflineRAGReturn {
  const [stats, setStats] = useState({
    documentCount: 0,
    storageSizeMB: 0,
    isLoading: false,
  });

  const refreshStats = useCallback(async () => {
    setStats(prev => ({ ...prev, isLoading: true }));
    try {
      const storageStats = await getStorageStats();
      setStats({
        documentCount: storageStats.documentCount,
        storageSizeMB: storageStats.storageSizeMB,
        isLoading: false,
      });
    } catch (error) {
      console.error('[useOfflineRAG] Failed to load stats:', error);
      setStats(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  // Load stats on mount
  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  const savePage = useCallback(
    async (url: string, title?: string): Promise<string | null> => {
      try {
        const docId = await savePageForOffline({ url, title, autoExtract: true });
        toast.success('Page saved for offline access');
        await refreshStats();
        return docId;
      } catch (error: any) {
        console.error('[useOfflineRAG] Failed to save page:', error);
        toast.error(`Failed to save page: ${error.message}`);
        return null;
      }
    },
    [refreshStats]
  );

  const deleteDocument = useCallback(
    async (id: string): Promise<void> => {
      try {
        await deleteStoredDocument(id);
        toast.success('Document deleted');
        await refreshStats();
      } catch (error: any) {
        console.error('[useOfflineRAG] Failed to delete document:', error);
        toast.error(`Failed to delete: ${error.message}`);
      }
    },
    [refreshStats]
  );

  const listDocs = useCallback(
    async (options?: { limit?: number; offset?: number }): Promise<StoredDocument[]> => {
      try {
        return await listStoredDocuments(options);
      } catch (error) {
        console.error('[useOfflineRAG] Failed to list documents:', error);
        return [];
      }
    },
    []
  );

  const search = useCallback(
    async (query: string, options?: { limit?: number }): Promise<RAGResult | null> => {
      try {
        return await searchOfflineDocuments(query, options);
      } catch (error: any) {
        console.error('[useOfflineRAG] Search failed:', error);
        toast.error(`Search failed: ${error.message}`);
        return null;
      }
    },
    []
  );

  return {
    savePage,
    deleteDocument,
    listDocuments: listDocs,
    search,
    stats,
    refreshStats,
  };
}



