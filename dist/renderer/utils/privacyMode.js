/**
 * Privacy Mode Utilities
 * Applies privacy settings to iframes and the application
 */
import { useSettingsStore } from '../state/settingsStore';
/**
 * Get privacy-enhanced iframe sandbox attributes
 */
export function getPrivacySandboxAttributes(privacyMode) {
    const base = 'allow-scripts allow-same-origin allow-forms allow-popups allow-modals';
    if (privacyMode) {
        // In privacy mode, restrict more permissions
        return 'allow-scripts allow-forms allow-popups';
    }
    return base;
}
/**
 * Get privacy-enhanced iframe referrer policy
 */
export function getPrivacyReferrerPolicy(privacyMode) {
    if (privacyMode) {
        return 'no-referrer';
    }
    return 'no-referrer-when-downgrade';
}
/**
 * Apply privacy mode to an iframe element
 */
export function applyPrivacyModeToIframe(iframe, privacyMode) {
    if (!iframe)
        return;
    // Update sandbox attributes
    if (privacyMode) {
        iframe.setAttribute('sandbox', getPrivacySandboxAttributes(true));
        iframe.setAttribute('referrerpolicy', 'no-referrer');
    }
    else {
        iframe.setAttribute('sandbox', getPrivacySandboxAttributes(false));
        iframe.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
    }
    // Note: Third-party cookie blocking and tracker blocking would need to be
    // implemented at the browser/engine level (Tauri backend) or via content scripts
    // This is a client-side helper that sets iframe attributes
}
/**
 * Check if privacy mode is enabled
 */
export function isPrivacyModeEnabled() {
    const store = useSettingsStore.getState();
    return store.privacy.trackerProtection && store.privacy.adBlockEnabled;
}
/**
 * Block third-party requests (client-side helper)
 * This would need to be implemented via Tauri backend or service worker
 */
export function shouldBlockRequest(url, privacyMode) {
    if (!privacyMode)
        return false;
    // Simple heuristic: block known tracker domains
    const trackerPatterns = [
        /doubleclick\.net/i,
        /google-analytics\.com/i,
        /googletagmanager\.com/i,
        /facebook\.net/i,
        /facebook\.com\/tr/i,
        /analytics\./i,
        /tracking\./i,
        /adservice\./i,
    ];
    return trackerPatterns.some(pattern => pattern.test(url));
}
