/**
 * Token Vault Service
 * Secure storage for OAuth tokens and API keys
 * Production: Use HashiCorp Vault or AWS Secrets Manager
 */

import * as crypto from 'crypto';

/**
 * In-memory token store (production: use Vault)
 */
const tokenStore = new Map<string, EncryptedToken>();

export interface EncryptedToken {
  userId: string;
  provider: 'google' | 'microsoft' | 'facebook' | 'custom';
  encryptedAccessToken: string;
  encryptedRefreshToken?: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  isValid: boolean;
}

export class TokenVault {
  private encryptionKey: string;

  constructor() {
    // In production: load from environment with strong randomness
    this.encryptionKey = process.env.TOKEN_ENCRYPTION_KEY || this.generateKey();
  }

  /**
   * Store OAuth token securely
   */
  async storeToken(
    userId: string,
    provider: string,
    accessToken: string,
    refreshToken?: string,
    expiresIn?: number
  ): Promise<void> {
    // Encrypt tokens
    const encryptedAccessToken = this.encrypt(accessToken);
    const encryptedRefreshToken = refreshToken ? this.encrypt(refreshToken) : undefined;

    // Calculate expiration
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + (expiresIn || 3600));

    const token: EncryptedToken = {
      userId,
      provider: provider as any,
      encryptedAccessToken,
      encryptedRefreshToken,
      expiresAt,
      createdAt: new Date(),
      updatedAt: new Date(),
      isValid: true,
    };

    // Store
    const key = `${userId}:${provider}`;
    tokenStore.set(key, token);

    console.log(`[TokenVault] Stored token for ${userId}/${provider}`);
  }

  /**
   * Retrieve OAuth token
   */
  async getToken(userId: string, provider: string): Promise<string | null> {
    const key = `${userId}:${provider}`;
    const token = tokenStore.get(key);

    if (!token) {
      console.warn(`[TokenVault] Token not found: ${key}`);
      return null;
    }

    // Check if expired
    if (new Date() > token.expiresAt) {
      console.warn(`[TokenVault] Token expired: ${key}`);
      tokenStore.delete(key);
      return null;
    }

    // Decrypt and return
    try {
      return this.decrypt(token.encryptedAccessToken);
    } catch (error) {
      console.error(`[TokenVault] Decryption failed: ${key}`, error);
      return null;
    }
  }

  /**
   * Get refresh token
   */
  async getRefreshToken(userId: string, provider: string): Promise<string | null> {
    const key = `${userId}:${provider}`;
    const token = tokenStore.get(key);

    if (!token || !token.encryptedRefreshToken) {
      return null;
    }

    try {
      return this.decrypt(token.encryptedRefreshToken);
    } catch (error) {
      console.error(`[TokenVault] Refresh token decryption failed: ${key}`, error);
      return null;
    }
  }

  /**
   * Revoke token
   */
  async revokeToken(userId: string, provider: string): Promise<void> {
    const key = `${userId}:${provider}`;
    const token = tokenStore.get(key);

    if (token) {
      token.isValid = false;
      tokenStore.set(key, token);
      console.log(`[TokenVault] Revoked token: ${key}`);
    }
  }

  /**
   * Check if token is valid
   */
  async isTokenValid(userId: string, provider: string): Promise<boolean> {
    const key = `${userId}:${provider}`;
    const token = tokenStore.get(key);

    if (!token || !token.isValid) {
      return false;
    }

    if (new Date() > token.expiresAt) {
      return false;
    }

    return true;
  }

  /**
   * Get all tokens for user
   */
  async getUserTokens(userId: string): Promise<Record<string, EncryptedToken>> {
    const result: Record<string, EncryptedToken> = {};

    for (const [key, token] of tokenStore.entries()) {
      if (key.startsWith(`${userId}:`)) {
        result[key] = token;
      }
    }

    return result;
  }

  /**
   * Revoke all user tokens (logout)
   */
  async revokeAllTokens(userId: string): Promise<void> {
    const keys = Array.from(tokenStore.keys()).filter((k) => k.startsWith(`${userId}:`));

    for (const key of keys) {
      const token = tokenStore.get(key);
      if (token) {
        token.isValid = false;
        tokenStore.set(key, token);
      }
    }

    console.log(`[TokenVault] Revoked all tokens for ${userId}`);
  }

  /**
   * Encrypt token
   */
  private encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      Buffer.from(this.encryptionKey),
      iv
    );

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return `${iv.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt token
   */
  private decrypt(ciphertext: string): string {
    const [ivHex, encrypted] = ciphertext.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(this.encryptionKey),
      iv
    );

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Generate encryption key
   */
  private generateKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}

export const globalTokenVault = new TokenVault();
