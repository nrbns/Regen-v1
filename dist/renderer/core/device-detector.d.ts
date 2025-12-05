/**
 * DeviceDetector - Capability Detection for Universal Compatibility
 *
 * Detects device capabilities to enable adaptive features:
 * - WASM support (for offline AI)
 * - WebGL support (for graphics)
 * - RAM estimation (for memory management)
 * - CPU cores (for performance optimization)
 * - Low-end device detection (for reduced features)
 *
 * Usage:
 *   const detector = new DeviceDetector();
 *   const caps = detector.detectCapabilities();
 *   if (caps.isLowEnd) {
 *     // Use reduced feature set
 *   }
 */
export interface DeviceCapabilities {
    hasWASM: boolean;
    hasWebGL: boolean;
    hasWebGL2: boolean;
    hasServiceWorker: boolean;
    hasIndexedDB: boolean;
    hasLocalStorage: boolean;
    ramEstimate: number;
    cpuCores: number;
    isLowEnd: boolean;
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
    userAgent: string;
    platform: string;
    screenWidth: number;
    screenHeight: number;
    pixelRatio: number;
    connectionType?: 'slow-2g' | '2g' | '3g' | '4g' | 'wifi' | 'ethernet' | 'unknown';
    batteryLevel?: number;
    isCharging?: boolean;
}
export declare class DeviceDetector {
    private cachedCapabilities;
    /**
     * Detect all device capabilities
     */
    detectCapabilities(): DeviceCapabilities;
    /**
     * Detect WebAssembly support
     */
    private detectWASM;
    /**
     * Detect WebGL support
     */
    private detectWebGL;
    /**
     * Detect WebGL2 support
     */
    private detectWebGL2;
    /**
     * Detect Service Worker support
     */
    private detectServiceWorker;
    /**
     * Detect IndexedDB support
     */
    private detectIndexedDB;
    /**
     * Detect LocalStorage support
     */
    private detectLocalStorage;
    /**
     * Estimate RAM (in GB)
     */
    private estimateRAM;
    /**
     * Detect CPU cores
     */
    private detectCPUCores;
    /**
     * Detect if device is low-end
     */
    private isLowEndDevice;
    /**
     * Detect mobile device
     */
    private detectMobile;
    /**
     * Detect tablet device
     */
    private detectTablet;
    /**
     * Detect desktop device
     */
    private detectDesktop;
    /**
     * Detect connection type
     */
    private detectConnectionType;
    /**
     * Get recommended feature set based on capabilities
     */
    getRecommendedFeatures(caps?: DeviceCapabilities): {
        useWASMAI: boolean;
        useCloudAI: boolean;
        useDOMPooling: boolean;
        useServiceWorker: boolean;
        maxTabs: number;
        enableAnimations: boolean;
        enableWebGL: boolean;
    };
    /**
     * Clear cached capabilities (useful for testing or when device state changes)
     */
    clearCache(): void;
}
/**
 * Get the global DeviceDetector instance
 */
export declare function getDeviceDetector(): DeviceDetector;
/**
 * Quick capability check (convenience function)
 */
export declare function detectDeviceCapabilities(): DeviceCapabilities;
/**
 * Check if device is low-end
 */
export declare function isLowEndDevice(): boolean;
