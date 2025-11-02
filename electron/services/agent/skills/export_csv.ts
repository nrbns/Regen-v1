import { registry } from './registry';
import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';

function toCsv(headers: string[], rows: string[][]) {
  const esc = (s: string) => '"' + (s ?? '').replace(/"/g,'""') + '"';
  const out = [] as string[];
  if (headers.length) out.push(headers.map(esc).join(','));
  for (const r of rows) out.push(r.map(esc).join(','));
  return out.join('\n');
}

registry.register('export_csv', async (ctx, args: { headers?: string[]; rows?: string[][]; from?: 'last'; filename?: string }) => {
  let headers = args.headers || [];
  let rows = args.rows || [];
  if (args.from === 'last' && (ctx.memory as any)?.last) {
    const last = (ctx.memory as any).last;
    headers = headers.length ? headers : (last.headers || []);
    rows = rows.length ? rows : (last.rows || []);
  }
  const dir = path.join(app.getPath('userData'), 'exports');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, args.filename || `export_${Date.now()}.csv`);
  fs.writeFileSync(file, toCsv(headers, rows), 'utf8');
  return { ok: true, path: file };
});


