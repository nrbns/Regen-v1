import { jsx as _jsx } from "react/jsx-runtime";
/**
 * TabIframeManager - PR: Fix tab switch null issues in Tauri
 * Implements iframe-per-tab pattern: all iframes stay mounted, visibility toggled via CSS
 * This preserves page state and prevents null refs when switching tabs
 */
import { useRef, useEffect } from 'react';
import { useTabsStore } from '../../state/tabsStore';
import { SAFE_IFRAME_SANDBOX } from '../../config/security';
import { isElectronRuntime } from '../../lib/env';
import { normalizeInputToUrlOrSearch } from '../../lib/search';
import { useSettingsStore } from '../../state/settingsStore';
import { deriveTitleFromUrl } from '../../lib/ipc-typed';
import { applyPrivacyModeToIframe } from '../../utils/privacyMode';
import { getIframeManager, getViewRenderer, throttleViewUpdate } from '../../utils/gve-optimizer';
import { saveScrollPosition, restoreScrollPosition } from '../../core/tabs/hibernation';
import { ipcEvents } from '../../lib/ipc-events';
const INTERNAL_PROTOCOLS = ['ob://', 'about:', 'chrome://', 'edge://', 'app://', 'regen://'];
function isInternalUrl(url) {
    if (!url)
        return true;
    return INTERNAL_PROTOCOLS.some(prefix => url.startsWith(prefix));
}
/**
 * Get the actual URL to load in iframe for a tab
 */
function getTabIframeUrl(tab, language) {
    let url = tab.url;
    // For about:blank or empty URLs, return null (will show NewTabPage)
    if (!url || url === 'about:blank' || isInternalUrl(url)) {
        return null;
    }
    // If URL doesn't start with http/https, treat as search query
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        // Convert to search in user's language
        // Use DuckDuckGo (privacy-friendly) instead of Bing
        const searchUrl = normalizeInputToUrlOrSearch(url, 'duckduckgo', // Use DuckDuckGo - privacy-friendly and works well
        language !== 'auto' ? language : undefined, false // Don't force iframe-friendly - let real sites load
        );
        if (searchUrl) {
            return searchUrl;
        }
        // Fallback to DuckDuckGo search
        return `https://duckduckgo.com/?q=${encodeURIComponent(url)}`;
    }
    return url;
}
export function TabIframeManager({ tabs, activeTabId }) {
    const language = useSettingsStore(state => state.language || 'auto');
    const privacySettings = useSettingsStore(state => state.privacy);
    const privacyMode = privacySettings.trackerProtection && privacySettings.adBlockEnabled;
    const isElectron = isElectronRuntime();
    // PR: Fix tab switch - use useRef map to store iframe refs (stable, doesn't cause re-renders)
    const iframeRefs = useRef(new Map());
    // GVE Optimization: Initialize iframe manager and renderer
    const iframeManager = useRef(getIframeManager());
    const _renderer = useRef(getViewRenderer());
    // PR: Fix tab switch - track which tabs have X-Frame-Options blocking
    const blockedTabs = useRef(new Set());
    // PR: Fix memory leaks - track observers and listeners for cleanup
    const observerRefs = useRef(new Map());
    const clickHandlerRefs = useRef(new Map());
    const navigationHandlerRefs = useRef(new Map());
    // PR: Fix tab switch - set iframe ref callback (stable function)
    const setIframeRef = (tabId) => (el) => {
        if (el) {
            iframeRefs.current.set(tabId, el);
            // GVE Optimization: Register iframe with optimizations
            if (!isElectron) {
                throttleViewUpdate(() => {
                    iframeManager.current.registerIframe(tabId, el, {
                        lazy: true,
                        sandbox: privacyMode
                            ? ['allow-scripts', 'allow-forms', 'allow-popups']
                            : SAFE_IFRAME_SANDBOX.split(' '),
                        allow: 'fullscreen; autoplay; camera; microphone; geolocation; payment; clipboard-read; clipboard-write; display-capture; storage-access',
                    });
                });
            }
        }
        else {
            iframeRefs.current.delete(tabId);
            // GVE Optimization: Unregister iframe
            if (!isElectron) {
                iframeManager.current.unregisterIframe(tabId);
            }
        }
    };
    // PR: Fix navigation - Update iframe src when tab URL changes programmatically
    useEffect(() => {
        if (isElectron)
            return;
        tabs.forEach(tab => {
            const iframe = iframeRefs.current.get(tab.id);
            if (!iframe)
                return;
            const iframeUrl = getTabIframeUrl(tab, language);
            const currentSrc = iframe.src;
            // Update iframe src if tab URL changed (e.g., from address bar)
            if (iframeUrl && iframeUrl !== currentSrc && iframeUrl !== 'about:blank') {
                // Only update if this is the active tab or if src is about:blank
                const isActive = tab.id === activeTabId;
                if (isActive || currentSrc === 'about:blank') {
                    // Updating iframe src from tab URL change - no logging needed for performance
                    iframe.src = iframeUrl;
                }
            }
        });
    }, [tabs, language, activeTabId, isElectron]);
    // PR: Fix tab switch - detect X-Frame-Options blocking
    useEffect(() => {
        if (isElectron)
            return; // Electron uses BrowserView, not iframes
        const checkBlockedFrames = () => {
            tabs.forEach(tab => {
                const iframe = iframeRefs.current.get(tab.id);
                if (!iframe)
                    return;
                // Check if iframe is blocked (X-Frame-Options)
                // If contentWindow is null or we can't access contentDocument, it's likely blocked
                try {
                    // Try to access contentWindow - will throw for cross-origin if blocked
                    const hasContent = iframe.contentWindow !== null;
                    // Check if we can access contentDocument (same-origin only)
                    // For cross-origin, this will be null even if not blocked
                    // So we use a timeout-based heuristic: if iframe loads but contentWindow is null, it's blocked
                    if (!hasContent && iframe.src && !iframe.src.startsWith('about:')) {
                        // Set a timeout to check if content loaded
                        setTimeout(() => {
                            try {
                                // If still no contentWindow after load, likely blocked
                                if (!iframe.contentWindow && iframe.src) {
                                    console.warn('[TabIframeManager] Detected X-Frame-Options blocking for tab', tab.id, tab.url);
                                    blockedTabs.current.add(tab.id);
                                    // Emit event for fallback handling
                                    window.dispatchEvent(new CustomEvent('iframe-blocked', {
                                        detail: { tabId: tab.id, url: tab.url },
                                    }));
                                }
                            }
                            catch {
                                // Cross-origin access denied is expected, not a block
                            }
                        }, 2000);
                    }
                    else {
                        // Iframe has content, remove from blocked set
                        blockedTabs.current.delete(tab.id);
                    }
                }
                catch {
                    // Cross-origin access denied - this is normal, not a block
                }
            });
        };
        // Check periodically for blocked frames
        const interval = setInterval(checkBlockedFrames, 1000);
        // Cleanup function
        return () => {
            clearInterval(interval);
            // GVE Optimization: Cleanup iframe manager
            if (!isElectron) {
                iframeRefs.current.forEach((_iframe, tabId) => {
                    iframeManager.current.unregisterIframe(tabId);
                });
            }
            // Cleanup all iframe event listeners and observers
            iframeRefs.current.forEach((iframe, tabId) => {
                // Phase 1, Day 2: Save scroll position before cleanup (if tab is being hibernated)
                const tab = tabs.find(t => t.id === tabId);
                if (tab?.sleeping) {
                    saveScrollPosition(tabId, iframe);
                }
                // Cleanup stored cleanup function
                if (iframe._cleanup) {
                    iframe._cleanup();
                    delete iframe._cleanup;
                }
                // Cleanup MutationObserver
                const observer = observerRefs.current.get(tabId);
                if (observer) {
                    observer.disconnect();
                    observerRefs.current.delete(tabId);
                }
                // Cleanup click handlers
                const clickHandler = clickHandlerRefs.current.get(tabId);
                if (clickHandler && iframe.contentDocument) {
                    try {
                        iframe.contentDocument.removeEventListener('click', clickHandler, true);
                    }
                    catch {
                        // Cross-origin - ignore
                    }
                    clickHandlerRefs.current.delete(tabId);
                }
                // Cleanup navigation handlers
                const navHandler = navigationHandlerRefs.current.get(tabId);
                if (navHandler && iframe.contentWindow) {
                    try {
                        iframe.contentWindow.removeEventListener('popstate', navHandler);
                        iframe.contentWindow.removeEventListener('hashchange', navHandler);
                    }
                    catch {
                        // Cross-origin - ignore
                    }
                    navigationHandlerRefs.current.delete(tabId);
                }
            });
        };
    }, [tabs, isElectron]);
    // PR: Fix tab switch - render all iframes, toggle visibility with CSS
    // Never unmount iframes - this preserves page state
    return (_jsx("div", { className: "relative h-full w-full", children: tabs.map(tab => {
            const iframeUrl = getTabIframeUrl(tab, language);
            const isActive = tab.id === activeTabId;
            const _isBlocked = blockedTabs.current.has(tab.id);
            // PR: Fix tab switch - always render iframe, toggle visibility
            // Use stable key based on tab.id (not URL) to prevent React from recreating
            // PR: Fix navigation - Update iframe src only when URL actually changes
            const currentIframeUrl = iframeUrl || 'about:blank';
            const iframe = iframeRefs.current.get(tab.id);
            const needsSrcUpdate = iframe && iframe.src !== currentIframeUrl && currentIframeUrl !== 'about:blank';
            // Update src if needed (for initial load or programmatic navigation)
            // Only update when tab is active to prevent unnecessary reloads
            if (needsSrcUpdate && isActive) {
                console.log('[TabIframeManager] Updating iframe src', {
                    tabId: tab.id,
                    oldSrc: iframe.src,
                    newSrc: currentIframeUrl,
                    isActive,
                });
                // Use requestAnimationFrame to ensure DOM is ready
                requestAnimationFrame(() => {
                    const currentIframe = iframeRefs.current.get(tab.id);
                    if (currentIframe && tab.id === activeTabId) {
                        currentIframe.src = currentIframeUrl;
                    }
                });
            }
            return (_jsx("iframe", { ref: el => {
                    setIframeRef(tab.id)(el);
                    // Apply privacy mode when iframe is created
                    if (el && privacyMode) {
                        applyPrivacyModeToIframe(el, privacyMode);
                    }
                    // GVE Optimization: Apply performance optimizations
                    if (el && !isElectron) {
                        el.style.contentVisibility = isActive ? 'auto' : 'hidden';
                        el.style.contain = 'layout style paint';
                        el.setAttribute('fetchpriority', isActive ? 'high' : 'low');
                    }
                }, src: currentIframeUrl, title: tab.title ?? 'Tab content', "data-tab-id": tab.id, sandbox: privacyMode ? 'allow-scripts allow-forms allow-popups' : SAFE_IFRAME_SANDBOX, allow: "fullscreen; autoplay; camera; microphone; geolocation; payment; clipboard-read; clipboard-write; display-capture; storage-access", referrerPolicy: privacyMode ? 'no-referrer' : 'no-referrer-when-downgrade', loading: isActive ? 'eager' : 'lazy', className: "absolute inset-0 h-full w-full border-0", style: {
                    // PR: Fix tab switch - toggle visibility with CSS, never unmount
                    // Show iframe if it's the active tab (regardless of iframeUrl to prevent flicker)
                    display: isActive ? 'block' : 'none',
                    pointerEvents: isActive ? 'auto' : 'none',
                    zIndex: isActive ? 1 : 0,
                    visibility: isActive ? 'visible' : 'hidden',
                    // GVE Optimization: Performance improvements
                    contentVisibility: isActive ? 'auto' : 'hidden',
                    contain: 'layout style paint',
                }, "aria-label": tab.title
                    ? `Content for ${tab.title}`
                    : iframeUrl
                        ? `External content for ${new URL(iframeUrl).hostname}`
                        : 'Tab content', "aria-live": "off", onLoad: () => {
                    const iframe = iframeRefs.current.get(tab.id);
                    if (!iframe)
                        return;
                    // Phase 1, Day 2: Restore scroll position after reload (hibernation recovery)
                    if (tab.sleeping === false) {
                        // Tab was just woken up, restore scroll position
                        restoreScrollPosition(tab.id, iframe);
                    }
                    // PR: Fix navigation - Track URL changes and update tab store + title
                    try {
                        const win = iframe.contentWindow;
                        const doc = iframe.contentDocument;
                        let currentUrl = null;
                        let currentTitle = null;
                        // Try to read URL and title (works for same-origin only)
                        try {
                            currentUrl = win?.location.href || null;
                            currentTitle = doc?.title || null;
                        }
                        catch {
                            // Cross-origin - can't read, but navigation still works
                            // Use iframe.src as fallback (may be stale for cross-origin navigation)
                            currentUrl = iframe.src || null;
                        }
                        console.log('[TabIframeManager] Iframe loaded', {
                            tabId: tab.id,
                            currentUrl,
                            currentTitle,
                            iframeSrc: iframe.src,
                            isActive,
                            wasSleeping: tab.sleeping,
                        });
                        // Update tab URL if it changed (navigation happened)
                        if (currentUrl && currentUrl !== tab.url && !currentUrl.startsWith('about:')) {
                            // URL changed, updating tab - no logging needed
                            // Update both URL and title
                            const updates = { url: currentUrl };
                            if (currentTitle) {
                                updates.title = currentTitle;
                            }
                            else {
                                // Cross-origin: derive title from URL
                                updates.title = deriveTitleFromUrl(currentUrl);
                            }
                            useTabsStore.getState().updateTab(tab.id, updates);
                        }
                        else if (currentTitle && currentTitle !== tab.title) {
                            // Title changed but URL didn't (e.g., page title update)
                            // Title changed, updating tab - no logging needed
                            useTabsStore.getState().updateTab(tab.id, { title: currentTitle });
                        }
                        else if (!currentTitle && currentUrl && currentUrl !== tab.url) {
                            // Cross-origin navigation: can't read title, derive from URL
                            const derivedTitle = deriveTitleFromUrl(currentUrl);
                            // Cross-origin navigation, deriving title from URL - no logging needed
                            useTabsStore
                                .getState()
                                .updateTab(tab.id, { url: currentUrl, title: derivedTitle });
                        }
                        // PR: Fix navigation - inject click interceptor and window.open override
                        // Only intercept popups, allow regular navigation
                        if (win && doc) {
                            // Injecting interceptors for tab - no logging needed
                            // Override window.open to intercept popups (but allow regular navigation)
                            const _originalOpen = win.open;
                            win.open = (url, target, _features) => {
                                console.log('[TabIframeManager] window.open intercepted', {
                                    url,
                                    target,
                                    tabId: tab.id,
                                });
                                if (url) {
                                    const urlStr = typeof url === 'string' ? url : url.toString();
                                    // Post message to parent to create new tab
                                    window.postMessage({ type: 'open-in-new-tab', url: urlStr, sourceTabId: tab.id }, '*' // In production, restrict to specific origin
                                    );
                                }
                                // Return null to prevent actual popup
                                return null;
                            };
                            // Intercept anchor clicks: handle target="_blank" for new tabs, track regular navigation
                            const clickHandler = (e) => {
                                const target = e.target;
                                const anchor = target.closest?.('a');
                                if (!anchor || !anchor.href)
                                    return;
                                // Handle target="_blank" - open in new tab
                                if (anchor.target === '_blank' || anchor.target === '_new') {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    // target="_blank" click intercepted - no logging needed
                                    // Post message to parent to create new tab
                                    window.postMessage({ type: 'open-in-new-tab', url: anchor.href, sourceTabId: tab.id }, '*' // In production, restrict to specific origin
                                    );
                                    return;
                                }
                                // PR: Fix navigation - Track regular link clicks to update tab URL immediately
                                // This helps with cross-origin navigation where we can't read location.href after navigation
                                if (anchor.href &&
                                    anchor.href !== tab.url &&
                                    !anchor.href.startsWith('about:')) {
                                    // Extract absolute URL (anchor.href is always absolute)
                                    const clickedUrl = anchor.href;
                                    console.log('[TabIframeManager] Link clicked, updating tab URL', {
                                        tabId: tab.id,
                                        clickedUrl,
                                        currentUrl: tab.url,
                                    });
                                    // Update tab URL immediately (navigation will happen in iframe)
                                    // This ensures tab title/URL update even if we can't read it after navigation
                                    // Derive title from URL for immediate feedback (will be updated on load if same-origin)
                                    const derivedTitle = deriveTitleFromUrl(clickedUrl);
                                    useTabsStore
                                        .getState()
                                        .updateTab(tab.id, { url: clickedUrl, title: derivedTitle });
                                    // Note: We don't preventDefault - let the iframe navigate normally
                                    // The iframe will navigate, and onLoad will try to read the final URL/title
                                }
                            };
                            // Store handler for cleanup
                            clickHandlerRefs.current.set(tab.id, clickHandler);
                            doc.addEventListener('click', clickHandler, true); // Use capture phase to catch early
                            // PR: Fix navigation - Listen for navigation events to update URL and title
                            // Track when iframe navigates (for same-tab navigation)
                            const handleNavigation = () => {
                                try {
                                    const newUrl = win.location.href;
                                    const newTitle = doc?.title || null;
                                    if (newUrl && newUrl !== tab.url && !newUrl.startsWith('about:')) {
                                        console.log('[TabIframeManager] Navigation detected, updating URL and title', {
                                            tabId: tab.id,
                                            newUrl,
                                            newTitle,
                                        });
                                        const updates = { url: newUrl };
                                        if (newTitle) {
                                            updates.title = newTitle;
                                        }
                                        useTabsStore.getState().updateTab(tab.id, updates);
                                    }
                                    else if (newTitle && newTitle !== tab.title) {
                                        // Title changed without URL change
                                        // Title updated - no logging needed
                                        useTabsStore.getState().updateTab(tab.id, { title: newTitle });
                                    }
                                }
                                catch {
                                    // Cross-origin - can't read location, but navigation will work
                                    // Navigation detected (cross-origin, URL tracking limited) - no logging needed
                                }
                            };
                            // Listen for popstate (back/forward) and hashchange
                            const popstateHandler = handleNavigation;
                            const hashchangeHandler = handleNavigation;
                            // Store handlers for cleanup
                            navigationHandlerRefs.current.set(tab.id, popstateHandler);
                            win.addEventListener('popstate', popstateHandler);
                            win.addEventListener('hashchange', hashchangeHandler);
                            // Cleanup function stored for later
                            const cleanup = () => {
                                try {
                                    win.removeEventListener('popstate', popstateHandler);
                                    win.removeEventListener('hashchange', hashchangeHandler);
                                    navigationHandlerRefs.current.delete(tab.id);
                                }
                                catch {
                                    // Cross-origin access - ignore
                                }
                            };
                            // Store cleanup for iframe unload
                            iframe._cleanup = cleanup;
                            // Phase 1, Day 1: Enhanced title tracking - Watch for title changes via MutationObserver
                            if (doc) {
                                const titleObserver = new MutationObserver(() => {
                                    try {
                                        const newTitle = doc.title;
                                        const currentTab = useTabsStore.getState().tabs.find(t => t.id === tab.id);
                                        if (newTitle && newTitle !== currentTab?.title) {
                                            // Title changed via MutationObserver - no logging needed
                                            useTabsStore.getState().updateTab(tab.id, { title: newTitle });
                                            // Emit event for URL bar sync
                                            ipcEvents.emit('tab-title-updated', { tabId: tab.id, title: newTitle });
                                        }
                                    }
                                    catch {
                                        // Cross-origin or other error
                                    }
                                });
                                // Observe title element changes
                                const titleElement = doc.querySelector('title');
                                if (titleElement) {
                                    titleObserver.observe(titleElement, {
                                        childList: true,
                                        subtree: true,
                                        characterData: true,
                                    });
                                    // Store observer for cleanup
                                    observerRefs.current.set(tab.id, titleObserver);
                                }
                                // Phase 1, Day 1: Also watch for URL changes in history API
                                // This catches pushState/replaceState navigation
                                const originalPushState = win.history.pushState;
                                const originalReplaceState = win.history.replaceState;
                                win.history.pushState = function (...args) {
                                    originalPushState.apply(win.history, args);
                                    setTimeout(() => {
                                        try {
                                            const newUrl = win.location.href;
                                            const newTitle = doc.title || '';
                                            if (newUrl !== tab.url || newTitle !== tab.title) {
                                                useTabsStore.getState().updateTab(tab.id, {
                                                    url: newUrl,
                                                    title: newTitle || tab.title
                                                });
                                                ipcEvents.emit('tab-navigated', { tabId: tab.id, url: newUrl });
                                            }
                                        }
                                        catch {
                                            // Cross-origin
                                        }
                                    }, 0);
                                };
                                win.history.replaceState = function (...args) {
                                    originalReplaceState.apply(win.history, args);
                                    setTimeout(() => {
                                        try {
                                            const newUrl = win.location.href;
                                            const newTitle = doc.title || '';
                                            if (newUrl !== tab.url || newTitle !== tab.title) {
                                                useTabsStore.getState().updateTab(tab.id, {
                                                    url: newUrl,
                                                    title: newTitle || tab.title
                                                });
                                                ipcEvents.emit('tab-navigated', { tabId: tab.id, url: newUrl });
                                            }
                                        }
                                        catch {
                                            // Cross-origin
                                        }
                                    }, 0);
                                };
                            }
                            // Interceptors installed for tab - no logging needed
                        }
                        else {
                            // Cannot access iframe contentWindow/contentDocument (cross-origin) - expected
                            // Cross-origin: navigation will still work, just can't track URL changes
                        }
                    }
                    catch {
                        // Cross-origin frames will throw - this is expected
                        // Could not inject interceptors (cross-origin expected) - no logging needed
                        // Navigation will still work in cross-origin iframes
                    }
                    // Check if blocked after load
                    try {
                        // Try to access contentWindow - will be null if blocked
                        if (!iframe.contentWindow && iframeUrl && !iframeUrl.startsWith('about:')) {
                            // X-Frame-Options detected on load - no logging needed
                            blockedTabs.current.add(tab.id);
                            window.dispatchEvent(new CustomEvent('iframe-blocked', {
                                detail: { tabId: tab.id, url: tab.url },
                            }));
                        }
                    }
                    catch {
                        // Cross-origin access denied is normal
                    }
                }, onError: e => {
                    console.warn('[TabIframeManager] Iframe error', {
                        tabId: tab.id,
                        url: iframeUrl,
                        error: e,
                    });
                    // Mark as blocked if error occurs
                    if (iframeUrl && !iframeUrl.startsWith('about:')) {
                        blockedTabs.current.add(tab.id);
                        window.dispatchEvent(new CustomEvent('iframe-blocked', {
                            detail: { tabId: tab.id, url: tab.url },
                        }));
                    }
                } }, tab.id));
        }) }));
}
