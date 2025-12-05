/**
 * Extensions API
 * Provides window.regenExtensions for Chrome-compatible extension registration
 * Preload hook for Chrome compatibility
 */
export interface RegenExtension {
    id: string;
    name?: string;
    version?: string;
    activate?: () => void | Promise<void>;
    deactivate?: () => void | Promise<void>;
    provide?: Record<string, unknown>;
}
/**
 * Initialize Extensions API on window object
 * Provides Chrome-compatible extension registration
 */
export declare function initExtensionsAPI(): void;
/**
 * Preload hook for Chrome compatibility
 * Allows extensions to register early
 */
export declare function setupPreloadHook(): void;
