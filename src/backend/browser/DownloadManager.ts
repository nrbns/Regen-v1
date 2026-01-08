import { systemState } from '../state/SystemState';

export class DownloadManager {
  static handleDownload(filename: string, url: string): string {
    // In a real implementation, this would:
    // 1. Create actual download via WebView APIs
    // 2. Save to user's Downloads folder
    // 3. Show system notification

    // For now, just update state and show toast
    const downloadId = systemState.addDownload(filename, url);

    // Emit toast event (UI can listen for this)
    window.dispatchEvent(new CustomEvent('system:toast', {
      detail: { message: `Downloaded: ${filename}`, type: 'success' }
    }));

    return downloadId;
  }

  static getDownloads() {
    return systemState.getState().downloads;
  }
}
