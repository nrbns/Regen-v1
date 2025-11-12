import { app, BrowserWindow } from 'electron';
import { randomBytes, createCipheriv, createDecipheriv, pbkdf2Sync, createHmac, timingSafeEqual } from 'crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

interface VaultCredential {
  id: string;
  domain: string;
  username: string;
  secret: string;
  secretHint?: string | null;
  createdAt: number;
  updatedAt: number;
  lastUsedAt?: number | null;
  tags?: string[];
}

interface VaultState {
  entries: VaultCredential[];
  lastUpdatedAt: number | null;
}

interface VaultFile {
  version: number;
  salt: string;
  verification: string;
  iv: string;
  tag: string;
  payload: string;
}

const VAULT_VERSION = 1;
const VERIFICATION_CONTEXT = 'omnibrowser-identity-vault';

let activeKey: Buffer | null = null;
let vaultState: VaultState = {
  entries: [],
  lastUpdatedAt: null,
};
let vaultSalt: Buffer | null = null;
let vaultVerification: Buffer | null = null;

function vaultPath(): string {
  return path.join(app.getPath('userData'), 'identity-vault.bin');
}

function deriveKey(passphrase: string, salt: Buffer): Buffer {
  return pbkdf2Sync(passphrase, salt, 160_000, 32, 'sha512');
}

function computeVerification(key: Buffer): Buffer {
  return createHmac('sha256', key).update(VERIFICATION_CONTEXT).digest();
}

function toPublicCredential(entry: VaultCredential): Omit<VaultCredential, 'secret'> {
  const { secret: _secret, ...rest } = entry;
  return rest;
}

function serializeVault(): Buffer {
  const payload = JSON.stringify(vaultState);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', activeKey!, iv);
  const encrypted = Buffer.concat([cipher.update(payload, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.from(
    JSON.stringify({
      version: VAULT_VERSION,
      salt: '',
      verification: '',
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
      payload: encrypted.toString('base64'),
    }),
    'utf8',
  );
}

async function persistVault(): Promise<void> {
  if (!activeKey || !vaultSalt || !vaultVerification) return;
  const dir = path.dirname(vaultPath());
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {
    // ignore
  }
  const serialized = serializeVault();
  const json = JSON.parse(serialized.toString('utf8')) as VaultFile;
  json.salt = vaultSalt.toString('base64');
  json.verification = vaultVerification.toString('base64');
  await fs.writeFile(vaultPath(), JSON.stringify(json), 'utf8');
}

async function loadVaultFile(): Promise<VaultFile | null> {
  try {
    const content = await fs.readFile(vaultPath(), 'utf8');
    return JSON.parse(content) as VaultFile;
  } catch {
    return null;
  }
}

function decryptVault(file: VaultFile, key: Buffer): VaultState {
  const iv = Buffer.from(file.iv, 'base64');
  const payload = Buffer.from(file.payload, 'base64');
  const tag = Buffer.from(file.tag, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(payload), decipher.final()]);
  return JSON.parse(decrypted.toString('utf8')) as VaultState;
}

export async function getVaultStatus(): Promise<{ status: 'locked' | 'uninitialized' | 'unlocked'; totalCredentials: number; lastUpdatedAt: number | null }> {
  const exists = await loadVaultFile();
  if (!exists && !activeKey) {
    return { status: 'uninitialized', totalCredentials: 0, lastUpdatedAt: null };
  }
  if (!activeKey) {
    return { status: 'locked', totalCredentials: 0, lastUpdatedAt: null };
  }
  return {
    status: 'unlocked',
    totalCredentials: vaultState.entries.length,
    lastUpdatedAt: vaultState.lastUpdatedAt ?? null,
  };
}

export async function unlockVault(passphrase: string): Promise<void> {
  const file = await loadVaultFile();
  let salt: Buffer;
  if (!file) {
    salt = randomBytes(32);
    const key = deriveKey(passphrase, salt);
    const verification = computeVerification(key);
    activeKey = key;
    vaultState = { entries: [], lastUpdatedAt: null };
    vaultSalt = salt;
    vaultVerification = verification;
    await persistVault();
    return;
  }

  salt = Buffer.from(file.salt, 'base64');
  const key = deriveKey(passphrase, salt);
  const expectedVerification = computeVerification(key);
  const storedVerification = Buffer.from(file.verification, 'base64');
  if (!timingSafeEqual(expectedVerification, storedVerification)) {
    throw new Error('Invalid passphrase for identity vault');
  }
  const state = decryptVault(file, key);
  activeKey = key;
  vaultState = state;
  vaultSalt = salt;
  vaultVerification = storedVerification;
}

export function lockVault(): void {
  activeKey = null;
  vaultState = {
    entries: [],
    lastUpdatedAt: null,
  };
  vaultSalt = null;
  vaultVerification = null;
}

export async function listCredentials(): Promise<Array<Omit<VaultCredential, 'secret'>>> {
  if (!activeKey) {
    throw new Error('Identity vault locked');
  }
  return vaultState.entries.map(toPublicCredential);
}

export async function addCredential(payload: Omit<VaultCredential, 'id' | 'createdAt' | 'updatedAt'>): Promise<Omit<VaultCredential, 'secret'>> {
  if (!activeKey) throw new Error('Identity vault locked');
  const id = `cred_${Date.now()}_${randomBytes(4).toString('hex')}`;
  const now = Date.now();
  const record: VaultCredential = {
    ...payload,
    id,
    createdAt: now,
    updatedAt: now,
  };
  vaultState.entries.push(record);
  vaultState.lastUpdatedAt = now;
  vaultSalt = vaultSalt ?? randomBytes(32);
  vaultVerification = computeVerification(activeKey);
  await persistVault();
  return toPublicCredential(record);
}

export async function removeCredential(id: string): Promise<void> {
  if (!activeKey) throw new Error('Identity vault locked');
  const idx = vaultState.entries.findIndex((entry) => entry.id === id);
  if (idx === -1) return;
  vaultState.entries.splice(idx, 1);
  vaultState.lastUpdatedAt = Date.now();
  vaultSalt = vaultSalt ?? randomBytes(32);
  vaultVerification = computeVerification(activeKey);
  await persistVault();
}

export async function revealCredential(id: string): Promise<{ id: string; secret: string }> {
  if (!activeKey) throw new Error('Identity vault locked');
  const entry = vaultState.entries.find((item) => item.id === id);
  if (!entry) {
    throw new Error('Credential not found');
  }
  entry.lastUsedAt = Date.now();
  vaultState.lastUpdatedAt = Date.now();
  vaultSalt = vaultSalt ?? randomBytes(32);
  vaultVerification = computeVerification(activeKey);
  await persistVault();
  return { id: entry.id, secret: entry.secret };
}

export function broadcastIdentityEvent(channel: string, data: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (win.isDestroyed()) continue;
    try {
      win.webContents.send(channel, data);
    } catch {
      // ignore
    }
  }
}

