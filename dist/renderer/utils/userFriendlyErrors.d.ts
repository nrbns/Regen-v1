/**
 * User-Friendly Error Messages
 * Converts technical errors into user-friendly messages
 */
export declare function getUserFriendlyError(error: unknown): string;
/**
 * Get error category for better handling
 */
export declare function getErrorCategory(error: unknown): 'network' | 'storage' | 'permission' | 'search' | 'agent' | 'unknown';
