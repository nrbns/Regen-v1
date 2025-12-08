/**
 * Environment Detection
 * Detects runtime environment (Tauri, Web, Electron, etc.)
 */
/**
 * Get environment variable (works in both Node and Vite)
 */
export const getEnvVar = (key) => {
    if (typeof process !== 'undefined' && process?.env && process.env[key] !== undefined) {
        return process.env[key];
    }
    if (typeof import.meta !== 'undefined' &&
        import.meta.env &&
        import.meta.env[key] !== undefined) {
        return import.meta.env[key];
    }
    return undefined;
};
/**
 * Check if running in Tauri runtime
 */
export function isTauriRuntime() {
    if (typeof window === 'undefined')
        return false;
    return typeof window.__TAURI__ !== 'undefined';
}
/**
 * Check if running in Electron
 */
export function isElectronRuntime() {
    if (typeof window === 'undefined')
        return false;
    return typeof window.electron !== 'undefined' ||
        typeof window.require !== 'undefined';
}
/**
 * Check if running in browser
 */
export function isBrowserRuntime() {
    return typeof window !== 'undefined' &&
        !isTauriRuntime() &&
        !isElectronRuntime();
}
/**
 * Check if running in pure web mode (not Electron, not Tauri)
 * This is the authoritative check for whether backend services are available
 */
export function isWebMode() {
    if (typeof window === 'undefined') {
        return false; // SSR - assume not web mode
    }
    // Check for Electron runtime
    if (isElectronRuntime()) {
        return false;
    }
    // Check for Tauri runtime
    if (isTauriRuntime()) {
        return false;
    }
    // If neither Electron nor Tauri, we're in web mode
    return true;
}
/**
 * Check if running in development mode
 */
export function isDevEnv() {
    const nodeMode = getEnvVar('NODE_ENV');
    if (nodeMode) {
        return nodeMode === 'development';
    }
    const viteMode = getEnvVar('MODE');
    return viteMode === 'development';
}
/**
 * Check if running in production mode
 */
export function isProductionEnv() {
    return import.meta.env.PROD || process.env.NODE_ENV === 'production';
}
/**
 * Get runtime type
 */
export function getRuntimeType() {
    if (isTauriRuntime())
        return 'tauri';
    if (isElectronRuntime())
        return 'electron';
    return 'browser';
}
