/**
 * Privacy Auto-Toggle - Automatically switch to Private mode on sensitive sites
 *
 * Uses Redix threat scanning to detect sensitive content and auto-enable privacy
 */
export interface PrivacyAutoToggleConfig {
    enabled: boolean;
    sensitivityThreshold: number;
    autoPrivate: boolean;
    autoGhost: boolean;
}
/**
 * Check if a URL is sensitive based on domain and content patterns
 */
export declare function checkSensitivity(url: string): Promise<{
    isSensitive: boolean;
    score: number;
    reasons: string[];
}>;
/**
 * Auto-enable privacy mode for sensitive sites
 */
export declare function autoTogglePrivacy(url: string, currentMode: 'Normal' | 'Private' | 'Ghost'): Promise<'Normal' | 'Private' | 'Ghost' | null>;
/**
 * Update auto-toggle configuration
 */
export declare function updateConfig(config: Partial<PrivacyAutoToggleConfig>): void;
/**
 * Get current configuration
 */
export declare function getConfig(): PrivacyAutoToggleConfig;
