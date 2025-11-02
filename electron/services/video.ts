import { ipcMain, BrowserWindow } from 'electron';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { addDownloadRecord } from './storage';

let consent = false;

export function registerVideoIpc(_win: BrowserWindow) {
  ipcMain.handle('video:consent:get', () => consent);
  ipcMain.handle('video:consent:set', (_e, v: boolean) => { consent = v; return consent; });

  ipcMain.handle('video:start', (e, args: { url: string; format?: string; outDir?: string }) => {
    if (!consent) return { ok: false, error: 'Consent required' };
    const win = BrowserWindow.fromWebContents(e.sender);
    const url = args?.url;
    if (!url) return { ok: false, error: 'Missing URL' };
    const outDir = args?.outDir || process.cwd();
    const id = Math.random().toString(36).slice(2);
      addDownloadRecord({ id, url, status: 'in-progress', createdAt: Date.now() });
    const save = path.join(outDir, `%(title)s.%(ext)s`);
    const proc = spawn('yt-dlp', ['-o', save, url], { shell: true });
    proc.stdout.on('data', (d) => { win?.webContents.send('video:progress', String(d)); });
    proc.stderr.on('data', (d) => { win?.webContents.send('video:progress', String(d)); });
    proc.on('close', (code) => {
      addDownloadRecord({ id, url, status: code === 0 ? 'completed' : 'failed', createdAt: Date.now() });
      win?.webContents.send('downloads:updated');
    });
    return { ok: true, id };
  });

  ipcMain.handle('video:cancel', () => true);
}


