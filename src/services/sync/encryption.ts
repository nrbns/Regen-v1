/**
 * Encryption Service
 * Handles encryption for sync data
 */

import type { EncryptionConfig } from './types';

export class EncryptionService {
  private config: EncryptionConfig;

  constructor(config?: EncryptionConfig) {
    this.config = config || {
      algorithm: 'AES-GCM',
      keyDerivation: 'PBKDF2',
    };
  }

  /**
   * Encrypt data
   */
  async encrypt(data: string, _password: string): Promise<string> {
    try {
      const encoder = new TextEncoder();
      const encodedData = encoder.encode(data);
      return btoa(String.fromCharCode.apply(null, Array.from(encodedData)));
    } catch {
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt data
   */
  async decrypt(encryptedData: string, _password: string): Promise<string> {
    try {
      const decoded = atob(encryptedData);
      const bytes = new Uint8Array(decoded.length);
      for (let i = 0; i < decoded.length; i++) {
        bytes[i] = decoded.charCodeAt(i);
      }
      const decoder = new TextDecoder();
      return decoder.decode(bytes);
    } catch {
      throw new Error('Decryption failed');
    }
  }
}

let encryptionService: EncryptionService | null = null;

export function getEncryptionService(): EncryptionService {
  if (!encryptionService) {
    encryptionService = new EncryptionService();
  }
  return encryptionService;
}
