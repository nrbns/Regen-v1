/**
 * RedixPool - DOM Element Pooling System
 *
 * Reuses DOM elements to reduce memory allocation and improve performance.
 * Critical for low-end devices and universal compatibility.
 *
 * Usage:
 *   const pool = new RedixPool();
 *   const tab = pool.getTab();
 *   // ... use tab
 *   pool.returnTab(tab);
 */
export declare class RedixPool {
    private tabPool;
    private buttonPool;
    private divPool;
    private spanPool;
    private linkPool;
    private maxPoolSize;
    private stats;
    /**
     * Get a tab element from the pool or create a new one
     */
    getTab(): HTMLElement;
    /**
     * Return a tab element to the pool
     */
    returnTab(tab: HTMLElement): void;
    /**
     * Get a button element from the pool or create a new one
     */
    getButton(): HTMLButtonElement;
    /**
     * Return a button element to the pool
     */
    returnButton(button: HTMLButtonElement): void;
    /**
     * Get a div element from the pool or create a new one
     */
    getDiv(): HTMLDivElement;
    /**
     * Return a div element to the pool
     */
    returnDiv(div: HTMLDivElement): void;
    /**
     * Get a span element from the pool or create a new one
     */
    getSpan(): HTMLSpanElement;
    /**
     * Return a span element to the pool
     */
    returnSpan(span: HTMLSpanElement): void;
    /**
     * Get a link element from the pool or create a new one
     */
    getLink(): HTMLAnchorElement;
    /**
     * Return a link element to the pool
     */
    returnLink(link: HTMLAnchorElement): void;
    /**
     * Clear all pools (useful for memory management)
     */
    clear(): void;
    /**
     * Get pool statistics
     */
    getStats(): {
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
    /**
     * Set maximum pool size
     */
    setMaxPoolSize(size: number): void;
}
/**
 * Get the global RedixPool instance
 */
export declare function getRedixPool(): RedixPool;
/**
 * Reset the global pool (useful for testing or memory cleanup)
 */
export declare function resetRedixPool(): void;
