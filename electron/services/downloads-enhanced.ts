/**
 * Secure Downloads Service
 * - Tracks active downloads and exposes controls (pause/resume/cancel)
 * - Persists metadata for renderer download manager
 * - Computes SHA-256 checksums (optional)
 * - Runs enhanced threat scan on completed files and quarantines malicious results
 */

import { BrowserWindow, DownloadItem, app, session, shell } from 'electron';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { registerHandler } from '../shared/ipc/router';
import { z } from 'zod';
import { addDownloadRecord, listDownloads, Download, DownloadSafety, getCurrentSettings } from './storage';
import { getEnhancedThreatScanner } from './threats/enhanced-scanner';
import { getMainWindow } from './windows';
import { getActiveProfileForWindow, profileAllows } from './profiles';
import { computeFileChecksum } from './downloads/checksum';

const activeDownloads = new Map<string, DownloadItem>();
const downloadSources = new Map<string, BrowserWindow | null | undefined>();
const downloadMetrics = new Map<string, { bytes: number; timestamp: number }>();
const downloadQueue: Array<{ id: string; priority: number; timestamp: number }> = [];
const downloadRetries = new Map<string, number>();
let downloadsInitialized = false;
const MAX_CONCURRENT_DOWNLOADS = 3; // Limit concurrent downloads
const MAX_RETRIES = 3; // Maximum retry attempts for failed downloads

function getPrivateDownloadDir() {
  return path.join(tmpdir(), 'omnibrowser-private-downloads');
}

function mapThreatLevel(level: string | undefined): DownloadSafety['status'] {
  switch (level) {
    case 'critical':
    case 'high':
      return 'blocked';
    case 'medium':
      return 'warning';
    case 'low':
      return 'clean';
    default:
      return 'unknown';
  }
}

async function runSafetyScan(filePath: string | undefined): Promise<DownloadSafety> {
  if (!filePath) {
    return { status: 'unknown', details: 'No file path available for scanning.', scannedAt: Date.now() };
  }

  try {
    const scanner = getEnhancedThreatScanner();
    const result = await scanner.scanFile(filePath);
    const status = mapThreatLevel(result.threatLevel);
    const safety: DownloadSafety = {
      status,
      threatLevel: result.threatLevel,
      recommendations: result.recommendations,
      details: result.fileAnalysis?.threatLevel ? `File threat level: ${result.fileAnalysis.threatLevel}` : undefined,
      scannedAt: Date.now(),
    };

    if (status === 'blocked') {
      try {
        const quarantineDir = path.join(app.getPath('downloads'), 'OmniBrowser', 'Quarantine');
        await fs.mkdir(quarantineDir, { recursive: true });
        const quarantinePath = path.join(quarantineDir, path.basename(filePath));
        await fs.rename(filePath, quarantinePath);
        safety.quarantinePath = quarantinePath;
      } catch (error) {
        safety.details = `${safety.details ?? ''} Unable to quarantine file automatically: ${error instanceof Error ? error.message : String(error)}`.trim();
      }
    }

    return safety;
  } catch (error) {
    return {
      status: 'unknown',
      details: error instanceof Error ? error.message : String(error),
      scannedAt: Date.now(),
    };
  }
}

function resolveDownloadDirectory(isPrivate: boolean, customPath?: string): string {
  if (isPrivate) {
    return getPrivateDownloadDir();
  }
  if (customPath && customPath.trim().length > 0) {
    if (path.isAbsolute(customPath)) return customPath;
    return path.join(app.getPath('downloads'), customPath);
  }
  return path.join(app.getPath('downloads'), 'OmniBrowser');
}

function buildDownloadRecord(partial: Partial<Download>): Download {
  return {
    id: partial.id ?? randomUUID(),
    url: partial.url ?? '',
    filename: partial.filename,
    status: partial.status ?? 'pending',
    path: partial.path,
    createdAt: partial.createdAt ?? Date.now(),
    progress: partial.progress,
    receivedBytes: partial.receivedBytes,
    totalBytes: partial.totalBytes,
    checksum: partial.checksum,
    safety: partial.safety,
    speedBytesPerSec: partial.speedBytesPerSec,
    etaSeconds: partial.etaSeconds,
  };
}

function emitToWindow(win: BrowserWindow | null | undefined, channel: string, payload: any) {
  if (win && !win.isDestroyed()) {
    try {
      win.webContents.send(channel, payload);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[Downloads] Failed to send ${channel}`, error);
      }
    }
  }
}

async function handleDownloadDone(
  downloadId: string,
  item: DownloadItem,
  downloadRecord: Download,
  sourceWin: BrowserWindow | null | undefined,
  settingsChecksum: boolean,
) {
  const finalPath = item.getSavePath();
  const finalStatus = item.getState() === 'completed' ? 'completed' :
    item.getState() === 'cancelled' ? 'cancelled' :
    item.getState() === 'interrupted' ? 'failed' : 'failed';

  let checksum: string | undefined;
  if (finalStatus === 'completed' && settingsChecksum && finalPath) {
    const verifyingRecord = buildDownloadRecord({
      ...downloadRecord,
      status: 'verifying',
      path: finalPath,
      progress: 1,
      receivedBytes: item.getReceivedBytes(),
      totalBytes: item.getTotalBytes(),
    });
    addDownloadRecord(verifyingRecord);
    emitToWindow(sourceWin, 'downloads:progress', verifyingRecord);

    try {
      checksum = await computeFileChecksum(finalPath, () => {
        // Future: emit checksum progress if desired
      });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Downloads] Failed to calculate checksum:', error);
      }
    }
  }

  const safety = finalStatus === 'completed'
    ? await runSafetyScan(finalPath)
    : { status: 'unknown' as const, scannedAt: Date.now() };

  const finalRecord: Download = {
    ...downloadRecord,
    status: safety.status === 'blocked' ? 'blocked' : finalStatus,
    path: safety.status === 'blocked' && safety.quarantinePath ? safety.quarantinePath : finalPath,
    checksum,
    safety,
    progress: 1,
    receivedBytes: item.getReceivedBytes(),
    totalBytes: item.getTotalBytes(),
  };

  addDownloadRecord(finalRecord);
  emitToWindow(sourceWin, 'downloads:done', finalRecord);
  activeDownloads.delete(downloadId);
  downloadMetrics.delete(downloadId);
  downloadSources.delete(downloadId);
}

function registerDownloadSessionListener() {
  if (downloadsInitialized) return;
  downloadsInitialized = true;

  const sess = session.defaultSession;
  sess.on('will-download', async (_event, item, webContents) => {
    const settings = getCurrentSettings();
    const downloadId = randomUUID();
    const sourceWin = BrowserWindow.fromWebContents(webContents) || getMainWindow();
    const activeProfile = getActiveProfileForWindow(sourceWin || null);

    if (!profileAllows(activeProfile.id, 'downloads')) {
      item.cancel();
      emitToWindow(sourceWin, 'profiles:policy-blocked', {
        profileId: activeProfile.id,
        action: 'downloads',
      });
      return;
    }

    const url = item.getURL();
    const filename = item.getFilename() || url.split('/').pop() || `download-${downloadId}`;
    const isPersistent = webContents?.session?.isPersistent?.() ?? false;
    const isPrivate = !isPersistent;
    const downloadDir = resolveDownloadDirectory(isPrivate, settings.downloads.defaultPath);

    await fs.mkdir(downloadDir, { recursive: true }).catch(() => {});
    const destinationPath = path.join(downloadDir, filename);
    try {
      item.setSavePath(destinationPath);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Downloads] Failed to set save path. Falling back to default.', error);
      }
    }

    const initialRecord = buildDownloadRecord({
      id: downloadId,
      url,
      filename,
      status: 'downloading',
      createdAt: Date.now(),
      progress: 0,
      receivedBytes: 0,
      totalBytes: item.getTotalBytes(),
      path: destinationPath,
      safety: { status: 'pending' },
    });

    downloadSources.set(downloadId, sourceWin);
    addDownloadRecord(initialRecord);
    emitToWindow(sourceWin, 'downloads:started', initialRecord);
    emitToWindow(sourceWin, 'downloads:progress', initialRecord);

    activeDownloads.set(downloadId, item);
    downloadMetrics.set(downloadId, { bytes: 0, timestamp: Date.now() });

    item.on('updated', () => {
      const now = Date.now();
      const receivedBytes = item.getReceivedBytes();
      const totalBytes = item.getTotalBytes();

      const previous = downloadMetrics.get(downloadId);
      let speedBytesPerSec: number | undefined;
      if (previous) {
        const deltaBytes = receivedBytes - previous.bytes;
        const deltaSeconds = Math.max((now - previous.timestamp) / 1000, 0);
        if (deltaBytes >= 0 && deltaSeconds > 0.05) {
          speedBytesPerSec = deltaBytes / deltaSeconds;
        }
      }
      downloadMetrics.set(downloadId, { bytes: receivedBytes, timestamp: now });

      let etaSeconds: number | undefined;
      if (speedBytesPerSec && speedBytesPerSec > 0 && totalBytes > 0) {
        const remaining = Math.max(totalBytes - receivedBytes, 0);
        etaSeconds = remaining / speedBytesPerSec;
      }

      const updatedRecord = buildDownloadRecord({
        ...initialRecord,
        status: 'downloading',
        progress: totalBytes > 0 ? receivedBytes / totalBytes : undefined,
        receivedBytes,
        totalBytes,
        speedBytesPerSec,
        etaSeconds,
      });
      addDownloadRecord(updatedRecord);
      emitToWindow(sourceWin, 'downloads:progress', updatedRecord);
    });

    item.once('done', async () => {
      const state = item.getState();
      
      // Handle interrupted downloads (retry logic)
      if (state === 'interrupted') {
        const retryCount = downloadRetries.get(downloadId) || 0;
        if (retryCount < MAX_RETRIES) {
          downloadRetries.set(downloadId, retryCount + 1);
          
          // Add to queue for retry
          downloadQueue.push({
            id: downloadId,
            priority: 5, // Medium priority for retries
            timestamp: Date.now(),
          });
          
          // Update record
          const retryRecord = buildDownloadRecord({
            ...initialRecord,
            status: 'downloading',
          });
          addDownloadRecord(retryRecord);
          emitToWindow(sourceWin, 'downloads:progress', {
            ...retryRecord,
            retryAttempt: retryCount + 1,
            maxRetries: MAX_RETRIES,
          });
          
          // Process queue after a short delay
          setTimeout(() => {
            processDownloadQueue();
          }, 2000);
          
          return; // Don't mark as done yet
        }
      }
      
      // Process queue when download completes
      processDownloadQueue();
      
      await handleDownloadDone(downloadId, item, initialRecord, sourceWin, settings.downloads.checksum);
      downloadRetries.delete(downloadId);
    });
    
    // Handle download interruptions
    item.on('updated', () => {
      const state = item.getState();
      if (state === 'interrupted') {
        // Check if we should retry
        const retryCount = downloadRetries.get(downloadId) || 0;
        if (retryCount < MAX_RETRIES) {
          // Will be handled in 'done' event
          return;
        }
      }
    });
  });
  
  // Process queue after adding new download
  setTimeout(() => {
    processDownloadQueue();
  }, 100);
}

/**
 * Get current number of active downloads
 */
function getActiveDownloadCount(): number {
  return Array.from(activeDownloads.values()).filter(item => {
    const state = item.getState();
    return state === 'progressing' || state === 'interrupted';
  }).length;
}

/**
 * Process download queue
 */
function processDownloadQueue() {
  const activeCount = getActiveDownloadCount();
  if (activeCount >= MAX_CONCURRENT_DOWNLOADS) {
    return; // Already at max concurrent downloads
  }

  // Sort queue by priority (higher first), then by timestamp
  downloadQueue.sort((a, b) => {
    if (a.priority !== b.priority) {
      return b.priority - a.priority; // Higher priority first
    }
    return a.timestamp - b.timestamp; // Older first
  });

  // Start next downloads from queue
  const toStart = MAX_CONCURRENT_DOWNLOADS - activeCount;
  for (let i = 0; i < Math.min(toStart, downloadQueue.length); i++) {
    const queued = downloadQueue.shift();
    if (queued) {
      const item = activeDownloads.get(queued.id);
      if (item && item.getState() === 'interrupted') {
        try {
          item.resume();
        } catch (error) {
          console.warn(`[Downloads] Failed to resume queued download ${queued.id}:`, error);
        }
      }
    }
  }
}

export function registerDownloadsIpc() {
  registerDownloadSessionListener();

  registerHandler('downloads:list', z.object({}), async () => listDownloads());

  registerHandler('downloads:openFile', z.object({ path: z.string() }), async (_event, request) => {
    try {
      await shell.openPath(request.path);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  registerHandler('downloads:showInFolder', z.object({ path: z.string() }), async (_event, request) => {
    try {
      shell.showItemInFolder(request.path);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  registerHandler('downloads:pause', z.object({ id: z.string() }), async (_event, request) => {
    const item = activeDownloads.get(request.id);
    if (!item) {
      return { success: false, error: 'Download not found' };
    }
    try {
      if (!item.isPaused()) {
        item.pause();
      }
      const record = buildDownloadRecord({
        id: request.id,
        url: item.getURL(),
        filename: item.getFilename(),
        status: 'paused',
        path: item.getSavePath(),
      });
      addDownloadRecord(record);
      const source = downloadSources.get(request.id) ?? getMainWindow();
      emitToWindow(source, 'downloads:progress', record);
      downloadMetrics.delete(request.id);
      downloadSources.delete(request.id);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  registerHandler('downloads:resume', z.object({ id: z.string() }), async (_event, request) => {
    const item = activeDownloads.get(request.id);
    if (!item) {
      return { success: false, error: 'Download not found' };
    }
    try {
      if (item.isPaused()) {
        // Check if we're at max concurrent downloads
        const activeCount = getActiveDownloadCount();
        if (activeCount >= MAX_CONCURRENT_DOWNLOADS) {
          // Add to queue
          downloadQueue.push({
            id: request.id,
            priority: 10, // High priority for user-initiated resume
            timestamp: Date.now(),
          });
          
          const record = buildDownloadRecord({
            id: request.id,
            url: item.getURL(),
            filename: item.getFilename(),
            status: 'pending',
            path: item.getSavePath(),
          });
          addDownloadRecord(record);
          const source = downloadSources.get(request.id) ?? getMainWindow();
          emitToWindow(source, 'downloads:progress', record);
          return { success: true, queued: true };
        }
        
        item.resume();
      }
      const record = buildDownloadRecord({
        id: request.id,
        url: item.getURL(),
        filename: item.getFilename(),
        status: 'downloading',
        path: item.getSavePath(),
      });
      addDownloadRecord(record);
      const source = downloadSources.get(request.id) ?? getMainWindow();
      emitToWindow(source, 'downloads:progress', record);
      downloadMetrics.set(request.id, { bytes: item.getReceivedBytes(), timestamp: Date.now() });
      processDownloadQueue(); // Process queue after resume
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  registerHandler('downloads:cancel', z.object({ id: z.string() }), async (_event, request) => {
    const item = activeDownloads.get(request.id);
    if (!item) {
      return { success: false, error: 'Download not found' };
    }
    try {
      item.cancel();
      activeDownloads.delete(request.id);
      
      // Remove from queue if present
      const queueIndex = downloadQueue.findIndex(q => q.id === request.id);
      if (queueIndex >= 0) {
        downloadQueue.splice(queueIndex, 1);
      }
      
      const record = buildDownloadRecord({
        id: request.id,
        url: item.getURL(),
        filename: item.getFilename(),
        status: 'cancelled',
        path: item.getSavePath(),
      });
      addDownloadRecord(record);
      const source = downloadSources.get(request.id) ?? getMainWindow();
      emitToWindow(source, 'downloads:done', record);
      downloadMetrics.delete(request.id);
      downloadRetries.delete(request.id);
      downloadSources.delete(request.id);
      
      // Process queue after cancellation
      processDownloadQueue();
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });
  
  registerHandler('downloads:retry', z.object({ id: z.string() }), async (_event, request) => {
    // Retry a failed download
    const downloads = listDownloads();
    const download = downloads.find(d => d.id === request.id);
    if (!download) {
      return { success: false, error: 'Download not found' };
    }
    
    if (download.status !== 'failed' && download.status !== 'cancelled') {
      return { success: false, error: 'Download cannot be retried' };
    }
    
    // Reset retry count
    downloadRetries.delete(request.id);
    
    // Add to queue with high priority
    downloadQueue.push({
      id: request.id,
      priority: 10,
      timestamp: Date.now(),
    });
    
    // Process queue
    processDownloadQueue();
    
    return { success: true, queued: true };
  });
  
  registerHandler('downloads:getQueue', z.object({}), async () => {
    return {
      active: getActiveDownloadCount(),
      queued: downloadQueue.length,
      maxConcurrent: MAX_CONCURRENT_DOWNLOADS,
    };
  });
}
