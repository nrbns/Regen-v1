import { ipcMain, session, BrowserWindow, shell } from 'electron';
import { addDownloadRecord, listDownloads } from './storage';
import { registerHandler } from '../shared/ipc/router';
import { z } from 'zod';
import path from 'node:path';

export function registerDownloadsIpc() {
  // Typed IPC handler for listing downloads
  registerHandler('downloads:list', z.object({}), async () => {
    return listDownloads();
  });

  // Open file in system default application
  registerHandler('downloads:openFile', z.object({ path: z.string() }), async (_event, request) => {
    try {
      await shell.openPath(request.path);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // Show file in folder (file explorer/finder)
  registerHandler('downloads:showInFolder', z.object({ path: z.string() }), async (_event, request) => {
    try {
      shell.showItemInFolder(request.path);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // Legacy handler for backwards compatibility
  ipcMain.handle('downloads:list', () => listDownloads());

  const sess = session.defaultSession;
  sess.on('will-download', (_e, item, webContents) => {
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
    
    item.on('updated', (_ev, state) => {
      const received = item.getReceivedBytes();
      const total = item.getTotalBytes();
      const progress = total > 0 ? received / total : 0;
      
      // Update the download record in storage
      addDownloadRecord({
        ...downloadRecord,
        status: state === 'interrupted' ? 'failed' : 'downloading',
        progress,
        receivedBytes: received,
        totalBytes: total,
      });
      
      // Emit progress event
      const win = BrowserWindow.fromWebContents(webContents) || BrowserWindow.getAllWindows()[0];
      if (win) {
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
    
    item.once('done', (_ev, state) => {
      const path = item.getSavePath();
      const finalStatus = state === 'completed' ? 'completed' : state === 'cancelled' ? 'cancelled' : 'failed';
      
      // Update the final download record
      const win = BrowserWindow.fromWebContents(webContents) || BrowserWindow.getAllWindows()[0];
      if (win) {
        win.webContents.send('downloads:done', {
          id,
          url,
          filename: downloadRecord.filename,
          status: finalStatus,
          path,
          createdAt: downloadRecord.createdAt,
        });
      }
      
      // Update storage
      addDownloadRecord({ 
        id, 
        url, 
        filename: downloadRecord.filename,
        status: finalStatus,
        path,
        createdAt: downloadRecord.createdAt,
      });
    });
  });
}


