import { registry } from './registry';
// @ts-ignore - better-sqlite3 is optional
let Database: any;
try {
  Database = require('better-sqlite3').default || require('better-sqlite3');
} catch {
  // better-sqlite3 not available
}
import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';

registry.register('export_sqlite', async (ctx, args: { headers?: string[]; rows?: string[][]; from?: 'last'; table?: string; filename?: string }) => {
  if (!Database) {
    throw new Error('better-sqlite3 not available');
  }
  const dir = path.join(app.getPath('userData'), 'exports');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, args.filename || `export_${Date.now()}.sqlite`);
  const table = (args.table || 'items').replace(/[^a-zA-Z0-9_]/g, '_');
  const db = new Database(file);
  let headers = args.headers || [];
  let rows = args.rows || [];
  if (args.from === 'last' && (ctx.memory as any)?.last) {
    const last = (ctx.memory as any).last;
    headers = headers.length ? headers : (last.headers || []);
    rows = rows.length ? rows : (last.rows || []);
  }
  const cols = (headers && headers.length ? headers : rows[0]?.map((_,i)=>`c${i+1}`) || []).map(h => (h || '').replace(/[^a-zA-Z0-9_]/g, '_'));
  db.prepare(`CREATE TABLE IF NOT EXISTS ${table} (${cols.map(c=>`"${c}" TEXT`).join(',')})`).run();
  const placeholders = cols.map(()=> '?').join(',');
  const insert = db.prepare(`INSERT INTO ${table} (${cols.map(c=>`"${c}"`).join(',')}) VALUES (${placeholders})`);
  const tx = db.transaction((rs: string[][])=>{ for (const r of rs) insert.run(...r); });
  tx(rows || []);
  db.close();
  return { ok: true, path: file, table };
});


