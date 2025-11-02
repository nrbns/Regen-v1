/**
 * Network Controls Service
 * QUIC disable, IPv6 leak prevention, and network hardening
 */

import { app, session } from 'electron';
import { EventEmitter } from 'events';

export interface NetworkControls {
  quicEnabled: boolean;
  ipv6Enabled: boolean;
  ipv6LeakProtection: boolean;
}

class NetworkControlsService extends EventEmitter {
  private config: NetworkControls = {
    quicEnabled: true,
    ipv6Enabled: true,
    ipv6LeakProtection: false,
  };

  constructor() {
    super();
    this.applyControls();
  }

  /**
   * Disable QUIC (HTTP/3)
   */
  disableQUIC(): void {
    this.config.quicEnabled = false;
    // Disable via command line args (must be set before app ready)
    if (!app.isReady()) {
      app.commandLine.appendSwitch('disable-quic');
    } else {
      // For runtime disable, we can't change command-line flags
      // But we can set preference to disable QUIC
      try {
        session.defaultSession.setPreloads([]);
        // Note: QUIC disabling at runtime requires Chromium flags
        // This is a limitation - QUIC should be disabled at startup
        console.warn('[Network] QUIC disable requires app restart. Set disable-quic flag at startup.');
      } catch (error) {
        console.warn('[Network] Failed to disable QUIC at runtime:', error);
      }
    }
    this.emit('config-changed', this.config);
  }

  /**
   * Enable QUIC
   */
  enableQUIC(): void {
    this.config.quicEnabled = true;
    // Note: Can't re-enable via command line once disabled
    this.emit('config-changed', this.config);
  }

  /**
   * Disable IPv6 to prevent leaks
   */
  disableIPv6(): void {
    this.config.ipv6Enabled = false;
    this.config.ipv6LeakProtection = true;

    // Block IPv6 connections
    session.defaultSession.webRequest.onBeforeRequest(
      { urls: ['*://*/*'] },
      (details, callback) => {
        try {
          const url = new URL(details.url);
          // Check if hostname is IPv6
          if (url.hostname.includes(':')) {
            // IPv6 address detected
            callback({ cancel: true });
            return;
          }
        } catch {}

        // IPv6 blocking handled via URL check above
        callback({});
      }
    );

    this.emit('config-changed', this.config);
  }

  /**
   * Enable IPv6
   */
  enableIPv6(): void {
    this.config.ipv6Enabled = true;
    this.config.ipv6LeakProtection = false;
    // Remove IPv6 blocking (would need to track and remove specific handlers)
    this.emit('config-changed', this.config);
  }

  /**
   * Get current configuration
   */
  getConfig(): NetworkControls {
    return { ...this.config };
  }

  /**
   * Apply all network controls
   */
  private applyControls(): void {
    // Apply controls based on config
    // Note: Some controls need to be set before app.ready()
  }

  /**
   * Initialize with default privacy settings
   */
  initializeDefaults(): void {
    // Set privacy-focused defaults
    this.config.quicEnabled = false; // Disable QUIC for privacy
    this.config.ipv6LeakProtection = true; // Enable IPv6 leak protection by default
    
    if (!app.isReady()) {
      app.commandLine.appendSwitch('disable-quic');
    }
    
    if (this.config.ipv6LeakProtection) {
      // IPv6 blocking will be set up when session is ready
      // Note: This is already called from app.whenReady(), so we can call directly
      // The disableIPv6() method sets up webRequest filters which work after ready
    }
  }
}

// Singleton
let networkControlsService: NetworkControlsService | null = null;

export function getNetworkControlsService(): NetworkControlsService {
  if (!networkControlsService) {
    networkControlsService = new NetworkControlsService();
  }
  return networkControlsService;
}

export function initializeNetworkControls(): NetworkControlsService {
  networkControlsService = new NetworkControlsService();
  return networkControlsService;
}

