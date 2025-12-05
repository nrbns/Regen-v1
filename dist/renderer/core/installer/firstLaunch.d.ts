/**
 * First Launch Detection and Setup
 * Checks if this is first launch and triggers installer if needed
 */
export interface FirstLaunchStatus {
    isFirstLaunch: boolean;
    needsSetup: boolean;
    ollamaInstalled: boolean;
    modelsInstalled: boolean;
}
/**
 * Check if this is the first launch
 */
export declare function isFirstLaunch(): boolean;
/**
 * Mark first launch as complete
 */
export declare function markFirstLaunchComplete(): void;
/**
 * Check if setup is complete
 */
export declare function isSetupComplete(): boolean;
/**
 * Mark setup as complete
 */
export declare function markSetupComplete(): void;
/**
 * Check current setup status
 */
export declare function checkSetupStatus(): Promise<FirstLaunchStatus>;
