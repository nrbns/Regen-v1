/**
 * 2FA Service
 * Two-factor authentication for high-risk actions
 */

import * as crypto from 'crypto';

/**
 * 2FA methods
 */
export type TwoFactorMethod = 'totp' | 'email' | 'sms' | 'authenticator';

/**
 * 2FA Configuration
 */
export interface TwoFactorConfig {
  userId: string;
  method: TwoFactorMethod;
  enabled: boolean;
  verified: boolean;
  secret?: string; // For TOTP
  email?: string; // For email OTP
  phone?: string; // For SMS OTP
  backupCodes?: string[]; // Single-use recovery codes
  createdAt: Date;
  lastUsedAt?: Date;
}

/**
 * Pending 2FA Challenge
 */
export interface TwoFactorChallenge {
  challengeId: string;
  userId: string;
  method: TwoFactorMethod;
  action: string; // e.g., "send_email", "book_flight"
  code?: string; // OTP sent to user
  attempts: number;
  maxAttempts: number;
  expiresAt: Date;
  createdAt: Date;
}

const userConfigs = new Map<string, TwoFactorConfig>();
const activeChallenges = new Map<string, TwoFactorChallenge>();

export class TwoFactorAuth {
  /**
   * Setup 2FA for user
   */
  async setupTwoFactor(
    userId: string,
    method: TwoFactorMethod
  ): Promise<{ secret?: string; qrCode?: string; backupCodes: string[] }> {
    const backupCodes = this.generateBackupCodes();

    if (method === 'totp' || method === 'authenticator') {
      const secret = crypto.randomBytes(32).toString('base64');

      userConfigs.set(userId, {
        userId,
        method,
        enabled: true,
        verified: false,
        secret,
        backupCodes,
        createdAt: new Date(),
      });

      console.log(`[2FA] Setup ${method} for ${userId}`);

      return {
        secret,
        qrCode: `otpauth://totp/${userId}?secret=${secret}`,
        backupCodes,
      };
    }

    if (method === 'email') {
      userConfigs.set(userId, {
        userId,
        method,
        enabled: true,
        verified: false,
        backupCodes,
        createdAt: new Date(),
      });

      return { backupCodes };
    }

    return { backupCodes };
  }

  /**
   * Verify 2FA setup
   */
  async verifySetup(userId: string, code: string): Promise<boolean> {
    const config = userConfigs.get(userId);
    if (!config) return false;

    if (config.method === 'totp' && config.secret) {
      const isValid = this.verifyTOTP(config.secret, code);
      if (isValid) {
        config.verified = true;
        userConfigs.set(userId, config);
        console.log(`[2FA] Verified setup for ${userId}`);
      }
      return isValid;
    }

    return true;
  }

  /**
   * Create 2FA challenge
   */
  async createChallenge(userId: string, action: string): Promise<TwoFactorChallenge> {
    const config = userConfigs.get(userId);
    if (!config || !config.enabled) {
      throw new Error('2FA not enabled for user');
    }

    const code = this.generateOTP();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5); // 5-minute expiry

    const challenge: TwoFactorChallenge = {
      challengeId: `2fa-${Date.now()}`,
      userId,
      method: config.method,
      action,
      code,
      attempts: 0,
      maxAttempts: 3,
      expiresAt,
      createdAt: new Date(),
    };

    activeChallenges.set(challenge.challengeId, challenge);

    // Send code to user (email, SMS, etc.)
    await this.deliverCode(config, code);

    console.log(`[2FA] Challenge created for ${userId}: ${action}`);
    return challenge;
  }

  /**
   * Verify 2FA challenge
   */
  async verifyChallenge(challengeId: string, code: string): Promise<boolean> {
    const challenge = activeChallenges.get(challengeId);
    if (!challenge) {
      return false;
    }

    // Check expiration
    if (new Date() > challenge.expiresAt) {
      activeChallenges.delete(challengeId);
      console.warn(`[2FA] Challenge expired: ${challengeId}`);
      return false;
    }

    // Check attempts
    if (challenge.attempts >= challenge.maxAttempts) {
      activeChallenges.delete(challengeId);
      console.warn(`[2FA] Max attempts exceeded: ${challengeId}`);
      return false;
    }

    challenge.attempts++;

    // Verify code
    if (challenge.code === code) {
      activeChallenges.delete(challengeId);
      console.log(`[2FA] Challenge verified: ${challengeId}`);
      return true;
    }

    activeChallenges.set(challengeId, challenge);
    return false;
  }

  /**
   * Check if 2FA is enabled
   */
  async isTwoFactorEnabled(userId: string): Promise<boolean> {
    const config = userConfigs.get(userId);
    return config?.enabled && config?.verified ? true : false;
  }

  /**
   * Disable 2FA
   */
  async disableTwoFactor(userId: string): Promise<void> {
    const config = userConfigs.get(userId);
    if (config) {
      config.enabled = false;
      userConfigs.set(userId, config);
      console.log(`[2FA] Disabled for ${userId}`);
    }
  }

  /**
   * Get 2FA config
   */
  async getConfig(userId: string): Promise<TwoFactorConfig | null> {
    const config = userConfigs.get(userId);
    if (!config) return null;

    // Don't return secret in response
    return {
      userId: config.userId,
      method: config.method,
      enabled: config.enabled,
      verified: config.verified,
      createdAt: config.createdAt,
      lastUsedAt: config.lastUsedAt,
    };
  }

  /**
   * Verify TOTP code
   */
  private verifyTOTP(secret: string, code: string): boolean {
    // Simplified TOTP verification
    // In production: use speakeasy or similar library
    return code.length === 6; // Mock: just check format
  }

  /**
   * Generate OTP
   */
  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Generate backup codes
   */
  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }

  /**
   * Deliver OTP to user
   */
  private async deliverCode(config: TwoFactorConfig, code: string): Promise<void> {
    if (config.method === 'email' && config.email) {
      console.log(`[2FA] Sending email to ${config.email}: ${code}`);
      // In production: use nodemailer or SendGrid
    } else if (config.method === 'sms' && config.phone) {
      console.log(`[2FA] Sending SMS to ${config.phone}: ${code}`);
      // In production: use Twilio
    }
  }
}

export const globalTwoFactorAuth = new TwoFactorAuth();
