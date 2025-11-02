import { BrowserWindow, ipcMain } from 'electron';

type RecEvent = { type: 'navigate'|'click'|'type'|'wait'; data: any };

class Recorder {
  private active = false;
  private events: RecEvent[] = [];
  start(win: BrowserWindow) {
    this.active = true;
    this.events = [];
    win.webContents.on('did-navigate', (_e, url) => {
      if (!this.active) return;
      this.events.push({ type: 'navigate', data: { url } });
    });
    // Click/type capture would require injection; leave stub
  }
  stop() { this.active = false; }
  getDsl() {
    return {
      goal: 'Recorded run',
      steps: this.events.map((ev) => {
        if (ev.type === 'navigate') return { skill: 'navigate', args: { url: ev.data.url } };
        return { skill: 'noop', args: ev.data };
      }),
      output: { type: 'json', schema: {} },
    };
  }
}

export const recorder = new Recorder();

export function registerRecorderIpc(win: BrowserWindow) {
  ipcMain.handle('recorder:start', () => { recorder.start(win); return true; });
  ipcMain.handle('recorder:stop', () => { recorder.stop(); return true; });
  ipcMain.handle('recorder:getDsl', () => recorder.getDsl());
}


