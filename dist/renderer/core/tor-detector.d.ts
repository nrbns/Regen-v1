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
export declare class TorDetector {
    private cachedResult;
    /**
     * Detect if running inside Tor Browser
     */
    detectTorBrowser(): TorDetectionResult;
    /**
     * Check Tor service (async)
     */
    private checkTorService;
    /**
     * Check if Ghost Mode can be enabled
     */
    canEnableGhostMode(): boolean;
    /**
     * Get detection confidence
     */
    getConfidence(): 'high' | 'medium' | 'low';
    /**
     * Clear cached result (useful for testing or when environment changes)
     */
    clearCache(): void;
}
/**
 * Get the global TorDetector instance
 */
export declare function getTorDetector(): TorDetector;
/**
 * Quick Tor detection (convenience function)
 */
export declare function detectTorBrowser(): TorDetectionResult;
/**
 * Check if Ghost Mode can be enabled
 */
export declare function canEnableGhostMode(): boolean;
