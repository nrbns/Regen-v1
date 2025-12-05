/**
 * Download Manager
 * Handles file downloads with progress tracking and safety checks
 */

const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');
const Pino = require('pino');

const logger = Pino({ name: 'download-manager' });

class DownloadManager extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      downloadDir: options.downloadDir || path.join(process.cwd(), 'downloads'),
      maxConcurrent: options.maxConcurrent || 3,
      chunkSize: options.chunkSize || 64 * 1024, // 64KB
      timeout: options.timeout || 30000,
      ...options,
    };
    this.downloads = new Map(); // downloadId -> DownloadInfo
    this.activeDownloads = new Set();
    this.stats = {
      total: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
      totalBytes: 0,
    };
  }

  /**
   * Initialize download directory
   */
  async initialize() {
    try {
      await fs.mkdir(this.options.downloadDir, { recursive: true });
      logger.info({ downloadDir: this.options.downloadDir }, 'Download directory initialized');
    } catch (error) {
      logger.error({ error: error.message }, 'Failed to create download directory');
      throw error;
    }
  }

  /**
   * Start a download
   */
  async download(url, options = {}) {
    const downloadId = `download-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const {
      filename,
      destination,
      onProgress,
      onComplete,
      onError,
    } = options;

    // Check concurrent limit
    if (this.activeDownloads.size >= this.options.maxConcurrent) {
      throw new Error('Maximum concurrent downloads reached');
    }

    const downloadInfo = {
      id: downloadId,
      url,
      filename: filename || this._extractFilename(url),
      destination: destination || path.join(this.options.downloadDir, filename || this._extractFilename(url)),
      status: 'pending',
      progress: 0,
      bytesDownloaded: 0,
      totalBytes: 0,
      speed: 0,
      startTime: Date.now(),
      error: null,
    };

    this.downloads.set(downloadId, downloadInfo);
    this.stats.total++;

    this.emit('download:start', downloadInfo);

    // Start download asynchronously
    this._performDownload(downloadInfo, { onProgress, onComplete, onError }).catch(error => {
      logger.error({ downloadId, error: error.message }, 'Download failed');
    });

    return downloadId;
  }

  /**
   * Perform the actual download
   */
  async _performDownload(downloadInfo, callbacks = {}) {
    const { onProgress, onComplete, onError } = callbacks;
    downloadInfo.status = 'downloading';
    this.activeDownloads.add(downloadInfo.id);

    try {
      const urlObj = new URL(downloadInfo.url);
      const protocol = urlObj.protocol === 'https:' ? https : http;

      const file = await fs.open(downloadInfo.destination, 'w');
      let bytesDownloaded = 0;
      const startTime = Date.now();
      let lastUpdateTime = startTime;
      let lastBytes = 0;

      await new Promise((resolve, reject) => {
        const request = protocol.get(downloadInfo.url, (response) => {
          if (response.statusCode !== 200) {
            reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
            return;
          }

          downloadInfo.totalBytes = parseInt(response.headers['content-length'] || '0', 10);

          response.on('data', (chunk) => {
            bytesDownloaded += chunk.length;
            downloadInfo.bytesDownloaded = bytesDownloaded;

            // Calculate progress
            if (downloadInfo.totalBytes > 0) {
              downloadInfo.progress = (bytesDownloaded / downloadInfo.totalBytes) * 100;
            }

            // Calculate speed
            const now = Date.now();
            const timeDelta = (now - lastUpdateTime) / 1000; // seconds
            if (timeDelta >= 1) {
              const bytesDelta = bytesDownloaded - lastBytes;
              downloadInfo.speed = bytesDelta / timeDelta; // bytes per second
              lastUpdateTime = now;
              lastBytes = bytesDownloaded;
            }

            file.write(chunk).catch(reject);
            this.emit('download:progress', downloadInfo);
            onProgress?.(downloadInfo);
          });

          response.on('end', () => {
            file.close();
            downloadInfo.status = 'completed';
            downloadInfo.progress = 100;
            this.stats.completed++;
            this.stats.totalBytes += bytesDownloaded;
            this.activeDownloads.delete(downloadInfo.id);
            this.emit('download:complete', downloadInfo);
            onComplete?.(downloadInfo);
            resolve();
          });

          response.on('error', reject);
        });

        request.on('error', reject);
        request.setTimeout(this.options.timeout, () => {
          request.destroy();
          reject(new Error('Download timeout'));
        });
      });
    } catch (error) {
      downloadInfo.status = 'failed';
      downloadInfo.error = error.message;
      this.stats.failed++;
      this.activeDownloads.delete(downloadInfo.id);
      this.emit('download:error', { ...downloadInfo, error: error.message });
      onError?.(downloadInfo, error);
      throw error;
    }
  }

  /**
   * Cancel a download
   */
  cancel(downloadId) {
    const download = this.downloads.get(downloadId);
    if (!download) {
      return false;
    }

    if (download.status === 'downloading') {
      download.status = 'cancelled';
      this.stats.cancelled++;
      this.activeDownloads.delete(downloadId);
      this.emit('download:cancelled', download);
      return true;
    }

    return false;
  }

  /**
   * Get download info
   */
  getDownload(downloadId) {
    return this.downloads.get(downloadId);
  }

  /**
   * Get all downloads
   */
  getAllDownloads() {
    return Array.from(this.downloads.values());
  }

  /**
   * Get active downloads
   */
  getActiveDownloads() {
    return Array.from(this.downloads.values()).filter(d => d.status === 'downloading');
  }

  /**
   * Extract filename from URL
   */
  _extractFilename(url) {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const filename = path.basename(pathname) || 'download';
      return filename;
    } catch {
      return 'download';
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      ...this.stats,
      active: this.activeDownloads.size,
      pending: Array.from(this.downloads.values()).filter(d => d.status === 'pending').length,
    };
  }

  /**
   * Clear completed downloads
   */
  clearCompleted() {
    const completed = Array.from(this.downloads.values()).filter(
      d => d.status === 'completed' || d.status === 'failed' || d.status === 'cancelled'
    );
    completed.forEach(d => this.downloads.delete(d.id));
    logger.info({ count: completed.length }, 'Cleared completed downloads');
    return completed.length;
  }
}

// Singleton instance
let downloadManagerInstance = null;

function getDownloadManager(options) {
  if (!downloadManagerInstance) {
    downloadManagerInstance = new DownloadManager(options);
    downloadManagerInstance.initialize().catch(error => {
      logger.error({ error: error.message }, 'Failed to initialize download manager');
    });
  }
  return downloadManagerInstance;
}

module.exports = {
  DownloadManager,
  getDownloadManager,
};




