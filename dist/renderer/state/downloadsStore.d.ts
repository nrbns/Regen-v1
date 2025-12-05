/**
 * Downloads Store - Download management and tracking
 */
export type DownloadStatus = 'queued' | 'downloading' | 'paused' | 'completed' | 'error' | 'cancelled';
export interface Download {
    id: string;
    url: string;
    filename: string;
    path?: string;
    status: DownloadStatus;
    progress: number;
    totalBytes?: number;
    receivedBytes?: number;
    speed?: string;
    eta?: string;
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
export declare const useDownloadsStore: import("zustand").UseBoundStore<Omit<import("zustand").StoreApi<DownloadsStore>, "persist"> & {
    persist: {
        setOptions: (options: Partial<import("zustand/middleware").PersistOptions<DownloadsStore, DownloadsStore>>) => void;
        clearStorage: () => void;
        rehydrate: () => Promise<void> | void;
        hasHydrated: () => boolean;
        onHydrate: (fn: (state: DownloadsStore) => void) => () => void;
        onFinishHydration: (fn: (state: DownloadsStore) => void) => () => void;
        getOptions: () => Partial<import("zustand/middleware").PersistOptions<DownloadsStore, DownloadsStore>>;
    };
}>;
export {};
