/**
 * Redix Universal Browser - Entry Point
 *
 * Ultra-lightweight browser for universal device compatibility.
 * - Vanilla JS (no React)
 * - DOM pooling for memory efficiency
 * - Device capability detection
 * - AI-rendered content (no iframes)
 * - WASM AI support (offline)
 *
 * Target: < 12KB bundle size, works on any device with a screen
 */
/**
 * Redix Browser Class
 */
export declare class RedixBrowser {
    private pool;
    private detector;
    private renderer;
    private ai;
    private capabilities;
    private features;
    constructor();
    /**
     * Navigate to a URL
     */
    navigate(url: string, container: HTMLElement): Promise<void>;
    /**
     * Validate URL
     */
    private isValidURL;
    /**
     * Show error message
     */
    private showError;
    /**
     * Get capabilities
     */
    getCapabilities(): import("../core/device-detector").DeviceCapabilities;
    /**
     * Get recommended features
     */
    getRecommendedFeatures(): {
        useWASMAI: boolean;
        useCloudAI: boolean;
        useDOMPooling: boolean;
        useServiceWorker: boolean;
        maxTabs: number;
        enableAnimations: boolean;
        enableWebGL: boolean;
    };
    /**
     * Get pool statistics
     */
    getPoolStats(): {
        poolSizes: {
            tabs: number;
            buttons: number;
            divs: number;
            spans: number;
            links: number;
        };
        totalPooled: number;
        tabsCreated: number;
        tabsReused: number;
        buttonsCreated: number;
        buttonsReused: number;
        divsCreated: number;
        divsReused: number;
    };
}
/**
 * Initialize Redix Browser
 */
export declare function initRedixBrowser(): RedixBrowser;
/**
 * Get Redix Browser instance
 */
export declare function getRedixBrowser(): RedixBrowser | null;
