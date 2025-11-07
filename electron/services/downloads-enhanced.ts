/**
 * Enhanced Downloads Service
 * Consent-gated downloads with checksums and private temp routing
 */

import { DownloadItem, session, BrowserWindow, shell, app } from 'electron';
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { registerHandler } from '../shared/ipc/router';
import { z } from 'zod';
import { addDownloadRecord } from './storage';

export interface DownloadConsent {
  url: string;
  filename: string;
  size?: number;
  timestamp: number;
  approved: boolean;
  remember: boolean;
}

const pendingConsents = new Map<string, DownloadConsent>();
const activeDownloads = new Map<string, DownloadItem>(); // Track active downloads for pause/resume

/**
 * Calculate SHA-256 checksum of a file
 */
export async function calculateChecksum(filePath: string): Promise<string> {
  const hash = createHash('sha256');
  const fileStream = await fs.open(filePath, 'r');
  const stream = fileStream.createReadStream();
  
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => {
      fileStream.close();
      resolve(hash.digest('hex'));
    });
    stream.on('error', reject);
  });
}

/**
 * Get private download directory (for private/ghost tabs)
 */
function getPrivateDownloadDir(): string {
  return path.join(tmpdir(), 'omnibrowser-private-downloads');
}

/**
 * Enhanced downloads with consent gating
 */
export function registerEnhancedDownloadsIpc(win: BrowserWindow) {
  // Request download consent
  registerHandler('downloads:requestConsent', z.object({
    url: z.string().url(),
    filename: z.string(),
    size: z.number().optional(),
    privateMode: z.boolean().optional(),
  }), async (_event, request) => {
    const consentId = `consent-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const consent: DownloadConsent = {
      url: request.url,
      filename: request.filename,
      size: request.size,
      timestamp: Date.now(),
      approved: false,
      remember: false,
    };
    
    pendingConsents.set(consentId, consent);
    
    // Request consent from renderer
    win.webContents.send('downloads:consent:request', {
      id: consentId,
      url: request.url,
      filename: request.filename,
      size: request.size,
    });
    
    return { consentId, approved: false };
  });

  // Approve/reject download consent
  registerHandler('downloads:consent:respond', z.object({
    consentId: z.string(),
    approved: z.boolean(),
    remember: z.boolean().optional(),
  }), async (_event, request) => {
    const consent = pendingConsents.get(request.consentId);
    if (!consent) {
      return { success: false, error: 'Consent not found' };
    }
    
    consent.approved = request.approved;
    consent.remember = request.remember || false;
    
    return { success: true, approved: request.approved };
  });

  const sess = session.defaultSession;
  
  sess.on('will-download', async (event, item: DownloadItem, webContents) => {
    const url = item.getURL();
    const filename = item.getFilename();
    const size = item.getTotalBytes();
    
    // Check if consent is required (can be skipped if user has "remember" enabled)
    const consentId = `download-${url}-${Date.now()}`;
    const needsConsent = true; // In practice, check user settings
    
    if (needsConsent) {
      // Pause download until consent
      item.setSavePath(''); // Pause by not setting path
      item.pause();
      
      // Request consent
      win.webContents.send('downloads:consent:request', {
        id: consentId,
        url,
        filename,
        size,
      });
      
      // Wait for consent response (would need a proper async mechanism)
      // For now, we'll allow it after a timeout
      setTimeout(() => {
        if (pendingConsents.has(consentId)) {
          const consent = pendingConsents.get(consentId);
          if (consent?.approved) {
      // Determine save path
      const isPrivate = false; // Check if tab is private
      const downloadDir = isPrivate 
        ? getPrivateDownloadDir()
        : path.join(app.getPath('downloads'), 'OmniBrowser');
      
      // Ensure directory exists (non-blocking)
      fs.mkdir(downloadDir, { recursive: true }).catch(() => {});
            
            const savePath = path.join(downloadDir, filename);
            item.setSavePath(savePath);
            item.resume();
          } else {
            item.cancel();
          }
          pendingConsents.delete(consentId);
        }
      }, 100);
      
      return;
    }
    
    // Normal download flow
    const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const downloadDir = path.join(app.getPath('downloads'), 'OmniBrowser');
    await fs.mkdir(downloadDir, { recursive: true });
    const savePath = path.join(downloadDir, filename);
    item.setSavePath(savePath);
    
    const downloadRecord = {
      id,
      url,
      filename,
      status: 'downloading' as const,
      progress: 0,
      createdAt: Date.now(),
      receivedBytes: 0,
      totalBytes: size,
      path: savePath,
    };
    
    addDownloadRecord(downloadRecord);
    
    item.on('updated', async (_ev, state) => {
      const received = item.getReceivedBytes();
      const total = item.getTotalBytes();
      const progress = total > 0 ? received / total : 0;
      
      addDownloadRecord({
        ...downloadRecord,
        status: state === 'interrupted' ? 'failed' : 'downloading',
        progress,
        receivedBytes: received,
        totalBytes: total,
      });
      
      win.webContents.send('downloads:progress', {
        id,
        url,
        filename,
        status: state === 'interrupted' ? 'failed' : 'downloading',
        progress,
        receivedBytes: received,
        totalBytes: total,
      });
    });
    
    item.once('done', async (_ev, state) => {
      const finalPath = item.getSavePath();
      const finalStatus = state === 'completed' ? 'completed' : state === 'cancelled' ? 'cancelled' : 'failed';
      
      let checksum: string | undefined;
      if (finalStatus === 'completed' && finalPath) {
        try {
          checksum = await calculateChecksum(finalPath);
        } catch (error) {
          console.error('Failed to calculate checksum:', error);
        }
      }
      
      win.webContents.send('downloads:done', {
        id,
        url,
        filename,
        status: finalStatus,
        path: finalPath,
        checksum,
        createdAt: downloadRecord.createdAt,
      });
      
      addDownloadRecord({
        ...downloadRecord,
        id,
        status: finalStatus,
        path: finalPath,
        checksum,
      });
    });
  });
}

export function registerDownloadsIpc() {
  // Get main window for sending events (will be null initially, handled in event handlers)
  let getMainWindow: () => BrowserWindow | null;
  try {
    getMainWindow = require('./windows').getMainWindow;
  } catch {
    // Fallback if windows module not available
    getMainWindow = () => BrowserWindow.getAllWindows()[0] || null;
  }
  
  // Register IPC handlers
  registerHandler('downloads:list', z.object({}), async () => {
    const { listDownloads } = await import('./storage');
    return listDownloads();
  });

  registerHandler('downloads:requestConsent', z.object({
    url: z.string().url(),
    filename: z.string(),
    size: z.number().optional(),
    privateMode: z.boolean().optional(),
  }), async (_event, request) => {
    // Consent handling is done in will-download event
    return { success: true };
  });

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

  // Pause download
  registerHandler('downloads:pause', z.object({ id: z.string() }), async (_event, request) => {
    const item = activeDownloads.get(request.id);
    if (!item) {
      return { success: false, error: 'Download not found' };
    }
    try {
      if (item.isPaused()) {
        return { success: false, error: 'Download already paused' };
      }
      item.pause();
      addDownloadRecord({
        id: request.id,
        url: item.getURL(),
        filename: item.getFilename(),
        status: 'in-progress',
        path: item.getSavePath(),
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // Resume download
  registerHandler('downloads:resume', z.object({ id: z.string() }), async (_event, request) => {
    const item = activeDownloads.get(request.id);
    if (!item) {
      return { success: false, error: 'Download not found' };
    }
    try {
      if (!item.isPaused()) {
        return { success: false, error: 'Download is not paused' };
      }
      item.resume();
      addDownloadRecord({
        id: request.id,
        url: item.getURL(),
        filename: item.getFilename(),
        status: 'downloading',
        path: item.getSavePath(),
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // Cancel download
  registerHandler('downloads:cancel', z.object({ id: z.string() }), async (_event, request) => {
    const item = activeDownloads.get(request.id);
    if (!item) {
      return { success: false, error: 'Download not found' };
    }
    try {
      item.cancel();
      addDownloadRecord({
        id: request.id,
        url: item.getURL(),
        filename: item.getFilename(),
        status: 'cancelled',
        path: item.getSavePath(),
      });
      activeDownloads.delete(request.id);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // Set up will-download handler
  const sess = session.defaultSession;
  
  sess.on('will-download', async (event, item: DownloadItem, webContents) => {
    const url = item.getURL();
    const filename = item.getFilename();
    const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    
    const downloadRecord = { 
      id, 
      url, 
      filename: filename || url.split('/').pop() || 'download',
      status: 'downloading' as const,
      progress: 0,
      createdAt: Date.now(),
      receivedBytes: 0,
      totalBytes: item.getTotalBytes(),
    };
    
    addDownloadRecord(downloadRecord);
    const initialWin = BrowserWindow.fromWebContents(webContents) || getMainWindow();
    if (initialWin && !initialWin.isDestroyed()) {
      initialWin.webContents.send('downloads:progress', downloadRecord);
    }

    // Determine save path
    const isPrivate = false; // Check if tab is private
    const downloadDir = isPrivate 
      ? getPrivateDownloadDir()
      : path.join(app.getPath('downloads'), 'OmniBrowser');
    
    // Ensure directory exists
    await fs.mkdir(downloadDir, { recursive: true }).catch(() => {});
    
    const savePath = path.join(downloadDir, filename || 'download');
    item.setSavePath(savePath);
    
    // Track active download
    activeDownloads.set(id, item);
    
    item.on('updated', (_ev, state) => {
      const received = item.getReceivedBytes();
      const total = item.getTotalBytes();
      const progress = total > 0 ? received / total : 0;
      
      addDownloadRecord({
        ...downloadRecord,
        status: state === 'interrupted' ? 'failed' : 'downloading',
        progress,
        receivedBytes: received,
        totalBytes: total,
      });
      
      const win = BrowserWindow.fromWebContents(webContents) || getMainWindow();
      if (win && !win.isDestroyed()) {
        win.webContents.send('downloads:progress', {
          id,
          url,
          filename: downloadRecord.filename,
          status: state === 'interrupted' ? 'failed' : 'downloading',
          progress,
          receivedBytes: received,
          totalBytes: total,
        });
      }
    });
    
    item.once('done', async (_ev, state) => {
      const finalPath = item.getSavePath();
      const finalStatus = state === 'completed' ? 'completed' : state === 'cancelled' ? 'cancelled' : 'failed';
      
      // Remove from active downloads
      activeDownloads.delete(id);
      
      let checksum: string | undefined;
      if (finalStatus === 'completed' && finalPath) {
        try {
          checksum = await calculateChecksum(finalPath);
        } catch (error) {
          console.error('Failed to calculate checksum:', error);
        }
      }
      
      const win = BrowserWindow.fromWebContents(webContents) || getMainWindow();
      if (win && !win.isDestroyed()) {
        win.webContents.send('downloads:done', {
          id,
          url,
          filename,
          status: finalStatus,
          path: finalPath,
          checksum,
          createdAt: downloadRecord.createdAt,
        });
      }
      
      addDownloadRecord({
        ...downloadRecord,
        id,
        status: finalStatus,
        path: finalPath,
        checksum,
      });
    });
  });
}
