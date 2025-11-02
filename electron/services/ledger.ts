import { ipcMain } from 'electron';
import crypto from 'node:crypto';

type Block = { id: number; parent_hash: string; doc_url: string; passage: string; passage_hash: string; ts: number };
const chain: Block[] = [];

function sha256Hex(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export function registerLedgerIpc() {
  ipcMain.handle('ledger:add', (_e, { url, passage }: { url: string; passage: string }) => {
    const parent = chain.at(-1)?.passage_hash || 'GENESIS';
    const ts = Date.now();
    const passage_hash = sha256Hex(parent + passage + String(ts));
    chain.push({ id: chain.length + 1, parent_hash: parent, doc_url: url, passage, passage_hash, ts });
    return { id: chain.length, passage_hash };
  });

  ipcMain.handle('ledger:list', () => chain);

  ipcMain.handle('ledger:verify', () => {
    let prev = 'GENESIS';
    for (const b of chain) {
      const expect = sha256Hex(prev + b.passage + String(b.ts));
      if (expect !== b.passage_hash) return { ok: false, badId: b.id };
      prev = b.passage_hash;
    }
    return { ok: true };
  });
}


