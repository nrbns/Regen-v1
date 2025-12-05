/**
 * Suppress Browser-Native Console Warnings
 *
 * Filters out expected browser security warnings that we can't control:
 * - Tracking Prevention warnings
 * - CSP violations from third-party sites (e.g., Bing's CSP)
 * - Iframe sandbox warnings (informational)
 * - Network errors from third-party sites (e.g., Bing 403 errors)
 *
 * Note: Browser-native warnings logged directly by the browser (e.g., "Tracking Prevention")
 * or from inside cross-origin iframes cannot be fully suppressed due to security restrictions.
 * This utility suppresses what we can intercept from our own code.
 */
/**
 * Initialize console warning suppression
 * Should be called early in the application lifecycle
 *
 * Note: This only suppresses warnings we can intercept. Browser-native warnings
 * (like "Tracking Prevention") are logged directly by the browser and cannot
 * be fully suppressed.
 */
export declare function suppressBrowserWarnings(): void;
/**
 * Restore original console methods
 */
export declare function restoreConsoleWarnings(): void;
/**
 * Suppress warnings for specific iframe errors
 */
export declare function suppressIframeErrors(iframe: HTMLIFrameElement): () => void;
