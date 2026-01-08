import { systemState } from '../state/SystemState';

export class DownloadManager {
  static handleDownload(filename: string, url: string): string {
    // IMMEDIATE: Update SystemState first - UI shows download immediately
    const downloadId = systemState.addDownload(filename, url);

    // ASYNC: Try to start actual download in backend
    try {
      console.log(`[DownloadManager] Starting download: ${filename} from ${url}`);
      // In real implementation: IPCHandler.send('download-started', { downloadId, filename, url });

      // Emit toast event (UI can listen for this)
      window.dispatchEvent(new CustomEvent('system:toast', {
        detail: { message: `Downloading: ${filename}`, type: 'info' }
      }));
    } catch (error) {
      console.error('[DownloadManager] Failed to start backend download:', error);
      // UI still shows download even if backend fails
    }

    return downloadId;
  }

  static async getDownloads() {
    try {
      // Get downloads from Tauri
      const downloads = await (window as any).__TAURI__.invoke('downloads:list');
      return downloads;
    } catch (error) {
      console.error('[DownloadManager] Failed to get downloads:', error);
      // Fallback to local state
      return systemState.getState().downloads;
    }
  }
}
