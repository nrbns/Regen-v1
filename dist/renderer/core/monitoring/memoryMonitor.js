/**
 * Memory Monitor
 * Tracks RAM usage and auto-unloads tabs when memory is low
 */
// Phase 1, Day 2: Improved memory thresholds for 4GB devices
const MEMORY_THRESHOLD = 0.75; // 75% of available memory (was 80%)
const MEMORY_CRITICAL = 0.9; // 90% - aggressive cleanup
const MEMORY_MAX_GB = 3.0; // Max 3GB (4GB devices: 75% of 4GB = 3GB)
const MEMORY_THRESHOLD_4GB = 3.0 * 1024 * 1024 * 1024; // 3GB in bytes (75% of 4GB)
const _VISION_DISABLE_THRESHOLD_GB = 6.0; // Auto-disable vision mode under 6GB RAM
const CHECK_INTERVAL = 5000; // Check every 5 seconds
let memoryCheckInterval = null;
/**
 * Get current memory usage
 */
export function getMemoryUsage() {
    if (typeof process === 'undefined' || !process.memoryUsage) {
        // Browser environment - use performance.memory if available
        if (typeof performance !== 'undefined' && performance.memory) {
            const mem = performance.memory;
            const total = mem.jsHeapSizeLimit || mem.totalJSHeapSize;
            const used = mem.usedJSHeapSize;
            return {
                heapUsed: used,
                heapTotal: total,
                external: 0,
                rss: used,
                percentage: total > 0 ? used / total : 0,
            };
        }
        return null;
    }
    const mem = process.memoryUsage();
    const total = mem.heapTotal + mem.external;
    const used = mem.heapUsed + mem.external;
    return {
        heapUsed: mem.heapUsed,
        heapTotal: mem.heapTotal,
        external: mem.external,
        rss: mem.rss,
        percentage: total > 0 ? used / total : 0,
    };
}
/**
 * Phase 1, Day 2: Check if memory is low (improved for 4GB devices)
 */
export function isMemoryLow() {
    const stats = getMemoryUsage();
    if (!stats)
        return false;
    // Check percentage threshold
    if (stats.percentage >= MEMORY_THRESHOLD) {
        return true;
    }
    // Check absolute memory for 4GB devices (3GB = 75% of 4GB)
    const rssGB = stats.rss / (1024 * 1024 * 1024);
    if (rssGB >= MEMORY_MAX_GB) {
        return true;
    }
    // Check heap size for 4GB devices
    if (stats.heapUsed >= MEMORY_THRESHOLD_4GB) {
        return true;
    }
    return false;
}
/**
 * Start memory monitoring
 */
export function startMemoryMonitoring(onLowMemory, onCritical) {
    if (memoryCheckInterval) {
        stopMemoryMonitoring();
    }
    memoryCheckInterval = setInterval(() => {
        const stats = getMemoryUsage();
        if (!stats)
            return;
        // Check absolute memory (RSS) for 4GB devices
        const rssGB = stats.rss / (1024 * 1024 * 1024);
        if (rssGB > MEMORY_MAX_GB || stats.percentage >= MEMORY_CRITICAL) {
            // Critical: >3GB RSS or >90% memory
            console.warn(`[MemoryMonitor] Critical memory: ${rssGB.toFixed(2)}GB (${(stats.percentage * 100).toFixed(1)}%)`);
            onCritical?.();
        }
        else if (stats.percentage >= MEMORY_THRESHOLD) {
            // Low: >80% memory
            console.warn(`[MemoryMonitor] Low memory: ${rssGB.toFixed(2)}GB (${(stats.percentage * 100).toFixed(1)}%)`);
            onLowMemory?.();
        }
    }, CHECK_INTERVAL);
}
/**
 * Stop memory monitoring
 */
export function stopMemoryMonitoring() {
    if (memoryCheckInterval) {
        clearInterval(memoryCheckInterval);
        memoryCheckInterval = null;
    }
}
/**
 * Unload inactive tabs to free memory
 */
export async function unloadInactiveTabs() {
    try {
        const { useTabsStore } = await import('../../state/tabsStore');
        const tabsState = useTabsStore.getState();
        const tabs = tabsState.tabs;
        const activeId = tabsState.activeId;
        // Find inactive tabs (not active, not pinned)
        const inactiveTabs = tabs.filter(tab => tab.id !== activeId && !tab.pinned && !tab.sleeping);
        if (inactiveTabs.length === 0)
            return 0;
        // Unload oldest inactive tabs (up to 3)
        const tabsToUnload = inactiveTabs
            .sort((a, b) => (a.lastActiveAt || 0) - (b.lastActiveAt || 0))
            .slice(0, 3);
        let unloadedCount = 0;
        for (const tab of tabsToUnload) {
            try {
                // Mark tab as sleeping (will be handled by tab suspension service)
                const { useTabsStore } = await import('../../state/tabsStore');
                useTabsStore.getState().updateTab(tab.id, { sleeping: true });
                unloadedCount++;
            }
            catch (error) {
                console.warn(`[MemoryMonitor] Failed to unload tab ${tab.id}:`, error);
            }
        }
        console.log(`[MemoryMonitor] Unloaded ${unloadedCount} tabs to free memory`);
        return unloadedCount;
    }
    catch (error) {
        console.error('[MemoryMonitor] Failed to unload tabs:', error);
        return 0;
    }
}
