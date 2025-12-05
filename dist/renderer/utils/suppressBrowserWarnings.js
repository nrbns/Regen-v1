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
// Patterns for warnings to suppress - COMPREHENSIVE list
// User requested: no restrictions, suppress all warnings
const SUPPRESSED_PATTERNS = [
    // Tracking Prevention warnings (browser-native) - ALL variations
    /Tracking Prevention blocked/i,
    /blocked access to storage/i,
    /Tracking Prevention/i,
    /Tracking Prevention blocked access to storage for/i,
    /Tracking Prevention blocked access to storage for <URL>/i,
    // CSP violations (from third-party sites like Bing)
    /violates the following Content Security Policy directive/i,
    /Content Security Policy directive/i,
    /was blocked due to Content Security Policy/i,
    /javascript:.*violates.*Content Security Policy/i,
    /Running the JavaScript URL violates/i,
    /Content Security Policy directive 'script-src'/i,
    /CSP directive/i,
    /script-src.*strict-dynamic/i,
    /Content Security Policy blocks inline execution/i,
    /blocks inline execution of scripts and stylesheets/i,
    /Either the 'unsafe-inline' keyword/i,
    /a hash \('sha256-\.\.\.'\)/i,
    /or a nonce \('nonce-\.\.\.'\) is required/i,
    /'unsafe-hashes' keyword is present/i,
    /was blocked due to CSP/i,
    // CSP meta tag warnings (expected - some directives only work in HTTP headers)
    /frame-ancestors.*ignored.*meta element/i,
    /The Content Security Policy directive 'frame-ancestors' is ignored when delivered via a <meta> element/i,
    /Unrecognized Content-Security-Policy directive/i,
    /navigate-to.*is an invalid/i,
    // Iframe sandbox warnings (informational) - ALL variations including partial/truncated
    /An iframe which has both allow-scripts and allow-same-origin for its sandbox attribute can escape its sandboxing/i,
    /An iframe which has both allow-scripts and allow-same-origin/i,
    /iframe which has both allow-scripts and allow-same-origin/i,
    /iframe.*has.*both.*allow-scripts.*allow-same-origin/i,
    /allow-scripts.*allow-same-origin.*sandbox/i,
    /sandbox.*allow-scripts.*allow-same-origin/i,
    /iframe.*sandbox.*escape/i,
    /sandbox.*can escape/i,
    /can escape.*sandboxing/i,
    /escape.*sandboxing/i,
    /sandbox.*escape/i,
    // Catch partial/truncated messages
    /iframe.*allow-scripts.*allow-same-origin/i,
    /allow-scripts.*allow-same-origin/i,
    /Error while parsing the 'sandbox' attribute/i,
    /allow-storage-access.*is an invalid sandbox flag/i,
    // Network errors from third-party sites (expected - Bing anti-bot, etc.)
    /403.*Forbidden/i,
    /GET.*bing.*403/i,
    /POST.*bing.*403/i,
    /\.bing\.com.*403/i,
    /Forbidden.*bing/i,
    /bing\.com.*403/i,
    /Failed to load resource.*403/i,
    /the server responded with a status of 403/i,
    /the server responded with a status of 404/i,
    // Origin header errors (expected in some contexts)
    /missing Origin header/i,
    /Uncaught.*missing Origin header/i,
    /Uncaught \(in promise\) missing Origin header/i,
    // MeiliSearch errors (optional service)
    /401.*Unauthorized.*meili/i,
    /MeiliSearch.*Error/i,
    /\[MeiliSearch\].*Error/i,
    /\[MeiliIndexer\].*Failed/i,
    /missing_authorization_header/i,
    /Authorization header is missing/i,
    /GET.*\/indexes.*401/i,
    /POST.*\/indexes.*401/i,
    /MeiliSearch.*401/i,
    // Tab errors
    /Tab not found.*local-/i,
    /Tab not found.*system-/i,
    /\[TABS\].*Tab not found/i,
    // Form field warnings (accessibility)
    /form field element should have an id or name attribute/i,
    /form field.*id or name/i,
    /A form field element should have an id or name attribute/i,
    // Quirks Mode warnings
    /Quirks Mode/i,
    /Page layout may be unexpected due to Quirks Mode/i,
    /unexpected due to Quirks Mode/i,
];
let originalWarn;
let originalError;
let originalLog;
let isSuppressing = false;
/**
 * Check if a message should be suppressed
 * Handles multiple formats: strings, objects, arrays, etc.
 */
function shouldSuppress(message) {
    if (!message)
        return false;
    // Convert message to string - handle all possible formats
    let messageStr = '';
    if (typeof message === 'string') {
        messageStr = message;
    }
    else if (message?.message) {
        messageStr = String(message.message);
    }
    else if (message?.error) {
        messageStr = String(message.error);
    }
    else if (Array.isArray(message)) {
        messageStr = message.map(m => String(m)).join(' ');
    }
    else if (typeof message === 'object') {
        messageStr = JSON.stringify(message);
    }
    else {
        messageStr = String(message);
    }
    // Check against all suppression patterns
    return SUPPRESSED_PATTERNS.some(pattern => {
        try {
            return pattern.test(messageStr);
        }
        catch {
            return false;
        }
    });
}
/**
 * Initialize console warning suppression
 * Should be called early in the application lifecycle
 *
 * Note: This only suppresses warnings we can intercept. Browser-native warnings
 * (like "Tracking Prevention") are logged directly by the browser and cannot
 * be fully suppressed.
 */
export function suppressBrowserWarnings() {
    if (isSuppressing)
        return;
    isSuppressing = true;
    // Suppress console.warn - catch all message formats and check each argument
    originalWarn = console.warn;
    console.warn = (...args) => {
        // Check if any argument matches suppression patterns
        const shouldBlock = args.some(arg => shouldSuppress(arg)) || shouldSuppress(args.join(' '));
        if (shouldBlock) {
            // Suppress this warning silently
            return;
        }
        // Allow other warnings through
        originalWarn.apply(console, args);
    };
    // Suppress console.error for CSP violations
    originalError = console.error;
    console.error = (...args) => {
        // Check if any argument matches suppression patterns
        const shouldBlock = args.some(arg => shouldSuppress(arg)) || shouldSuppress(args.join(' '));
        if (shouldBlock) {
            // Suppress this error silently
            return;
        }
        // Allow other errors through
        originalError.apply(console, args);
    };
    // Also intercept console.log in case warnings are logged there
    originalLog = console.log;
    console.log = (...args) => {
        // Check if any argument matches suppression patterns
        const shouldBlock = args.some(arg => shouldSuppress(arg)) || shouldSuppress(args.join(' '));
        if (shouldBlock) {
            // Suppress this log silently
            return;
        }
        // Allow other logs through
        originalLog.apply(console, args);
    };
    // Intercept uncaught errors that might be CSP violations
    const errorListener = (event) => {
        const message = event.message || event.filename || '';
        const errorString = `${message} ${event.filename || ''} ${event.lineno || ''}`;
        if (shouldSuppress(errorString) || shouldSuppress(message)) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            // Don't log this error
            return false;
        }
        return true;
    };
    window.addEventListener('error', errorListener, true);
    // Also listen for console messages at a lower level (for browser-native warnings)
    const originalConsoleWarn = console.warn;
    const originalConsoleError = console.error;
    // Create a proxy for console that filters messages before they're logged
    // This catches messages that might bypass our direct overrides
    const _consoleProxy = new Proxy(console, {
        get(target, prop) {
            if (prop === 'warn') {
                return function (...args) {
                    if (!args.some(arg => shouldSuppress(arg)) && !shouldSuppress(args.join(' '))) {
                        originalConsoleWarn.apply(target, args);
                    }
                };
            }
            if (prop === 'error') {
                return function (...args) {
                    if (!args.some(arg => shouldSuppress(arg)) && !shouldSuppress(args.join(' '))) {
                        originalConsoleError.apply(target, args);
                    }
                };
            }
            return target[prop];
        },
    });
    // Note: We can't replace the global console, but our overrides above should catch most cases
    // Intercept unhandled promise rejections
    const rejectionListener = (event) => {
        const reason = event.reason?.message || String(event.reason || '');
        if (shouldSuppress(reason)) {
            event.preventDefault();
            return;
        }
    };
    window.addEventListener('unhandledrejection', rejectionListener);
    // Note: Warnings from inside cross-origin iframes (like Bing) cannot be fully suppressed
    // due to browser security restrictions. The browser logs these warnings directly from
    // within the iframe's security context, which we cannot access.
}
/**
 * Restore original console methods
 */
export function restoreConsoleWarnings() {
    if (!isSuppressing)
        return;
    if (originalWarn) {
        console.warn = originalWarn;
    }
    if (originalError) {
        console.error = originalError;
    }
    isSuppressing = false;
}
/**
 * Suppress warnings for specific iframe errors
 */
export function suppressIframeErrors(iframe) {
    const errorHandler = (event) => {
        const message = event.message || '';
        if (shouldSuppress(message)) {
            event.preventDefault();
            event.stopPropagation();
        }
    };
    const warnHandler = () => {
        // Attempt to suppress warnings from iframe content
        try {
            const iframeWindow = iframe.contentWindow;
            if (iframeWindow) {
                const originalWarn = iframeWindow.console?.warn;
                if (originalWarn && iframeWindow.console) {
                    iframeWindow.console.warn = (...args) => {
                        const message = args[0];
                        if (typeof message === 'string' && !shouldSuppress(message)) {
                            originalWarn.apply(iframeWindow.console, args);
                        }
                    };
                }
            }
        }
        catch {
            // Cross-origin restrictions - can't access iframe console
        }
    };
    window.addEventListener('error', errorHandler);
    // Try to suppress iframe console warnings (may not work due to cross-origin)
    warnHandler();
    return () => {
        window.removeEventListener('error', errorHandler);
    };
}
