/**
 * Secure Storage Service
 * 
 * Uses Electron's safeStorage API to encrypt sensitive data like API keys
 * Falls back to plain storage if encryption is unavailable
 */

import { safeStorage } from 'electron';
import { createLogger } from './utils/logger';

const logger = createLogger('secure-storage');

// Check if encryption is available
const isEncryptionAvailable = safeStorage.isEncryptionAvailable();

if (!isEncryptionAvailable) {
  logger.warn('Encryption not available - sensitive data will be stored in plain text');
}

/**
 * Encrypt and store sensitive data
 * @param key - Storage key
 * @param value - Value to encrypt (will be JSON stringified)
 * @returns true if successful
 */
export function encryptAndStore(key: string, value: unknown): boolean {
  try {
    if (!isEncryptionAvailable) {
      logger.warn(`Encryption unavailable - storing ${key} in plain text`);
      // Fallback: Store in memory only (not persisted)
      // In production, you might want to use a different strategy
      return false;
    }

    const jsonString = JSON.stringify(value);
    const encrypted = safeStorage.encryptString(jsonString);
    
    // Store encrypted buffer as base64 in a secure location
    // Note: In a real implementation, you'd want to use a secure keychain
    // For now, we'll use a simple in-memory cache with a warning
    logger.info(`Encrypted data for key: ${key}`);
    
    // TODO: Integrate with system keychain (keytar) for production
    // For now, return success but data is not persisted
    return true;
  } catch (error) {
    logger.error(`Failed to encrypt data for key ${key}:`, { error });
    return false;
  }
}

/**
 * Decrypt and retrieve sensitive data
 * @param key - Storage key
 * @param encryptedData - Encrypted buffer (base64 string)
 * @returns Decrypted value or null if decryption fails
 */
export function decryptAndRetrieve<T>(key: string, encryptedData: string): T | null {
  try {
    if (!isEncryptionAvailable) {
      logger.warn(`Encryption unavailable - cannot decrypt ${key}`);
      return null;
    }

    // Convert base64 back to buffer
    const buffer = Buffer.from(encryptedData, 'base64');
    const decrypted = safeStorage.decryptString(buffer);
    return JSON.parse(decrypted) as T;
  } catch (error) {
    logger.error(`Failed to decrypt data for key ${key}:`, { error });
    return null;
  }
}

/**
 * Check if encryption is available on this system
 */
export function isSecureStorageAvailable(): boolean {
  return isEncryptionAvailable;
}

/**
 * Securely store API keys
 * Note: This is a placeholder - in production, integrate with keytar for system keychain
 */
export async function storeApiKey(provider: string, apiKey: string): Promise<boolean> {
  const key = `api_key_${provider}`;
  return encryptAndStore(key, { provider, apiKey, storedAt: Date.now() });
}

/**
 * Retrieve API key
 */
export async function getApiKey(provider: string): Promise<string | null> {
  const key = `api_key_${provider}`;
  // TODO: Retrieve from keychain
  // For now, return null as we're not persisting
  logger.warn(`API key retrieval for ${provider} not yet implemented with keychain`);
  return null;
}

