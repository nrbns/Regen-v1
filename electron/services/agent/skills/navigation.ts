import { registry } from './registry';
import { BrowserWindow } from 'electron';

registry.register('navigate', async (_ctx, args: { url: string }) => {
  const win = BrowserWindow.getAllWindows()[0];
  if (!win) throw new Error('No window');
  // naive: ask tabs service to navigate active
  win.webContents.send('agent:hint', { action: 'navigate', url: args.url });
  return { ok: true, url: args.url };
});


