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
        return (
          <iframe
            key={tab.id} // PR: Fix - stable key based on tab.id, not URL
            ref={setIframeRef(tab.id)}
            src={iframeUrl || 'about:blank'}
            title={tab.title ?? 'Tab content'}
            sandbox={SAFE_IFRAME_SANDBOX}
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
              console.log('[TabIframeManager] Iframe loaded', {
                tabId: tab.id,
                url: iframeUrl,
                isActive,
              });

              // Check if blocked after load
              const iframe = iframeRefs.current.get(tab.id);
              if (iframe) {
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
