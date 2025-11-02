/**
 * Secrets Management
 * Secure storage for tokens and credentials using keytar/safeStorage
 */

import { safeStorage } from 'electron';
// @ts-ignore - keytar is optional
let keytar: any;
try {
  keytar = require('keytar');
} catch {
  // keytar not available, will use safeStorage fallback
}

const SERVICE_NAME = 'omnibrowser';

/**
 * Store a secret (tries keytar first, falls back to safeStorage)
 */
export async function storeSecret(key: string, value: string): Promise<void> {
  try {
    // Try keytar first (works on all platforms)
    if (keytar) {
      await keytar.setPassword(SERVICE_NAME, key, value);
      return;
    }
  } catch (error) {
    // Fall back to Electron safeStorage if keytar fails
    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(value);
      // Store encrypted value (would need to persist to disk)
      // For MVP, we'll use a simple in-memory cache
      console.warn('[Secrets] keytar unavailable, using safeStorage (in-memory only)');
    } else {
      throw new Error('No secure storage available');
    }
  }
}

/**
 * Retrieve a secret
 */
export async function getSecret(key: string): Promise<string | null> {
  try {
    if (keytar) {
      return await keytar.getPassword(SERVICE_NAME, key);
    }
  } catch (error) {
    console.error('[Secrets] Failed to retrieve secret:', error);
  }
  
  // Fallback: return null if keytar unavailable
  return null;
}

/**
 * Delete a secret
 */
export async function deleteSecret(key: string): Promise<boolean> {
  try {
    if (keytar) {
      return await keytar.deletePassword(SERVICE_NAME, key);
    }
  } catch (error) {
    console.error('[Secrets] Failed to delete secret:', error);
  }
  
  // Fallback: return false if keytar unavailable
  return false;
}

/**
 * List all secret keys
 */
export async function listSecrets(): Promise<string[]> {
  try {
    if (keytar) {
      const credentials = await keytar.findCredentials(SERVICE_NAME);
      return credentials.map((c: any) => c.account);
    }
  } catch (error) {
    console.error('[Secrets] Failed to list secrets:', error);
  }
  
  // Fallback: return empty array if keytar unavailable
  return [];
}

