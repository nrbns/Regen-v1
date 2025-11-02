/**
 * Brave-like Shields Service
 * Ad/tracker blocking, fingerprint protection, script controls
 */

import { session, WebContents } from 'electron';
import { EventEmitter } from 'events';

export interface ShieldsConfig {
  ads: boolean; // Block ads & trackers
  cookies: 'all' | '3p' | 'none'; // Cookie blocking level
  httpsOnly: boolean; // Force HTTPS upgrades
  fingerprinting: boolean; // Canvas/audio noise, etc.
  scripts: 'all' | '3p' | 'none'; // Script blocking
  webrtc: boolean; // Block WebRTC leaks
}

export interface SiteShields {
  hostname: string;
  config: ShieldsConfig;
  overrides: Partial<ShieldsConfig>; // User overrides
}

class ShieldsService extends EventEmitter {
  private defaultConfig: ShieldsConfig = {
    ads: true,
    cookies: '3p',
    httpsOnly: false,
    fingerprinting: true,
    scripts: 'all',
    webrtc: true,
  };
  
  /**
   * Check if URL is a video site that needs special handling
   */
  private isVideoSite(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return ['youtube.com', 'youtu.be', 'vimeo.com', 'dailymotion.com', 'twitch.tv', 'netflix.com'].some(domain => 
        urlObj.hostname.includes(domain)
      );
    } catch {
      return false;
    }
  }
  private siteConfigs: Map<string, SiteShields> = new Map();
  private adblocker: any = null;

  constructor() {
    super();
    this.initializeAdblocker();
    this.setupSessionFilters();
  }

  /**
   * Initialize adblocker engine
   */
  private async initializeAdblocker(): Promise<void> {
    try {
      // Use @ghostery/adblocker-electron (or deprecated @cliqz) for performance (optional dependency)
      // If not available, ad blocking will be handled via request filters
      let ElectronBlocker: any = null;
      try {
        // @ts-ignore - @ghostery/adblocker-electron may not have types
        const blockerModule = await import('@ghostery/adblocker-electron');
        ElectronBlocker = blockerModule.ElectronBlocker;
      } catch {
        try {
          // @ts-ignore - @cliqz/adblocker-electron may not have types
          const blockerModule = await import('@cliqz/adblocker-electron');
          ElectronBlocker = blockerModule.ElectronBlocker;
        } catch {
          console.warn('[Shields] Adblocker not available, using fallback blocking');
          this.setupFallbackAdBlocking();
          return;
        }
      }

      if (!ElectronBlocker) {
        console.warn('[Shields] Adblocker not available, using fallback blocking');
        this.setupFallbackAdBlocking();
        return;
      }
      const { fetch } = await import('undici');

      this.adblocker = ElectronBlocker.fromPrebuiltAdsOnly(fetch);
      this.adblocker.enableBlockingInSession(session.defaultSession);

      // Adblocker is initialized with prebuilt lists
      // Additional lists can be loaded if needed, but fromPrebuiltAdsOnly already includes them
    } catch (error) {
      console.warn('Adblocker initialization failed, using fallback:', error);
      this.setupFallbackAdBlocking();
    }
  }

  /**
   * Fallback ad blocking using webRequest filters
   */
  private setupFallbackAdBlocking(): void {
    const defaultSession = session.defaultSession;
    
    // Block common ad domains
    const adDomains = [
      'doubleclick.net',
      'googleadservices.com',
      'googlesyndication.com',
      'google-analytics.com',
      'facebook.com/tr',
      'scorecardresearch.com',
    ];

    defaultSession.webRequest.onBeforeRequest(
      { urls: ['<all_urls>'] },
      (details, callback) => {
        // Don't block ads on video sites (breaks video players)
        if (this.isVideoSite(details.url)) {
          callback({});
          return;
        }
        
        try {
          const url = new URL(details.url);
          const isAdDomain = adDomains.some(domain => url.hostname.includes(domain));
          
          if (isAdDomain) {
            callback({ cancel: true });
            return;
          }
        } catch {}
        
        callback({});
      }
    );
  }

  /**
   * Setup session-level filters
   */
  private setupSessionFilters(): void {
    const defaultSession = session.defaultSession;

    // HTTPS-only mode
    defaultSession.webRequest.onBeforeRequest(
      { urls: ['http://*/*'] },
      (details, callback) => {
        const shields = this.getShieldsForUrl(details.url);
        if (shields.config.httpsOnly) {
          // Upgrade to HTTPS
          const httpsUrl = details.url.replace(/^http:/, 'https:');
          callback({ redirectURL: httpsUrl });
        } else {
          callback({});
        }
      }
    );

    // Cookie blocking (skip for video sites)
    defaultSession.webRequest.onBeforeSendHeaders(
      { urls: ['<all_urls>'] },
      (details, callback) => {
        // Allow all cookies for video sites
        if (this.isVideoSite(details.url)) {
          callback({});
          return;
        }
        
        const shields = this.getShieldsForUrl(details.url);
        const headers = details.requestHeaders ? { ...details.requestHeaders } : {};

        if (shields.config.cookies === 'none') {
          delete headers['Cookie'];
        } else if (shields.config.cookies === '3p') {
          // Block third-party cookies
          try {
            const url = new URL(details.url);
            const referer = details.requestHeaders?.['Referer'] || '';
            if (referer) {
              try {
                const refererUrl = new URL(referer);
                if (url.hostname !== refererUrl.hostname) {
                  delete headers['Cookie'];
                }
              } catch {
                // Invalid referer, allow cookies
              }
            }
          } catch {
            // Invalid URL, allow cookies
          }
        }

        callback({ requestHeaders: headers });
      }
    );

    // Script blocking (skip for video sites)
    defaultSession.webRequest.onBeforeRequest(
      { urls: ['<all_urls>'], types: ['script'] },
      (details, callback) => {
        // Allow all scripts for video sites
        if (this.isVideoSite(details.url)) {
          callback({});
          return;
        }
        
        const shields = this.getShieldsForUrl(details.url);
        
        if (shields.config.scripts === 'none') {
          callback({ cancel: true });
          return;
        } else if (shields.config.scripts === '3p') {
          // Block third-party scripts
          try {
            const url = new URL(details.url);
            // Check referer from request headers if available
            const referer = (details as any).requestHeaders?.['Referer'] || details.referrer || '';
            if (referer) {
              try {
                const refererUrl = new URL(referer);
                if (url.hostname !== refererUrl.hostname) {
                  callback({ cancel: true });
                  return;
                }
              } catch {
                // Invalid referer, allow script
              }
            }
          } catch {
            // Invalid URL, allow script
          }
        }

        callback({});
      }
    );
  }

  /**
   * Inject fingerprint protection into renderer
   */
  injectFingerprintProtection(webContents: WebContents): void {
    if (!webContents || webContents.isDestroyed()) return;

    const shields = this.getShieldsForUrl(webContents.getURL());
    if (!shields.config.fingerprinting) return;

    // Inject noise into canvas fingerprinting
    const canvasScript = `
      (function() {
        const toBlob = HTMLCanvasElement.prototype.toBlob;
        const toDataURL = HTMLCanvasElement.prototype.toDataURL;
        const getImageData = CanvasRenderingContext2D.prototype.getImageData;
        
        // Add minimal noise to canvas operations
        HTMLCanvasElement.prototype.toBlob = function(callback, type, quality) {
          const imageData = this.getContext('2d').getImageData(0, 0, this.width, this.height);
          const data = imageData.data;
          // Add 1-bit noise to random pixels
          for (let i = 0; i < data.length; i += 4) {
            if (Math.random() < 0.01) {
              data[i] = Math.min(255, data[i] + Math.floor(Math.random() * 2) - 1);
            }
          }
          this.getContext('2d').putImageData(imageData, 0, 0);
          return toBlob.call(this, callback, type, quality);
        };
        
        HTMLCanvasElement.prototype.toDataURL = function(type, quality) {
          const imageData = this.getContext('2d').getImageData(0, 0, this.width, this.height);
          const data = imageData.data;
          for (let i = 0; i < data.length; i += 4) {
            if (Math.random() < 0.01) {
              data[i] = Math.min(255, data[i] + Math.floor(Math.random() * 2) - 1);
            }
          }
          this.getContext('2d').putImageData(imageData, 0, 0);
          return toDataURL.call(this, type, quality);
        };
        
        // Randomize audio fingerprint
        const audioContext = window.AudioContext || window.webkitAudioContext;
        if (audioContext) {
          const originalCreateAnalyser = audioContext.prototype.createAnalyser;
          audioContext.prototype.createAnalyser = function() {
            const analyser = originalCreateAnalyser.call(this);
            const originalGetByteFrequencyData = analyser.getByteFrequencyData;
            analyser.getByteFrequencyData = function(array) {
              originalGetByteFrequencyData.call(this, array);
              // Add minimal noise
              for (let i = 0; i < array.length; i++) {
                if (Math.random() < 0.05) {
                  array[i] = Math.min(255, array[i] + Math.floor(Math.random() * 3) - 1);
                }
              }
            };
            return analyser;
          };
        }
        
        // Spoof WebGL fingerprint
        const getParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function(parameter) {
          if (parameter === this.VENDOR || parameter === this.RENDERER) {
            return 'Intel Inc. Intel Iris OpenGL Engine';
          }
          return getParameter.call(this, parameter);
        };
      })();
    `;

    webContents.executeJavaScript(canvasScript, true).catch(() => {});
  }

  /**
   * Block WebRTC leaks
   */
  blockWebRTC(webContents: WebContents): void {
    if (!webContents || webContents.isDestroyed()) return;

    const shields = this.getShieldsForUrl(webContents.getURL());
    if (!shields.config.webrtc) return;

    const webrtcScript = `
      (function() {
        const RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
        if (RTCPeerConnection) {
          const originalCreateDataChannel = RTCPeerConnection.prototype.createDataChannel;
          RTCPeerConnection.prototype.createDataChannel = function() {
            throw new Error('WebRTC is disabled');
          };
        }
      })();
    `;

    webContents.executeJavaScript(webrtcScript, true).catch(() => {});
  }

  /**
   * Get shields config for a URL
   */
  getShieldsForUrl(url: string): SiteShields {
    try {
      const hostname = new URL(url).hostname;
      
      // For video sites, disable aggressive blocking
      if (this.isVideoSite(url)) {
        const videoConfig: ShieldsConfig = {
          ads: false, // Don't block ads on video sites (breaks players)
          cookies: 'all', // Allow all cookies for video sites
          httpsOnly: false,
          fingerprinting: false, // Don't break video player fingerprint checks
          scripts: 'all', // Allow all scripts for video sites
          webrtc: false, // Don't block WebRTC (needed for video)
        };
        return {
          hostname,
          config: videoConfig,
          overrides: {},
        };
      }
      
      if (this.siteConfigs.has(hostname)) {
        const site = this.siteConfigs.get(hostname)!;
        return {
          ...site,
          config: { ...this.defaultConfig, ...site.config, ...site.overrides },
        };
      }

      return {
        hostname,
        config: { ...this.defaultConfig },
        overrides: {},
      };
    } catch {
      return {
        hostname: '',
        config: { ...this.defaultConfig },
        overrides: {},
      };
    }
  }

  /**
   * Set shields for a site
   */
  setSiteShields(hostname: string, overrides: Partial<ShieldsConfig>): void {
    const existing = this.siteConfigs.get(hostname);
    if (existing) {
      existing.overrides = { ...existing.overrides, ...overrides };
    } else {
      this.siteConfigs.set(hostname, {
        hostname,
        config: { ...this.defaultConfig },
        overrides,
      });
    }
    this.emit('config-changed', hostname);
  }

  /**
   * Update default config
   */
  updateDefaultConfig(config: Partial<ShieldsConfig>): void {
    this.defaultConfig = { ...this.defaultConfig, ...config };
    this.emit('config-changed', 'default');
  }

  /**
   * Get all site configs
   */
  getAllSiteConfigs(): SiteShields[] {
    return Array.from(this.siteConfigs.values());
  }
}

// Singleton
let shieldsService: ShieldsService | null = null;

export function getShieldsService(): ShieldsService {
  if (!shieldsService) {
    shieldsService = new ShieldsService();
  }
  return shieldsService;
}

