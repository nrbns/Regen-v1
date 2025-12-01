/**
 * TabIframeManager - PR: Fix tab switch null issues in Tauri
 * Implements iframe-per-tab pattern: all iframes stay mounted, visibility toggled via CSS
 * This preserves page state and prevents null refs when switching tabs
 */

import { useRef, useEffect, useMemo } from 'react';
import type { Tab } from '../../state/tabsStore';
import { useTabsStore } from '../../state/tabsStore';
import { SAFE_IFRAME_SANDBOX } from '../../config/security';
import { isElectronRuntime } from '../../lib/env';
import { normalizeInputToUrlOrSearch } from '../../lib/search';
import { useSettingsStore } from '../../state/settingsStore';
import { deriveTitleFromUrl } from '../../lib/ipc-typed';

interface TabIframeManagerProps {
  tabs: Tab[];
  activeTabId: string | null;
}

const INTERNAL_PROTOCOLS = ['ob://', 'about:', 'chrome://', 'edge://', 'app://', 'regen://'];

function isInternalUrl(url?: string | null): boolean {
  if (!url) return true;
  return INTERNAL_PROTOCOLS.some(prefix => url.startsWith(prefix));
}

/**
 * Get the actual URL to load in iframe for a tab
 */
function getTabIframeUrl(tab: Tab, language: string): string | null {
  let url = tab.url;

  // For about:blank or empty URLs, return null (will show NewTabPage)
  if (!url || url === 'about:blank' || isInternalUrl(url)) {
    return null;
  }

  // If URL doesn't start with http/https, treat as search query
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    // Convert to search in user's language
    // Use iframe-friendly search engine (Bing) to avoid X-Frame-Options blocking
    const searchUrl = normalizeInputToUrlOrSearch(
      url,
      'bing', // Use Bing as default - it allows iframe embedding
      language !== 'auto' ? language : undefined,
      true // prefer iframe-friendly
    );
    if (searchUrl) {
      return searchUrl;
    }
    // Fallback to Bing search (iframe-friendly)
    return `https://www.bing.com/search?q=${encodeURIComponent(url)}`;
  }

  return url;
}

export function TabIframeManager({ tabs, activeTabId }: TabIframeManagerProps) {
  const language = useSettingsStore(state => state.language || 'auto');
  const isElectron = isElectronRuntime();

  // PR: Fix tab switch - use useRef map to store iframe refs (stable, doesn't cause re-renders)
  const iframeRefs = useRef<Map<string, HTMLIFrameElement>>(new Map());

  // PR: Fix tab switch - track which tabs have X-Frame-Options blocking
  const blockedTabs = useRef<Set<string>>(new Set());

  // PR: Fix tab switch - set iframe ref callback (stable function)
  const setIframeRef = (tabId: string) => (el: HTMLIFrameElement | null) => {
    if (el) {
      iframeRefs.current.set(tabId, el);
    } else {
      iframeRefs.current.delete(tabId);
    }
  };

  // PR: Fix navigation - Update iframe src when tab URL changes programmatically
  useEffect(() => {
    if (isElectron) return;

    tabs.forEach(tab => {
      const iframe = iframeRefs.current.get(tab.id);
      if (!iframe) return;

      const iframeUrl = getTabIframeUrl(tab, language);
      const currentSrc = iframe.src;

      // Update iframe src if tab URL changed (e.g., from address bar)
      if (iframeUrl && iframeUrl !== currentSrc && iframeUrl !== 'about:blank') {
        // Only update if this is the active tab or if src is about:blank
        const isActive = tab.id === activeTabId;
        if (isActive || currentSrc === 'about:blank') {
          console.log('[TabIframeManager] Updating iframe src from tab URL change', {
            tabId: tab.id,
            oldSrc: currentSrc,
            newSrc: iframeUrl,
            isActive,
          });
          iframe.src = iframeUrl;
        }
      }
    });
  }, [tabs, language, activeTabId, isElectron]);

  // PR: Fix tab switch - detect X-Frame-Options blocking
  useEffect(() => {
    if (isElectron) return; // Electron uses BrowserView, not iframes

    const checkBlockedFrames = () => {
      tabs.forEach(tab => {
        const iframe = iframeRefs.current.get(tab.id);
        if (!iframe) return;

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
                  console.warn(
                    '[TabIframeManager] Detected X-Frame-Options blocking for tab',
                    tab.id,
                    tab.url
                  );
                  blockedTabs.current.add(tab.id);

                  // Emit event for fallback handling
                  window.dispatchEvent(
                    new CustomEvent('iframe-blocked', {
                      detail: { tabId: tab.id, url: tab.url },
                    })
                  );
                }
              } catch (e) {
                // Cross-origin access denied is expected, not a block
              }
            }, 2000);
          } else {
            // Iframe has content, remove from blocked set
            blockedTabs.current.delete(tab.id);
          }
        } catch (e) {
          // Cross-origin access denied - this is normal, not a block
        }
      });
    };

    // Check periodically for blocked frames
    const interval = setInterval(checkBlockedFrames, 1000);
    return () => clearInterval(interval);
  }, [tabs, isElectron]);

  // PR: Fix tab switch - render all iframes, toggle visibility with CSS
  // Never unmount iframes - this preserves page state
  return (
    <div className="relative h-full w-full">
      {tabs.map(tab => {
        const iframeUrl = getTabIframeUrl(tab, language);
        const isActive = tab.id === activeTabId;
        const isBlocked = blockedTabs.current.has(tab.id);

        // PR: Fix tab switch - always render iframe, toggle visibility
        // Use stable key based on tab.id (not URL) to prevent React from recreating
        // PR: Fix navigation - Update iframe src only when URL actually changes
        const currentIframeUrl = iframeUrl || 'about:blank';
        const iframe = iframeRefs.current.get(tab.id);
        const needsSrcUpdate =
          iframe && iframe.src !== currentIframeUrl && currentIframeUrl !== 'about:blank';

        // Update src if needed (for initial load or programmatic navigation)
        if (needsSrcUpdate && isActive) {
          console.log('[TabIframeManager] Updating iframe src', {
            tabId: tab.id,
            oldSrc: iframe.src,
            newSrc: currentIframeUrl,
          });
          iframe.src = currentIframeUrl;
        }

        return (
          <iframe
            key={tab.id} // PR: Fix - stable key based on tab.id, not URL
            ref={setIframeRef(tab.id)}
            src={currentIframeUrl}
            title={tab.title ?? 'Tab content'}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation allow-top-navigation-by-user-activation"
            allow="fullscreen; autoplay; camera; microphone; geolocation; payment; clipboard-read; clipboard-write; display-capture"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            className="absolute inset-0 h-full w-full border-0"
            style={{
              // PR: Fix tab switch - toggle visibility with CSS, never unmount
              display: isActive && iframeUrl ? 'block' : 'none',
              pointerEvents: isActive ? 'auto' : 'none',
              zIndex: isActive ? 1 : 0,
            }}
            aria-label={
              tab.title
                ? `Content for ${tab.title}`
                : iframeUrl
                  ? `External content for ${new URL(iframeUrl).hostname}`
                  : 'Tab content'
            }
            aria-live="off"
            onLoad={() => {
              const iframe = iframeRefs.current.get(tab.id);
              if (!iframe) return;

              // PR: Fix navigation - Track URL changes and update tab store + title
              try {
                const win = iframe.contentWindow;
                const doc = iframe.contentDocument;
                let currentUrl: string | null = null;
                let currentTitle: string | null = null;

                // Try to read URL and title (works for same-origin only)
                try {
                  currentUrl = win?.location.href || null;
                  currentTitle = doc?.title || null;
                } catch (e) {
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
                });

                // Update tab URL if it changed (navigation happened)
                if (currentUrl && currentUrl !== tab.url && !currentUrl.startsWith('about:')) {
                  console.log('[TabIframeManager] URL changed, updating tab', {
                    tabId: tab.id,
                    oldUrl: tab.url,
                    newUrl: currentUrl,
                  });

                  // Update both URL and title
                  const updates: { url: string; title?: string } = { url: currentUrl };
                  if (currentTitle) {
                    updates.title = currentTitle;
                  } else {
                    // Cross-origin: derive title from URL
                    updates.title = deriveTitleFromUrl(currentUrl);
                  }

                  useTabsStore.getState().updateTab(tab.id, updates);
                } else if (currentTitle && currentTitle !== tab.title) {
                  // Title changed but URL didn't (e.g., page title update)
                  console.log('[TabIframeManager] Title changed, updating tab', {
                    tabId: tab.id,
                    oldTitle: tab.title,
                    newTitle: currentTitle,
                  });
                  useTabsStore.getState().updateTab(tab.id, { title: currentTitle });
                } else if (!currentTitle && currentUrl && currentUrl !== tab.url) {
                  // Cross-origin navigation: can't read title, derive from URL
                  const derivedTitle = deriveTitleFromUrl(currentUrl);
                  console.log(
                    '[TabIframeManager] Cross-origin navigation, deriving title from URL',
                    {
                      tabId: tab.id,
                      url: currentUrl,
                      derivedTitle,
                    }
                  );
                  useTabsStore
                    .getState()
                    .updateTab(tab.id, { url: currentUrl, title: derivedTitle });
                }

                // PR: Fix navigation - inject click interceptor and window.open override
                // Only intercept popups, allow regular navigation
                if (win && doc) {
                  console.log('[TabIframeManager] Injecting interceptors for tab', tab.id);

                  // Override window.open to intercept popups (but allow regular navigation)
                  const originalOpen = win.open;
                  win.open = (url?: string | URL, target?: string, features?: string) => {
                    console.log('[TabIframeManager] window.open intercepted', {
                      url,
                      target,
                      tabId: tab.id,
                    });

                    if (url) {
                      const urlStr = typeof url === 'string' ? url : url.toString();
                      // Post message to parent to create new tab
                      window.postMessage(
                        { type: 'open-in-new-tab', url: urlStr, sourceTabId: tab.id },
                        '*' // In production, restrict to specific origin
                      );
                    }

                    // Return null to prevent actual popup
                    return null;
                  };

                  // Intercept anchor clicks: handle target="_blank" for new tabs, track regular navigation
                  doc.addEventListener(
                    'click',
                    (e: MouseEvent) => {
                      const target = e.target as HTMLElement;
                      const anchor = target.closest?.('a') as HTMLAnchorElement | null;

                      if (!anchor || !anchor.href) return;

                      // Handle target="_blank" - open in new tab
                      if (anchor.target === '_blank' || anchor.target === '_new') {
                        e.preventDefault();
                        e.stopPropagation();

                        console.log('[TabIframeManager] target="_blank" click intercepted', {
                          href: anchor.href,
                          tabId: tab.id,
                        });
                        // Post message to parent to create new tab
                        window.postMessage(
                          { type: 'open-in-new-tab', url: anchor.href, sourceTabId: tab.id },
                          '*' // In production, restrict to specific origin
                        );
                        return;
                      }

                      // PR: Fix navigation - Track regular link clicks to update tab URL immediately
                      // This helps with cross-origin navigation where we can't read location.href after navigation
                      if (
                        anchor.href &&
                        anchor.href !== tab.url &&
                        !anchor.href.startsWith('about:')
                      ) {
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
                    },
                    true
                  ); // Use capture phase to catch early

                  // PR: Fix navigation - Listen for navigation events to update URL and title
                  // Track when iframe navigates (for same-tab navigation)
                  const handleNavigation = () => {
                    try {
                      const newUrl = win.location.href;
                      const newTitle = doc?.title || null;

                      if (newUrl && newUrl !== tab.url && !newUrl.startsWith('about:')) {
                        console.log(
                          '[TabIframeManager] Navigation detected, updating URL and title',
                          {
                            tabId: tab.id,
                            newUrl,
                            newTitle,
                          }
                        );

                        const updates: { url: string; title?: string } = { url: newUrl };
                        if (newTitle) {
                          updates.title = newTitle;
                        }

                        useTabsStore.getState().updateTab(tab.id, updates);
                      } else if (newTitle && newTitle !== tab.title) {
                        // Title changed without URL change
                        console.log('[TabIframeManager] Title updated', {
                          tabId: tab.id,
                          newTitle,
                        });
                        useTabsStore.getState().updateTab(tab.id, { title: newTitle });
                      }
                    } catch (e) {
                      // Cross-origin - can't read location, but navigation will work
                      console.log(
                        '[TabIframeManager] Navigation detected (cross-origin, URL tracking limited)',
                        tab.id
                      );
                    }
                  };

                  // Listen for popstate (back/forward) and hashchange
                  win.addEventListener('popstate', handleNavigation);
                  win.addEventListener('hashchange', handleNavigation);

                  // PR: Fix title tracking - Watch for title changes via MutationObserver
                  if (doc) {
                    const titleObserver = new MutationObserver(() => {
                      try {
                        const newTitle = doc.title;
                        if (newTitle && newTitle !== tab.title) {
                          console.log('[TabIframeManager] Title changed via MutationObserver', {
                            tabId: tab.id,
                            newTitle,
                          });
                          useTabsStore.getState().updateTab(tab.id, { title: newTitle });
                        }
                      } catch (e) {
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
                    }

                    // Also observe document.title changes (some sites update it dynamically)
                    // Store observer reference for cleanup (would need ref map for proper cleanup)
                  }

                  console.log('[TabIframeManager] Interceptors installed for tab', tab.id);
                } else {
                  console.warn(
                    '[TabIframeManager] Cannot access iframe contentWindow/contentDocument (cross-origin)',
                    tab.id
                  );
                  // Cross-origin: navigation will still work, just can't track URL changes
                }
              } catch (e) {
                // Cross-origin frames will throw - this is expected
                console.warn(
                  '[TabIframeManager] Could not inject interceptors (cross-origin expected)',
                  tab.id,
                  e
                );
                // Navigation will still work in cross-origin iframes
              }

              // Check if blocked after load
              try {
                // Try to access contentWindow - will be null if blocked
                if (!iframe.contentWindow && iframeUrl && !iframeUrl.startsWith('about:')) {
                  console.warn('[TabIframeManager] X-Frame-Options detected on load', tab.id);
                  blockedTabs.current.add(tab.id);
                  window.dispatchEvent(
                    new CustomEvent('iframe-blocked', {
                      detail: { tabId: tab.id, url: tab.url },
                    })
                  );
                }
              } catch (e) {
                // Cross-origin access denied is normal
              }
            }}
            onError={e => {
              console.warn('[TabIframeManager] Iframe error', {
                tabId: tab.id,
                url: iframeUrl,
                error: e,
              });

              // Mark as blocked if error occurs
              if (iframeUrl && !iframeUrl.startsWith('about:')) {
                blockedTabs.current.add(tab.id);
                window.dispatchEvent(
                  new CustomEvent('iframe-blocked', {
                    detail: { tabId: tab.id, url: tab.url },
                  })
                );
              }
            }}
          />
        );
      })}
    </div>
  );
}
