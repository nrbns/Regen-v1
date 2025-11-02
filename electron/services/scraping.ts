import { ipcMain, app } from 'electron';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';

type Task = { id: string; url: string };
const tasks = new Map<string, Task>();

export function registerScrapingIpc() {
  ipcMain.handle('scrape:enqueue', (_e, t: { url: string }) => {
    const id = randomUUID();
    tasks.set(id, { id, url: t.url });
    const file = path.join(app.getPath('userData'), 'tmp');
    fs.mkdirSync(file, { recursive: true });
    const img = path.join(file, `${id}.png`);
    fs.writeFileSync(img, Buffer.alloc(0));
    return { id, html: '<html></html>', text: '', screenshotPath: img, warning: 'Playwright not installed; returning mock.' };
  });
  ipcMain.handle('scrape:get', (_e, id: string) => {
    return tasks.get(id) ?? null;
  });
}


