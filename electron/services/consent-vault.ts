import { createHash, randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import { ConsentRecord } from './consent-ledger';
import { createLogger } from './utils/logger';

const logger = createLogger('consent-vault');

export interface VaultEntry {
  consentId: string;
  actionType: ConsentRecord['action']['type'];
  approved: boolean;
  timestamp: number;
  signature: string;
  chainHash: string;
  metadata: Record<string, unknown>;
}

export interface VaultSnapshot {
  entries: VaultEntry[];
  anchor: string;
  updatedAt: number;
}

const chain: VaultEntry[] = [];

function hashPayload(payload: unknown): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function buildChainHash(entry: Omit<VaultEntry, 'chainHash'>): string {
  const previous = chain.length ? chain[chain.length - 1].chainHash : 'GENESIS';
  const payload = { previous, entry };
  return hashPayload(payload);
}

export async function appendToVault(record: ConsentRecord): Promise<VaultEntry> {
  const metadata = {
    risk: record.action.risk,
    target: record.action.target || null,
    revokedAt: record.revokedAt ?? null,
  };

  const entryBase: Omit<VaultEntry, 'chainHash'> = {
    consentId: record.id,
    actionType: record.action.type,
    approved: record.approved,
    timestamp: record.timestamp,
    signature: record.signature,
    metadata,
  };

  const chainHash = buildChainHash(entryBase);
  const entry: VaultEntry = { ...entryBase, chainHash };
  chain.push(entry);

  try {
    await persistVault();
  } catch (error) {
    logger.warn('Failed to persist vault', { error: error instanceof Error ? error.message : String(error) });
  }

  return entry;
}

export function getVaultEntries(): VaultEntry[] {
  return [...chain];
}

export function computeAnchor(): string {
  if (!chain.length) {
    return hashPayload('GENESIS');
  }
  return chain[chain.length - 1].chainHash;
}

export async function exportVaultSnapshot(): Promise<VaultSnapshot> {
  return {
    entries: getVaultEntries(),
    anchor: computeAnchor(),
    updatedAt: Date.now(),
  };
}

export async function persistVault(): Promise<void> {
  if (!app?.isReady?.()) return;
  try {
    const dir = path.join(app.getPath('userData'), 'consent-vault');
    await fs.mkdir(dir, { recursive: true });
    const filePath = path.join(dir, 'vault.json');
    const snapshot = await exportVaultSnapshot();
    await fs.writeFile(filePath, JSON.stringify(snapshot, null, 2), 'utf-8');
  } catch (error) {
    logger.warn('Consent vault persistence failed', { error: error instanceof Error ? error.message : String(error) });
  }
}

export async function loadVault(): Promise<void> {
  if (!app?.isReady?.()) return;
  try {
    const filePath = path.join(app.getPath('userData'), 'consent-vault', 'vault.json');
    const content = await fs.readFile(filePath, 'utf-8');
    const snapshot = JSON.parse(content) as VaultSnapshot;
    chain.splice(0, chain.length, ...snapshot.entries);
  } catch (error) {
    // Vault not initialized yet or corrupted; start fresh
    logger.info('Consent vault initialized (new chain)');
  }
}

export function generateVaultReceipt(entry: VaultEntry): { receiptId: string; proof: string } {
  const receiptId = randomUUID();
  const proof = hashPayload({ receiptId, chainHash: entry.chainHash });
  return { receiptId, proof };
}
