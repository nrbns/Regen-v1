/**
 * Iframe Blocked Fallback Handler - PR: Fix tab switch null issues
 * Handles X-Frame-Options blocking by opening URL in main Tauri webview or external browser
 */
/**
 * Handle iframe blocked event - open URL in main webview or external browser
 */
export declare function handleIframeBlocked(tabId: string, url: string): Promise<void>;
/**
 * Setup global listener for iframe-blocked events
 */
export declare function setupIframeBlockedListener(): () => void;
