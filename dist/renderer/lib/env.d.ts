export declare const getEnvVar: (key: string) => string | undefined;
export declare const isDevEnv: () => boolean;
export declare const isTauriRuntime: () => boolean;
export declare const isElectronRuntime: () => boolean;
/**
 * Check if running in pure web mode (not Electron, not Tauri)
 * This is the authoritative check for whether backend services are available
 */
export declare const isWebMode: () => boolean;
