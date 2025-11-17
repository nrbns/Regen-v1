/**
 * Downloads Store - Download management and tracking
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type DownloadStatus = 'queued' | 'downloading' | 'paused' | 'completed' | 'error' | 'cancelled';

export interface Download {
  id: string;
  url: string;
  filename: string;
  path?: string;
  status: DownloadStatus;
  progress: number; // 0-100
  totalBytes?: number;
  receivedBytes?: number;
  speed?: string; // e.g., "1.2 MB/s"
  eta?: string; // e.g., "2m 30s"
  startedAt: number;
  completedAt?: number;
  error?: string;
  mimeType?: string;
}

interface DownloadsStore {
  downloads: Download[];
  addDownload: (download: Omit<Download, 'id' | 'status' | 'progress' | 'startedAt'>) => string;
  updateDownload: (id: string, updates: Partial<Download>) => void;
  removeDownload: (id: string) => void;
  pauseDownload: (id: string) => void;
  resumeDownload: (id: string) => void;
  cancelDownload: (id: string) => void;
  clearCompleted: () => void;
  clearAll: () => void;
  getActiveDownloads: () => Download[];
  getCompletedDownloads: () => Download[];
  getDownload: (id: string) => Download | undefined;
}

export const useDownloadsStore = create<DownloadsStore>()(
  persist(
    (set, get) => ({
      downloads: [],
      
      addDownload: (download) => {
        const id = crypto.randomUUID();
        const newDownload: Download = {
          ...download,
          id,
          status: 'queued',
          progress: 0,
          startedAt: Date.now(),
        };
        
        set((state) => ({
          downloads: [...state.downloads, newDownload],
        }));
        
        return id;
      },
      
      updateDownload: (id, updates) => {
        set((state) => ({
          downloads: state.downloads.map((d) =>
            d.id === id
              ? {
                  ...d,
                  ...updates,
                  completedAt: updates.status === 'completed' ? Date.now() : d.completedAt,
                }
              : d
          ),
        }));
      },
      
      removeDownload: (id) => {
        set((state) => ({
          downloads: state.downloads.filter((d) => d.id !== id),
        }));
      },
      
      pauseDownload: (id) => {
        const download = get().downloads.find((d) => d.id === id);
        if (download && download.status === 'downloading') {
          get().updateDownload(id, { status: 'paused' });
        }
      },
      
      resumeDownload: (id) => {
        const download = get().downloads.find((d) => d.id === id);
        if (download && download.status === 'paused') {
          get().updateDownload(id, { status: 'downloading' });
        }
      },
      
      cancelDownload: (id) => {
        get().updateDownload(id, { status: 'cancelled' });
      },
      
      clearCompleted: () => {
        set((state) => ({
          downloads: state.downloads.filter((d) => d.status !== 'completed'),
        }));
      },
      
      clearAll: () => {
        set({ downloads: [] });
      },
      
      getActiveDownloads: () => {
        return get().downloads.filter(
          (d) => d.status === 'downloading' || d.status === 'queued' || d.status === 'paused'
        );
      },
      
      getCompletedDownloads: () => {
        return get().downloads.filter((d) => d.status === 'completed');
      },
      
      getDownload: (id) => {
        return get().downloads.find((d) => d.id === id);
      },
    }),
    {
      name: 'omnibrowser-downloads',
    }
  )
);

