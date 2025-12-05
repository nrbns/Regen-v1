/**
 * User-Friendly Error Messages
 * Converts technical errors into user-friendly messages
 */
export function getUserFriendlyError(error) {
    if (error instanceof Error) {
        const message = error.message.toLowerCase();
        // Network errors
        if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
            return 'Connection failed. Please check your internet connection and try again.';
        }
        if (message.includes('timeout')) {
            return 'Request timed out. The server may be slow or unavailable. Please try again.';
        }
        // Storage errors
        if (message.includes('quota') || message.includes('storage')) {
            return 'Storage is full. Please free up some space and try again.';
        }
        // Permission errors
        if (message.includes('permission') || message.includes('denied')) {
            return 'Permission denied. Please check your browser settings.';
        }
        // Search errors
        if (message.includes('search') || message.includes('meilisearch')) {
            return 'Search is temporarily unavailable. Using local search instead.';
        }
        // Agent errors
        if (message.includes('agent') || message.includes('automation')) {
            return 'Automation failed. Please check your automation script and try again.';
        }
        // Generic fallback
        return `Something went wrong: ${error.message}. Please try again or contact support if the problem persists.`;
    }
    if (typeof error === 'string') {
        return error;
    }
    return 'An unexpected error occurred. Please try again.';
}
/**
 * Get error category for better handling
 */
export function getErrorCategory(error) {
    if (error instanceof Error) {
        const message = error.message.toLowerCase();
        if (message.includes('network') || message.includes('fetch') || message.includes('connection') || message.includes('timeout')) {
            return 'network';
        }
        if (message.includes('quota') || message.includes('storage')) {
            return 'storage';
        }
        if (message.includes('permission') || message.includes('denied')) {
            return 'permission';
        }
        if (message.includes('search') || message.includes('meilisearch')) {
            return 'search';
        }
        if (message.includes('agent') || message.includes('automation')) {
            return 'agent';
        }
    }
    return 'unknown';
}
