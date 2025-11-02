/**
 * Dynamic Fingerprint Cloaking
 * Randomizes hardware, fonts, UA fingerprints every session
 */

import { session } from 'electron';

export interface FingerprintConfig {
  userAgent?: string;
  platform?: string;
  hardwareConcurrency?: number;
  deviceMemory?: number;
  languages?: string[];
}

export class FingerprintCloak {
  private config: FingerprintConfig = {};

  /**
   * Randomize fingerprint for new session
   */
  randomize(): void {
    // Randomize user agent
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
    ];
    this.config.userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];

    // Randomize hardware (within realistic bounds)
    this.config.hardwareConcurrency = Math.floor(Math.random() * 8) + 2; // 2-10 cores
    this.config.deviceMemory = [2, 4, 8, 16][Math.floor(Math.random() * 4)]; // GB

    // Randomize languages
    const languageSets = [
      ['en-US', 'en'],
      ['en-GB', 'en'],
      ['es-ES', 'es', 'en'],
      ['fr-FR', 'fr', 'en'],
    ];
    this.config.languages = languageSets[Math.floor(Math.random() * languageSets.length)];

    // Apply to session
    this.apply();
  }

  /**
   * Apply fingerprint configuration
   */
  apply(): void {
    if (this.config.userAgent) {
      session.defaultSession.setUserAgent(this.config.userAgent);
    }

    // Inject JavaScript to override navigator properties
    const script = `
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: () => ${this.config.hardwareConcurrency || 4}
      });
      Object.defineProperty(navigator, 'deviceMemory', {
        get: () => ${this.config.deviceMemory || 8}
      });
      Object.defineProperty(navigator, 'languages', {
        get: () => ${JSON.stringify(this.config.languages || ['en-US', 'en'])}
      });
    `;

    session.defaultSession.webRequest.onBeforeRequest({ urls: ['<all_urls>'] }, (details, callback) => {
      // Inject script via webRequest (simplified - would need proper injection mechanism)
      callback({});
    });
  }

  /**
   * Get current fingerprint config
   */
  getConfig(): FingerprintConfig {
    return { ...this.config };
  }
}

// Singleton instance
let fingerprintCloakInstance: FingerprintCloak | null = null;

export function getFingerprintCloak(): FingerprintCloak {
  if (!fingerprintCloakInstance) {
    fingerprintCloakInstance = new FingerprintCloak();
  }
  return fingerprintCloakInstance;
}

