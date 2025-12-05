/**
 * Layout Sync Utility - PR: Fix layout overlap issues
 * Keeps CSS variables in sync with actual component heights
 */
/**
 * Update bottom bar height CSS variable
 */
export function updateBottomBarHeight() {
    const bottomBar = document.getElementById('bottomBar');
    if (bottomBar) {
        const height = bottomBar.getBoundingClientRect().height;
        document.documentElement.style.setProperty('--bottom-bar-height', `${height}px`);
    }
    else {
        // Default fallback
        document.documentElement.style.setProperty('--bottom-bar-height', '80px');
    }
}
/**
 * Update topbar height CSS variable
 */
export function updateTopbarHeight() {
    const topbar = document.querySelector('[data-top-chrome]');
    if (topbar) {
        const height = topbar.getBoundingClientRect().height;
        document.documentElement.style.setProperty('--topbar-height', `${height}px`);
    }
    else {
        document.documentElement.style.setProperty('--topbar-height', '56px');
    }
}
/**
 * Update sidebar width CSS variable
 */
export function updateSidebarWidth() {
    const sidebar = document.querySelector('[data-sidebar]');
    if (sidebar) {
        const width = sidebar.getBoundingClientRect().width;
        document.documentElement.style.setProperty('--sidebar-width', `${width}px`);
    }
    else {
        document.documentElement.style.setProperty('--sidebar-width', '320px');
    }
}
/**
 * Initialize layout sync - call on mount
 */
export function initLayoutSync() {
    // Initial update
    updateBottomBarHeight();
    updateTopbarHeight();
    updateSidebarWidth();
    // Update on resize
    const handleResize = () => {
        updateBottomBarHeight();
        updateTopbarHeight();
        updateSidebarWidth();
    };
    window.addEventListener('resize', handleResize);
    // Use ResizeObserver for more accurate updates
    const bottomBar = document.getElementById('bottomBar');
    const resizeObserver = bottomBar
        ? new ResizeObserver(() => {
            updateBottomBarHeight();
        })
        : null;
    if (bottomBar && resizeObserver) {
        resizeObserver.observe(bottomBar);
    }
    // Cleanup
    return () => {
        window.removeEventListener('resize', handleResize);
        if (resizeObserver && bottomBar) {
            resizeObserver.unobserve(bottomBar);
        }
    };
}
