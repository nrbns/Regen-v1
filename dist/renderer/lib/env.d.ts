/**
 * Environment Detection
 * Detects runtime environment (Tauri, Web, Electron, etc.)
 */
/**
 * Get environment variable (works in both Node and Vite)
 */
export declare const getEnvVar: (key: string) => string | undefined;
/**
 * Check if running in Tauri runtime
 */
export declare function isTauriRuntime(): boolean;
/**
 * Check if running in Electron
 */
export declare function isElectronRuntime(): boolean;
/**
 * Check if running in browser
 */
export declare function isBrowserRuntime(): boolean;
/**
 * Check if running in pure web mode (not Electron, not Tauri)
 * This is the authoritative check for whether backend services are available
 */
export declare function isWebMode(): boolean;
/**
 * Check if running in development mode
 */
export declare function isDevEnv(): boolean;
/**
 * Check if running in production mode
 */
export declare function isProductionEnv(): boolean;
/**
 * Get runtime type
 */
export declare function getRuntimeType(): 'tauri' | 'electron' | 'browser';
