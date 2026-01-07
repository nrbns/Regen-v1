/**
 * TorDetector - Tor Browser Detection for Ghost Mode
 * 
 * Detects when running inside Tor Browser and enables maximum security mode.
 * This is critical for the "Ghost Mode" feature.
 * 
 * Usage:
 *   const detector = new TorDetector();
 *   const isTor = detector.detectTorBrowser();
 *   if (isTor) {
 *     enableGhostMode();
 *   }
 */

export interface TorDetectionResult {
  isTorBrowser: boolean;
  confidence: 'high' | 'medium' | 'low';
  indicators: string[];
  canEnableGhostMode: boolean;
}

export class TorDetector {
  private cachedResult: TorDetectionResult | null = null;

  /**
   * Detect if running inside Tor Browser
   */
  detectTorBrowser(): TorDetectionResult {
    if (this.cachedResult) {
      return this.cachedResult;
    }

    const indicators: string[] = [];
    let confidence: 'high' | 'medium' | 'low' = 'low';
    let isTorBrowser = false;

    // Indicator 1: User Agent (high confidence)
    const ua = navigator.userAgent;
    if (ua.includes('TorBrowser') || ua.includes('Tor')) {
      indicators.push('user_agent');
      confidence = 'high';
      isTorBrowser = true;
    }

    // Indicator 2: Plugins (Tor Browser has no plugins)
    if (navigator.plugins.length === 0 && navigator.mimeTypes.length === 0) {
      indicators.push('no_plugins');
      if (confidence === 'low') confidence = 'medium';
      if (!isTorBrowser && indicators.length >= 2) {
        isTorBrowser = true;
      }
    }

    // Indicator 3: Screen dimensions (Tor Browser has fixed window size)
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;
    // Tor Browser typically opens at 1000x700 or similar fixed sizes
    if ((screenWidth === 1000 && screenHeight === 700) ||
        (screenWidth === 1000 && screenHeight === 740)) {
      indicators.push('screen_dimensions');
      if (confidence === 'low') confidence = 'medium';
    }

    // Indicator 4: Timezone (Tor Browser may report UTC)
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timezone === 'UTC' || timezone === 'Etc/UTC') {
      indicators.push('timezone_utc');
      if (confidence === 'low') confidence = 'medium';
    }

    // Indicator 5: WebGL fingerprint (Tor Browser modifies WebGL)
    try {
      const canvas = document.createElement('canvas');
      const gl =
        (canvas.getContext('webgl') as WebGLRenderingContext | null) ||
        (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          const vendor = gl.getParameter((debugInfo as any).UNMASKED_VENDOR_WEBGL);
          const renderer = gl.getParameter((debugInfo as any).UNMASKED_RENDERER_WEBGL);
          // Tor Browser may report generic values
          if (vendor && renderer && (vendor.includes('Mesa') || renderer.includes('Mesa'))) {
            indicators.push('webgl_fingerprint');
            if (confidence === 'low') confidence = 'medium';
          }
        }
      }
    } catch {
      // WebGL not available
    }

    // Indicator 6: Check for Tor-specific APIs or properties
    // Tor Browser may expose certain properties
    if ((window as any).tor || (navigator as any).tor) {
      indicators.push('tor_api');
      confidence = 'high';
      isTorBrowser = true;
    }

    // Indicator 7: Check if we can reach Tor check service
    // This is async, so we'll do it separately
    this.checkTorService().then((isTorService) => {
      if (isTorService) {
        indicators.push('tor_service');
        if (confidence !== 'high') confidence = 'high';
        isTorBrowser = true;
        // Update cached result
        this.cachedResult = {
          isTorBrowser: true,
          confidence: 'high',
          indicators: [...indicators],
          canEnableGhostMode: true,
        };
      }
    }).catch(() => {
      // Tor service check failed - not necessarily not Tor
    });

    // High confidence if user agent matches
    if (confidence === 'high') {
      isTorBrowser = true;
    }

    // Medium confidence with multiple indicators
    if (confidence === 'medium' && indicators.length >= 3) {
      isTorBrowser = true;
    }

    const result: TorDetectionResult = {
      isTorBrowser,
      confidence,
      indicators,
      canEnableGhostMode: isTorBrowser && confidence !== 'low',
    };

    this.cachedResult = result;
    return result;
  }

  /**
   * Check Tor service (async)
   */
  private async checkTorService(): Promise<boolean> {
    try {
      // Try to check if we're using Tor (this would need to go through Tor proxy)
      // For now, we'll use a simple heuristic: if we can't detect normal browser features
      // In production, this would make a request through Tor to check.torproject.org
      return false; // Placeholder
    } catch {
      return false;
    }
  }

  /**
   * Check if Ghost Mode can be enabled
   */
  canEnableGhostMode(): boolean {
    const detection = this.detectTorBrowser();
    return detection.canEnableGhostMode;
  }

  /**
   * Get detection confidence
   */
  getConfidence(): 'high' | 'medium' | 'low' {
    return this.detectTorBrowser().confidence;
  }

  /**
   * Clear cached result (useful for testing or when environment changes)
   */
  clearCache(): void {
    this.cachedResult = null;
  }
}

// Singleton instance
let torDetectorInstance: TorDetector | null = null;

/**
 * Get the global TorDetector instance
 */
export function getTorDetector(): TorDetector {
  if (!torDetectorInstance) {
    torDetectorInstance = new TorDetector();
  }
  return torDetectorInstance;
}

/**
 * Quick Tor detection (convenience function)
 */
export function detectTorBrowser(): TorDetectionResult {
  return getTorDetector().detectTorBrowser();
}

/**
 * Check if Ghost Mode can be enabled
 */
export function canEnableGhostMode(): boolean {
  return getTorDetector().canEnableGhostMode();
}

