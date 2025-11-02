import { ipcMain } from 'electron';
import crypto from 'node:crypto';
import { fetch } from 'undici';

export function registerThreatsIpc() {
  ipcMain.handle('threats:scanUrl', async (_e, url: string) => {
    const issues: string[] = [];
    try {
      const u = new URL(url);
      if (u.protocol === 'http:') issues.push('Insecure scheme');
      const res = await fetch(url, { redirect: 'manual' }).catch(()=> null as any);
      if (res) {
        const loc = res.headers.get('location');
        if (res.status >= 300 && res.status < 400 && loc) issues.push('Redirect present');
        const csp = res.headers.get('content-security-policy');
        if (!csp) issues.push('Missing CSP header');
      }
    } catch { issues.push('Malformed URL'); }
    const score = issues.length;
    return { url, score, issues };
  });
  ipcMain.handle('threats:scanFile', (_e, filePath: string) => {
    const hash = crypto.createHash('sha256').update(filePath).digest('hex');
    const reputation: Record<string, string> = {};
    const label = reputation[hash];
    const findings = label ? [{ hash, label }] : [];
    return { ok: true, findings };
  });
}


