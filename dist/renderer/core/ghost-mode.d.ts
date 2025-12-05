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
export declare class GhostMode {
    private config;
    private torDetector;
    private deviceDetector;
    constructor();
    /**
     * Activate Ghost Mode
     * Blocks tracking while maintaining functionality
     */
    private activateGhostMode;
    /**
     * Block tracking scripts and requests
     */
    private blockTracking;
    /**
     * Enable Ghost Mode manually
     */
    enable(): void;
    /**
     * Disable Ghost Mode
     */
    disable(): void;
    /**
     * Check if Ghost Mode is enabled
     */
    isEnabled(): boolean;
    /**
     * Get Ghost Mode configuration
     */
    getConfig(): GhostModeConfig;
    /**
     * Check if cloud APIs are allowed
     */
    canUseCloudAPI(): boolean;
    /**
     * Check if storage is allowed
     */
    canUseStorage(): boolean;
    /**
     * Check if scripts are allowed
     */
    canUseScripts(): boolean;
    /**
     * Get security status message
     */
    getSecurityStatus(): string;
}
/**
 * Get the global GhostMode instance
 */
export declare function getGhostMode(): GhostMode;
/**
 * Check if Ghost Mode is enabled
 */
export declare function isGhostModeEnabled(): boolean;
/**
 * Enable Ghost Mode
 */
export declare function enableGhostMode(): void;
/**
 * Disable Ghost Mode
 */
export declare function disableGhostMode(): void;
