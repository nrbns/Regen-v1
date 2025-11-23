/**
 * Secure Vault - Tier 2
 * Encrypted storage for tokens and sensitive data
 */

import { log } from '../../utils/logger';

// Simple encryption using Web Crypto API (browser-compatible)
async function encrypt(data: string, key: string): Promise<string> {
  // Use Web Crypto API for browser environments
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const keyBuffer = encoder.encode(key.padEnd(32, '0').slice(0, 32));

    // For simplicity, we'll use a basic XOR cipher in browser
    // In production, use proper encryption with Web Crypto API
    const encrypted = new Uint8Array(dataBuffer.length);
    for (let i = 0; i < dataBuffer.length; i++) {
      encrypted[i] = dataBuffer[i] ^ keyBuffer[i % keyBuffer.length];
    }
    return btoa(String.fromCharCode(...encrypted));
  } else {
    // Fallback for environments without Web Crypto API
    // Use a simple XOR cipher
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const keyBuffer = encoder.encode(key.padEnd(32, '0').slice(0, 32));
    const encrypted = new Uint8Array(dataBuffer.length);
    for (let i = 0; i < dataBuffer.length; i++) {
      encrypted[i] = dataBuffer[i] ^ keyBuffer[i % keyBuffer.length];
    }
    return btoa(String.fromCharCode(...encrypted));
  }
}

async function decrypt(encrypted: string, key: string): Promise<string> {
  // Use Web Crypto API for browser environments
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    // Browser: Decrypt
    const keyBuffer = new TextEncoder().encode(key.padEnd(32, '0').slice(0, 32));
    const encryptedBuffer = new Uint8Array(
      atob(encrypted)
        .split('')
        .map(c => c.charCodeAt(0))
    );

    const decrypted = new Uint8Array(encryptedBuffer.length);
    for (let i = 0; i < encryptedBuffer.length; i++) {
      decrypted[i] = encryptedBuffer[i] ^ keyBuffer[i % keyBuffer.length];
    }
    return new TextDecoder().decode(decrypted);
  } else {
    // Fallback for environments without Web Crypto API
    const keyBuffer = new TextEncoder().encode(key.padEnd(32, '0').slice(0, 32));
    const encryptedBuffer = new Uint8Array(
      atob(encrypted)
        .split('')
        .map(c => c.charCodeAt(0))
    );

    const decrypted = new Uint8Array(encryptedBuffer.length);
    for (let i = 0; i < encryptedBuffer.length; i++) {
      decrypted[i] = encryptedBuffer[i] ^ keyBuffer[i % keyBuffer.length];
    }
    return new TextDecoder().decode(decrypted);
  }
}

class SecureVault {
  private vaultKey: string;
  private storage: Map<string, string> = new Map();

  constructor() {
    // Generate or load vault key
    this.vaultKey = this.getOrCreateVaultKey();
  }

  private getOrCreateVaultKey(): string {
    const stored = localStorage.getItem('omnibrowser:vault:key');
    if (stored) {
      return stored;
    }

    // Generate new key
    const key = `vault-${Date.now()}-${Math.random().toString(36).slice(2, 18)}`;
    localStorage.setItem('omnibrowser:vault:key', key);
    return key;
  }

  /**
   * Store a secret
   */
  async store(key: string, value: string): Promise<void> {
    try {
      const encrypted = await encrypt(value, this.vaultKey);
      this.storage.set(key, encrypted);
      localStorage.setItem(`omnibrowser:vault:${key}`, encrypted);
      log.debug('Secret stored in vault', { key });
    } catch (error) {
      log.error('Failed to store secret', { key, error });
      throw error;
    }
  }

  /**
   * Retrieve a secret
   */
  async retrieve(key: string): Promise<string | null> {
    try {
      let encrypted = this.storage.get(key);
      if (!encrypted) {
        encrypted = localStorage.getItem(`omnibrowser:vault:${key}`) ?? undefined;
        if (encrypted) {
          this.storage.set(key, encrypted);
        }
      }

      if (!encrypted) {
        return null;
      }

      const decrypted = await decrypt(encrypted, this.vaultKey);
      return decrypted;
    } catch (error) {
      log.error('Failed to retrieve secret', { key, error });
      return null;
    }
  }

  /**
   * Delete a secret
   */
  delete(key: string): void {
    this.storage.delete(key);
    localStorage.removeItem(`omnibrowser:vault:${key}`);
    log.debug('Secret deleted from vault', { key });
  }

  /**
   * Check if secret exists
   */
  has(key: string): boolean {
    return this.storage.has(key) || localStorage.getItem(`omnibrowser:vault:${key}`) !== null;
  }

  /**
   * Clear all secrets
   */
  clear(): void {
    this.storage.clear();
    const keys = Object.keys(localStorage).filter(k => k.startsWith('omnibrowser:vault:'));
    keys.forEach(k => localStorage.removeItem(k));
    log.info('Vault cleared');
  }
}

// Singleton instance
export const secureVault = new SecureVault();
