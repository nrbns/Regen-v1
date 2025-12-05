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
export class TorDetector {
    cachedResult = null;
    /**
     * Detect if running inside Tor Browser
     */
    detectTorBrowser() {
        if (this.cachedResult) {
            return this.cachedResult;
        }
        const indicators = [];
        let confidence = 'low';
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
            if (confidence === 'low')
                confidence = 'medium';
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
            if (confidence === 'low')
                confidence = 'medium';
        }
        // Indicator 4: Timezone (Tor Browser may report UTC)
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (timezone === 'UTC' || timezone === 'Etc/UTC') {
            indicators.push('timezone_utc');
            if (confidence === 'low')
                confidence = 'medium';
        }
        // Indicator 5: WebGL fingerprint (Tor Browser modifies WebGL)
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') ||
                canvas.getContext('experimental-webgl');
            if (gl) {
                const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                if (debugInfo) {
                    const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
                    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
                    // Tor Browser may report generic values
                    if (vendor && renderer && (vendor.includes('Mesa') || renderer.includes('Mesa'))) {
                        indicators.push('webgl_fingerprint');
                        if (confidence === 'low')
                            confidence = 'medium';
                    }
                }
            }
        }
        catch {
            // WebGL not available
        }
        // Indicator 6: Check for Tor-specific APIs or properties
        // Tor Browser may expose certain properties
        if (window.tor || navigator.tor) {
            indicators.push('tor_api');
            confidence = 'high';
            isTorBrowser = true;
        }
        // Indicator 7: Check if we can reach Tor check service
        // This is async, so we'll do it separately
        this.checkTorService().then((isTorService) => {
            if (isTorService) {
                indicators.push('tor_service');
                if (confidence !== 'high')
                    confidence = 'high';
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
        const result = {
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
    async checkTorService() {
        try {
            // Try to check if we're using Tor (this would need to go through Tor proxy)
            // For now, we'll use a simple heuristic: if we can't detect normal browser features
            // In production, this would make a request through Tor to check.torproject.org
            return false; // Placeholder
        }
        catch {
            return false;
        }
    }
    /**
     * Check if Ghost Mode can be enabled
     */
    canEnableGhostMode() {
        const detection = this.detectTorBrowser();
        return detection.canEnableGhostMode;
    }
    /**
     * Get detection confidence
     */
    getConfidence() {
        return this.detectTorBrowser().confidence;
    }
    /**
     * Clear cached result (useful for testing or when environment changes)
     */
    clearCache() {
        this.cachedResult = null;
    }
}
// Singleton instance
let torDetectorInstance = null;
/**
 * Get the global TorDetector instance
 */
export function getTorDetector() {
    if (!torDetectorInstance) {
        torDetectorInstance = new TorDetector();
    }
    return torDetectorInstance;
}
/**
 * Quick Tor detection (convenience function)
 */
export function detectTorBrowser() {
    return getTorDetector().detectTorBrowser();
}
/**
 * Check if Ghost Mode can be enabled
 */
export function canEnableGhostMode() {
    return getTorDetector().canEnableGhostMode();
}
