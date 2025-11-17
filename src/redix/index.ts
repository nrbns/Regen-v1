/**
 * Redix Universal Browser - Entry Point
 * 
 * Ultra-lightweight browser for universal device compatibility.
 * - Vanilla JS (no React)
 * - DOM pooling for memory efficiency
 * - Device capability detection
 * - AI-rendered content (no iframes)
 * - WASM AI support (offline)
 * 
 * Target: < 12KB bundle size, works on any device with a screen
 */

import { getRedixPool } from '../core/redix-pool';
import { getDeviceDetector, detectDeviceCapabilities } from '../core/device-detector';
import { getGhostMode, isGhostModeEnabled, enableGhostMode, disableGhostMode } from '../core/ghost-mode';
import { detectTorBrowser } from '../core/tor-detector';
import { RedixContentRenderer } from './renderer';
import { RedixAI } from './ai';

/**
 * Redix Browser Class
 */
export class RedixBrowser {
  private pool = getRedixPool();
  private detector = getDeviceDetector();
  private renderer: RedixContentRenderer;
  private ai: RedixAI;
  private capabilities = detectDeviceCapabilities();
  private features: ReturnType<typeof this.detector.getRecommendedFeatures>;

  constructor() {
    // Detect capabilities
    this.capabilities = this.detector.detectCapabilities();
    this.features = this.detector.getRecommendedFeatures(this.capabilities);
    
    // Detect Tor Browser and enable Ghost Mode
    const torDetection = detectTorBrowser();
    const ghostMode = getGhostMode();
    
    if (torDetection.isTorBrowser) {
      console.log('🔒 Tor Browser detected - enabling Ghost Mode');
      ghostMode.enable();
    }
    
    // Initialize AI (WASM or cloud based on capabilities and Ghost Mode)
    const isGhost = isGhostModeEnabled();
    this.ai = new RedixAI({
      useWASM: isGhost ? true : this.features.useWASMAI, // Force WASM in Ghost Mode
      useCloud: isGhost ? false : this.features.useCloudAI, // No cloud in Ghost Mode
    });
    
    // Initialize renderer
    this.renderer = new RedixContentRenderer(this.pool, this.ai);
    
    console.log('[Redix] Initialized with capabilities:', this.capabilities);
    console.log('[Redix] Recommended features:', this.features);
    console.log('[Redix] Ghost Mode:', isGhost ? 'ENABLED 🔒' : 'disabled');
    if (torDetection.isTorBrowser) {
      console.log('[Redix] Tor Browser detected - Maximum security active');
    }
  }

  /**
   * Navigate to a URL
   */
  async navigate(url: string, container: HTMLElement): Promise<void> {
    try {
      // Validate URL
      if (!this.isValidURL(url)) {
        throw new Error(`Invalid URL: ${url}`);
      }
      
      // Show loading state
      const loadingEl = this.pool.getDiv();
      loadingEl.className = 'redix-loading';
      loadingEl.textContent = 'Loading...';
      container.appendChild(loadingEl);
      
      // Render content (AI-processed, not iframe)
      await this.renderer.renderURL(url, container);
      
      // Remove loading
      if (loadingEl.parentNode) {
        loadingEl.parentNode.removeChild(loadingEl);
        this.pool.returnDiv(loadingEl);
      }
    } catch (error) {
      console.error('[Redix] Navigation failed:', error);
      this.showError(container, error instanceof Error ? error.message : 'Navigation failed');
    }
  }

  /**
   * Validate URL
   */
  private isValidURL(url: string): boolean {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }

  /**
   * Show error message
   */
  private showError(container: HTMLElement, message: string): void {
    const errorEl = this.pool.getDiv();
    errorEl.className = 'redix-error';
    errorEl.textContent = `Error: ${message}`;
    container.appendChild(errorEl);
  }

  /**
   * Get capabilities
   */
  getCapabilities() {
    return this.capabilities;
  }

  /**
   * Get recommended features
   */
  getRecommendedFeatures() {
    return this.features;
  }

  /**
   * Get pool statistics
   */
  getPoolStats() {
    return this.pool.getStats();
  }
}

// Initialize Redix Browser when DOM is ready
let redixBrowserInstance: RedixBrowser | null = null;

/**
 * Initialize Redix Browser
 */
export function initRedixBrowser(): RedixBrowser {
  if (!redixBrowserInstance) {
    redixBrowserInstance = new RedixBrowser();
  }
  return redixBrowserInstance;
}

/**
 * Get Redix Browser instance
 */
export function getRedixBrowser(): RedixBrowser | null {
  return redixBrowserInstance;
}

// Auto-initialize if running in browser
if (typeof window !== 'undefined') {
  initRedixBrowser();
}

// Export for global use
if (typeof window !== 'undefined') {
  (window as any).Redix = {
    init: initRedixBrowser,
    getBrowser: getRedixBrowser,
    getPool: () => getRedixPool(),
    getDetector: () => getDeviceDetector(),
    getGhostMode: () => getGhostMode(),
    enableGhostMode: () => enableGhostMode(),
    disableGhostMode: () => disableGhostMode(),
    isGhostModeEnabled: () => isGhostModeEnabled(),
  };
}

