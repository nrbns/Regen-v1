/**
 * Secure Keychain Storage for API Keys
 * Uses Electron's safeStorage API (OS keychain) for secure credential storage
 */

import { safeStorage } from 'electron';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { app } from 'electron';

const KEYCHAIN_FILE = path.join(app.getPath('userData'), 'cursor-keychain.enc');

interface StoredKey {
  service: string;
  key: string;
  encrypted: boolean;
  createdAt: number;
  lastUsed?: number;
}

class KeychainService {
  private cache: Map<string, string> = new Map();
  private isAvailable: boolean;

  constructor() {
    // Check if safeStorage is available (requires user to have logged in)
    this.isAvailable = safeStorage.isEncryptionAvailable();
    if (!this.isAvailable) {
      console.warn(
        '[Keychain] safeStorage not available - keys will be stored in plaintext (not recommended)'
      );
    }
  }

  /**
   * Store an API key securely
   */
  async store(service: string, key: string): Promise<void> {
    try {
      let encryptedKey: string;
      if (this.isAvailable) {
        // Encrypt using OS keychain
        encryptedKey = safeStorage.encryptString(key).toString('base64');
      } else {
        // Fallback: base64 encode (not secure, but better than plaintext)
        encryptedKey = Buffer.from(key, 'utf-8').toString('base64');
      }

      const stored: StoredKey = {
        service,
        key: encryptedKey,
        encrypted: this.isAvailable,
        createdAt: Date.now(),
      };

      // Load existing keys
      const allKeys = await this.loadAll();
      allKeys[service] = stored;

      // Write to encrypted file
      const content = JSON.stringify(allKeys, null, 2);
      await fs.writeFile(KEYCHAIN_FILE, content, 'utf-8');

      // Update cache
      this.cache.set(service, key);
    } catch (error) {
      console.error('[Keychain] Failed to store key', error);
      throw new Error(`Failed to store key for ${service}`);
    }
  }

  /**
   * Retrieve an API key
   */
  async retrieve(service: string): Promise<string | null> {
    // Check cache first
    if (this.cache.has(service)) {
      return this.cache.get(service)!;
    }

    try {
      const allKeys = await this.loadAll();
      const stored = allKeys[service];
      if (!stored) {
        return null;
      }

      let decryptedKey: string;
      if (stored.encrypted && this.isAvailable) {
        // Decrypt using OS keychain
        const buffer = Buffer.from(stored.key, 'base64');
        decryptedKey = safeStorage.decryptString(buffer);
      } else {
        // Fallback: base64 decode
        decryptedKey = Buffer.from(stored.key, 'base64').toString('utf-8');
      }

      // Update last used timestamp
      stored.lastUsed = Date.now();
      await this.saveAll(allKeys);

      // Cache for faster access
      this.cache.set(service, decryptedKey);
      return decryptedKey;
    } catch (error) {
      console.error('[Keychain] Failed to retrieve key', error);
      return null;
    }
  }

  /**
   * Delete an API key
   */
  async delete(service: string): Promise<void> {
    const allKeys = await this.loadAll();
    delete allKeys[service];
    await this.saveAll(allKeys);
    this.cache.delete(service);
  }

  /**
   * List all stored services
   */
  async listServices(): Promise<string[]> {
    const allKeys = await this.loadAll();
    return Object.keys(allKeys);
  }

  /**
   * Check if a service has a stored key
   */
  async has(service: string): Promise<boolean> {
    const allKeys = await this.loadAll();
    return service in allKeys;
  }

  private async loadAll(): Promise<Record<string, StoredKey>> {
    try {
      const content = await fs.readFile(KEYCHAIN_FILE, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return {};
      }
      console.error('[Keychain] Failed to load keys', error);
      return {};
    }
  }

  private async saveAll(keys: Record<string, StoredKey>): Promise<void> {
    try {
      const content = JSON.stringify(keys, null, 2);
      await fs.writeFile(KEYCHAIN_FILE, content, 'utf-8');
    } catch (error) {
      console.error('[Keychain] Failed to save keys', error);
      throw error;
    }
  }

  /**
   * Clear cache (useful for testing or security)
   */
  clearCache(): void {
    this.cache.clear();
  }
}

export const keychain = new KeychainService();
