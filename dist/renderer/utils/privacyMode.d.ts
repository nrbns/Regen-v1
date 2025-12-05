/**
 * Privacy Mode Utilities
 * Applies privacy settings to iframes and the application
 */
/**
 * Get privacy-enhanced iframe sandbox attributes
 */
export declare function getPrivacySandboxAttributes(privacyMode: boolean): string;
/**
 * Get privacy-enhanced iframe referrer policy
 */
export declare function getPrivacyReferrerPolicy(privacyMode: boolean): ReferrerPolicy;
/**
 * Apply privacy mode to an iframe element
 */
export declare function applyPrivacyModeToIframe(iframe: HTMLIFrameElement, privacyMode: boolean): void;
/**
 * Check if privacy mode is enabled
 */
export declare function isPrivacyModeEnabled(): boolean;
/**
 * Block third-party requests (client-side helper)
 * This would need to be implemented via Tauri backend or service worker
 */
export declare function shouldBlockRequest(url: string, privacyMode: boolean): boolean;
