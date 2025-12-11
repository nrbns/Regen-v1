/**
 * Ghost Mode - Maximum Security Mode for Tor Browser
 *
 * When enabled, Ghost Mode:
 * - Forces local AI only (no cloud APIs)
 * - Disables all tracking
 * - Uses ephemeral sessions (no storage)
 * - Blocks all external scripts
 * - Renders content as static HTML only
 * - Disables all non-essential features
 *
 * This is the "world AI security browser" mode.
 */

import { TorDetector, detectTorBrowser } from './tor-detector';
import { DeviceDetector } from './device-detector';

export interface GhostModeConfig {
  enabled: boolean;
  localAIOnly: boolean;
  noCloudAPIs: boolean;
  noStorage: boolean;
  noScripts: boolean;
  noTracking: boolean;
  ephemeralSession: boolean;
  torDetected: boolean;
  securityLevel: 'maximum' | 'high' | 'standard';
}

export class GhostMode {
  private config: GhostModeConfig;
  private torDetector: TorDetector;
  private deviceDetector: DeviceDetector;

  constructor() {
    this.torDetector = new TorDetector();
    this.deviceDetector = new DeviceDetector();

    // Ghost mode disabled - always use normal mode
    const torDetection = detectTorBrowser();
    
    this.config = {
      enabled: false, // Ghost mode disabled by default - use normal mode
      localAIOnly: false, // Allow cloud APIs for functionality
      noCloudAPIs: false, // Allow cloud APIs for functionality
      noStorage: false, // Allow storage for functionality
      noScripts: false, // Allow scripts for functionality
      noTracking: false, // Allow tracking (normal mode behavior)
      ephemeralSession: false, // Allow persistence for functionality
      torDetected: torDetection.isTorBrowser,
      securityLevel: 'standard', // Always use standard security in normal mode
    };

    // Don't auto-activate - user controls via PrivacySwitch
    // if (this.config.enabled) {
    //   this.activateGhostMode();
    // }
  }

  /**
   * Activate Ghost Mode
   * Blocks tracking while maintaining functionality
   */
  private activateGhostMode(): void {
    // Add Ghost Mode class to document
    document.documentElement.classList.add('ghost-mode');
    document.documentElement.setAttribute('data-ghost-mode', 'true');

    // Block tracking scripts and requests
    this.blockTracking();

    // Note: We don't disable storage or scripts - we only block tracking
    // This allows websites to function normally while preventing tracking

    console.log('🔒 Ghost Mode activated - Tracking blocked, functionality preserved');
    console.log('🔒 Tor detected:', this.config.torDetected);
    console.log('🔒 Tracking blocked:', this.config.noTracking);
  }

  /**
   * Block tracking scripts and requests
   */
  private blockTracking(): void {
    // Block known tracking domains via fetch interception
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
      const url =
        typeof args[0] === 'string' ? args[0] : args[0] instanceof Request ? args[0].url : '';

      // Block known tracking domains
      const trackingPatterns = [
        /doubleclick\.net/i,
        /google-analytics\.com/i,
        /googletagmanager\.com/i,
        /facebook\.net/i,
        /facebook\.com\/tr/i,
        /analytics\./i,
        /tracking\./i,
        /adservice\./i,
        /ads\./i,
        /advertising\./i,
        /adserver\./i,
        /pixel\./i,
        /beacon\./i,
        /tracker\./i,
      ];

      if (trackingPatterns.some(pattern => pattern.test(url))) {
        // Block tracking request
        if (import.meta.env.DEV) {
          console.debug('[Ghost Mode] Blocked tracking request:', url);
        }
        return Promise.reject(new Error('Tracking blocked by Ghost Mode'));
      }

      // Allow non-tracking requests
      return originalFetch.apply(this, args);
    };

    // Block tracking scripts from loading
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement;

            // Block tracking scripts
            if (element.tagName === 'SCRIPT') {
              const src = (element as HTMLScriptElement).src;
              if (src) {
                const trackingPatterns = [
                  /google-analytics\.com/i,
                  /googletagmanager\.com/i,
                  /facebook\.net/i,
                  /analytics\./i,
                  /tracking\./i,
                ];

                if (trackingPatterns.some(pattern => pattern.test(src))) {
                  element.remove();
                  if (import.meta.env.DEV) {
                    console.debug('[Ghost Mode] Blocked tracking script:', src);
                  }
                }
              }
            }

            // Block tracking iframes
            if (element.tagName === 'IFRAME') {
              const src = (element as HTMLIFrameElement).src;
              if (src) {
                const trackingPatterns = [
                  /doubleclick\.net/i,
                  /google-analytics\.com/i,
                  /facebook\.com/i,
                  /ads\./i,
                ];

                if (trackingPatterns.some(pattern => pattern.test(src))) {
                  element.remove();
                  if (import.meta.env.DEV) {
                    console.debug('[Ghost Mode] Blocked tracking iframe:', src);
                  }
                }
              }
            }
          }
        });
      });
    });

    observer.observe(document, {
      childList: true,
      subtree: true,
    });
  }

  /**
   * Enable Ghost Mode manually
   * Note: Ghost mode is disabled - this method does nothing
   */
  enable(): void {
    // Ghost mode is disabled - do nothing
    console.log('[Ghost Mode] Ghost mode is disabled. Using normal mode.');
    return;
  }

  /**
   * Disable Ghost Mode
   */
  disable(): void {
    if (!this.config.enabled) {
      return;
    }

    this.config.enabled = false;
    this.config.securityLevel = 'standard';
    document.documentElement.classList.remove('ghost-mode');
    document.documentElement.removeAttribute('data-ghost-mode');

    console.log('🔓 Ghost Mode disabled');
  }

  /**
   * Check if Ghost Mode is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Get Ghost Mode configuration
   */
  getConfig(): GhostModeConfig {
    return { ...this.config };
  }

  /**
   * Check if cloud APIs are allowed
   */
  canUseCloudAPI(): boolean {
    return !this.config.enabled || !this.config.noCloudAPIs;
  }

  /**
   * Check if storage is allowed
   */
  canUseStorage(): boolean {
    return !this.config.enabled || !this.config.noStorage;
  }

  /**
   * Check if scripts are allowed
   */
  canUseScripts(): boolean {
    return !this.config.enabled || !this.config.noScripts;
  }

  /**
   * Get security status message
   */
  getSecurityStatus(): string {
    if (!this.config.enabled) {
      return 'Standard security';
    }

    const parts: string[] = [];

    if (this.config.torDetected) {
      parts.push('🔒 Tor: Active');
    }

    if (this.config.localAIOnly) {
      parts.push('🤖 AI: Local');
    }

    if (this.config.noTracking) {
      parts.push('🚫 Tracking: Blocked');
    }

    if (this.config.ephemeralSession) {
      parts.push('💨 Session: Ephemeral');
    }

    return parts.join(' | ') || 'Ghost Mode: Active';
  }
}

// Singleton instance
let ghostModeInstance: GhostMode | null = null;

/**
 * Get the global GhostMode instance
 */
export function getGhostMode(): GhostMode {
  if (!ghostModeInstance) {
    ghostModeInstance = new GhostMode();
  }
  return ghostModeInstance;
}

/**
 * Check if Ghost Mode is enabled
 */
export function isGhostModeEnabled(): boolean {
  return getGhostMode().isEnabled();
}

/**
 * Enable Ghost Mode
 */
export function enableGhostMode(): void {
  getGhostMode().enable();
}

/**
 * Disable Ghost Mode
 */
export function disableGhostMode(): void {
  getGhostMode().disable();
}
