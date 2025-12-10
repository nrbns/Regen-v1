// @ts-nocheck

import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { ExternalLink, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Tab } from '../../state/tabsStore';
import { isElectronRuntime, isTauriRuntime } from '../../lib/env';
import { OmniDesk } from '../OmniDesk';
import NewTabPage from '../Browse/NewTabPage';
import { ipc } from '../../lib/ipc-typed';
import { useTabsStore } from '../../state/tabsStore';
import { useSettingsStore } from '../../state/settingsStore';
import { useAppStore } from '../../state/appStore';
import { SAFE_IFRAME_SANDBOX } from '../../config/security';
import { normalizeInputToUrlOrSearch } from '../../lib/search';
import { useOptimizedView } from '../../hooks/useOptimizedView';
import { getIframeManager, throttleViewUpdate } from '../../utils/gve-optimizer';
import { BrowserAutomationBridge } from '../browser/BrowserAutomationBridge';
import { ErrorPage } from '../browser/ErrorPage';
import { LoadingIndicator } from '../browser/LoadingIndicator';
import {
  isYouTubeUrl,
  convertToYouTubeEmbed,
  isYouTubeEmbeddable,
} from '../../utils/youtubeHandler';

interface TabContentSurfaceProps {
  tab: Tab | undefined;
  overlayActive?: boolean;
}

const INTERNAL_PROTOCOLS = ['ob://', 'about:', 'chrome://', 'edge://', 'app://', 'regen://'];

function isInternalUrl(url?: string | null): boolean {
  if (!url) return true;
  return INTERNAL_PROTOCOLS.some(prefix => url.startsWith(prefix));
}

// Loading spinner component for Suspense (removed - using Suspense fallback directly)

export function TabContentSurface({ tab, overlayActive }: TabContentSurfaceProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // const webviewRef = useRef<any>(null); // Used for Tauri webview (currently unused)
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const isElectron = isElectronRuntime();
  const isTauri = isTauriRuntime();
  const language = useSettingsStore(state => state.language || 'auto');
  const [loading, setLoading] = useState(true); // Start with loading true to show spinner
  const [loadProgress, setLoadProgress] = useState<number | undefined>(undefined);
  const [error, setError] = useState<{ code?: string; message?: string; url?: string } | null>(
    null
  );
  const [failedMessage, setFailedMessage] = useState<string | null>(null);
  const [blockedExternal, setBlockedExternal] = useState(false);

  // GVE Optimization: Use optimized view hook
  const { queueUpdate: _queueUpdate } = useOptimizedView({
    iframeId: tab?.id,
    lazy: !tab?.active,
    sandbox: SAFE_IFRAME_SANDBOX.split(' '),
    onResize: _rect => {
      // Handle resize with throttled updates
      throttleViewUpdate(() => {
        // Update view if needed
      });
    },
  });
  // const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null); // Not used - BrowserView managed by main process
  // const retryCountRef = useRef(0); // Not used - BrowserView managed by main process

  const targetUrl = useMemo(() => {
    let url = tab?.url;

    // For about:blank or empty URLs, show OmniDesk (search page) instead of webview
    if (!url || url === 'about:blank' || isInternalUrl(url)) {
      return null;
    }

    // If URL doesn't start with http/https, treat as search query
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      // Convert to search in user's language
      // Use Startpage (privacy-friendly AND iframe-friendly) as default
      const searchUrl = normalizeInputToUrlOrSearch(
        url,
        'startpage', // Use Startpage - privacy-friendly and iframe-friendly
        language !== 'auto' ? language : undefined,
        true // Prefer iframe-friendly for better compatibility
      );
      if (searchUrl) {
        return searchUrl;
      }
      // Fallback to DuckDuckGo search
      return `https://duckduckgo.com/?q=${encodeURIComponent(url)}`;
    }

    // Handle YouTube URLs: convert to embed format if it's a video URL
    if (isYouTubeUrl(url)) {
      const embedUrl = convertToYouTubeEmbed(url);
      if (embedUrl) {
        // It's a video URL, use embed format
        console.log('[TabContentSurface] Converting YouTube URL to embed:', url, '->', embedUrl);
        return embedUrl;
      }
      // It's not a video URL (e.g., youtube.com homepage) - keep original
      // YouTube homepage will be blocked by X-Frame-Options, which is expected
      console.log('[TabContentSurface] YouTube homepage detected, using original URL');
    }

    return url;
  }, [tab?.url, language]);

  // Tauri: Use IPC to navigate main window or create new webview window
  // For now, we'll use iframe for Tauri as well (Tauri v2 doesn't support webview tag)

  // In Electron, BrowserView is managed by main process, so we don't need webview event handlers
  // The main process handles all BrowserView lifecycle events
  // Cleanup: Ensure no memory leaks when tab is hibernated or closed
  useEffect(() => {
    if (!isElectron || !targetUrl || isTauri) {
      return;
    }

    // BrowserView is managed by electron/services/tabs.ts
    // No need for webview event handlers here

    // Cleanup function to prevent memory leaks
    return () => {
      // Clear any pending timeouts or intervals
      // Reset state to prevent stale references
      setLoading(false);
      setFailedMessage(null);
      setBlockedExternal(false);
    };
  }, [isElectron, isTauri, targetUrl]);

  // WebView stability: Add error handling and lifecycle management for iframe
  useEffect(() => {
    if (isElectron || !targetUrl || !iframeRef.current) {
      return;
    }

    const iframe = iframeRef.current;
    let isMounted = true;
    const LOADING_TIMEOUT_MS = 30000; // 30 seconds
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    // Intercept link clicks in iframe to create new tabs
    const handleIframeLinkClick = async (event: MessageEvent) => {
      try {
        // Listen for link clicks from iframe content
        if (event.data?.type === 'link-click' && event.data?.url) {
          const url = event.data.url;

          // Validate URL
          if (!url || url.startsWith('javascript:') || url.startsWith('#')) {
            return;
          }

          // Normalize URL (handle relative URLs)
          let normalizedUrl = url;
          try {
            // If it's not a full URL, try to make it one
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
              // Try to resolve relative to current page
              if (targetUrl) {
                normalizedUrl = new URL(url, targetUrl).href;
              } else {
                normalizedUrl = url.startsWith('//') ? `https:${url}` : `https://${url}`;
              }
            }

            // Validate the final URL
            const urlObj = new URL(normalizedUrl);
            if (!['http:', 'https:'].includes(urlObj.protocol)) {
              console.warn('[TabContentSurface] Invalid protocol:', normalizedUrl);
              return;
            }
          } catch (urlError) {
            console.warn('[TabContentSurface] Invalid URL:', url, urlError);
            return;
          }

          // Don't create new tab for same URL (refresh)
          if (normalizedUrl === targetUrl) {
            console.log('[TabContentSurface] Same URL, skipping tab creation');
            return;
          }

          console.log('[TabContentSurface] Intercepted link click:', normalizedUrl);

          // Create new tab for the link
          try {
            if (isElectron || isTauri) {
              await ipc.tabs.create(normalizedUrl);
            } else {
              // Web mode fallback: open in new window
              window.open(normalizedUrl, '_blank', 'noopener,noreferrer');
            }
          } catch (error) {
            console.warn('[TabContentSurface] Failed to create tab for link:', error);
            // Fallback: open in new window
            window.open(normalizedUrl, '_blank', 'noopener,noreferrer');
          }
        }
      } catch (error) {
        console.warn('[TabContentSurface] Error handling link click:', error);
      }
    };

    window.addEventListener('message', handleIframeLinkClick);

    // Inject script to intercept link clicks in iframe
    const injectLinkInterceptor = () => {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!iframeDoc) return; // Cross-origin, can't inject

        // Remove existing interceptor if any
        const existingScript = iframeDoc.getElementById('regen-link-interceptor');
        if (existingScript) existingScript.remove();

        // Inject comprehensive link click interceptor
        const script = iframeDoc.createElement('script');
        script.id = 'regen-link-interceptor';
        script.textContent = `
          (function() {
            // Intercept all link clicks - both same-origin and external
            document.addEventListener('click', function(e) {
              const link = e.target.closest('a');
              if (link && link.href) {
                const url = link.href;
                const currentUrl = window.location.href;
                
                // Skip javascript: and anchor links
                if (!url || url.startsWith('javascript:') || url.startsWith('#')) {
                  return;
                }
                
                try {
                  // Parse URLs to check if external
                  const linkUrl = new URL(url, currentUrl);
                  const currentOrigin = new URL(currentUrl).origin;
                  const isExternal = linkUrl.origin !== currentOrigin;
                  
                  // Intercept if:
                  // 1. Link has _blank target (always open in new tab)
                  // 2. Link is external (different origin)
                  // 3. Link has _parent target
                  // 4. It's a search result link (common patterns)
                  const isSearchResult = linkUrl.pathname.includes('/search') || 
                                         linkUrl.pathname.includes('/results') ||
                                         linkUrl.pathname.includes('/url') ||
                                         link.closest('.result') !== null ||
                                         link.closest('[class*="result"]') !== null ||
                                         link.closest('[class*="search"]') !== null;
                  
                  if (link.target === '_blank' || link.target === '_parent' || isExternal || isSearchResult) {
                    e.preventDefault();
                    e.stopPropagation();
                    window.parent.postMessage({ type: 'link-click', url: linkUrl.href }, '*');
                    return false;
                  }
                } catch (urlError) {
                  // If URL parsing fails, still try to send it (might be relative URL)
                  if (link.target === '_blank' || link.target === '_parent') {
                    e.preventDefault();
                    e.stopPropagation();
                    window.parent.postMessage({ type: 'link-click', url: url }, '*');
                    return false;
                  }
                }
              }
            }, true);
            
            // Also intercept middle-click and Ctrl+click
            document.addEventListener('auxclick', function(e) {
              if (e.button === 1) { // Middle click
                const link = e.target.closest('a');
                if (link && link.href && !link.href.startsWith('javascript:') && !link.href.startsWith('#')) {
                  e.preventDefault();
                  e.stopPropagation();
                  window.parent.postMessage({ type: 'link-click', url: link.href }, '*');
                  return false;
                }
              }
            }, true);
            
            // Intercept Ctrl+Click (Cmd+Click on Mac)
            document.addEventListener('click', function(e) {
              if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
                const link = e.target.closest('a');
                if (link && link.href && !link.href.startsWith('javascript:') && !link.href.startsWith('#')) {
                  e.preventDefault();
                  e.stopPropagation();
                  window.parent.postMessage({ type: 'link-click', url: link.href }, '*');
                  return false;
                }
              }
            }, true);
          })();
        `;
        iframeDoc.head.appendChild(script);
        console.log('[TabContentSurface] Link interceptor injected successfully');
      } catch (error) {
        // Cross-origin - can't inject, but that's OK, we'll handle via postMessage
        console.debug('[TabContentSurface] Cannot inject link interceptor (cross-origin):', error);
      }
    };

    const handleLoad = () => {
      if (!isMounted) return; // Don't update state if unmounted
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      setLoading(false);
      setFailedMessage(null);
      if (!iframeRef.current) return;

      // Check if iframe loaded successfully
      // Cross-origin frames will throw when accessing contentDocument, but that's OK
      // Only set blockedExternal if we can't access the iframe at all
      try {
        const doc = iframeRef.current.contentDocument;
        void doc?.title;
        setBlockedExternal(false);
      } catch (error) {
        // Cross-origin is normal - don't block unless there's an actual error
        // Only block if we can't even access the iframe element
        if (import.meta.env.DEV) {
          console.debug('[TabContentSurface] cross-origin frame (normal)', error);
        }
        // Don't set blockedExternal for cross-origin - many sites work fine
        // Only block if there's an actual X-Frame-Options error (detected via error handler)
        setBlockedExternal(false);
      }
    };

    const handleError = (event: ErrorEvent | Event) => {
      if (!isMounted) return; // Don't update state if unmounted
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      setLoading(false);

      // Check if this is an X-Frame-Options blocking error
      // Note: iframe error events don't always provide detailed error messages
      // We'll check the iframe's state to determine if it's actually blocked
      const errorMessage = event instanceof ErrorEvent ? event.message || '' : '';
      const errorTarget = event.target;

      // Check if the iframe itself failed to load (not just cross-origin)
      // If iframe has no contentWindow, it might be blocked
      const isFrameBlocked =
        (errorMessage &&
          (errorMessage.toLowerCase().includes('x-frame-options') ||
            errorMessage.toLowerCase().includes('frame-ancestors') ||
            errorMessage.toLowerCase().includes('refused to display') ||
            errorMessage.toLowerCase().includes('denied') ||
            (errorMessage.toLowerCase().includes('frame') &&
              errorMessage.toLowerCase().includes('blocked')))) ||
        (errorTarget === iframe &&
          iframe.contentWindow === null &&
          iframe.contentDocument === null);

      // Additional check: If URL is a search engine that blocks iframes, try alternative
      if (targetUrl && !isFrameBlocked) {
        const urlLower = targetUrl.toLowerCase();
        // DuckDuckGo and Google often block iframes
        if (urlLower.includes('duckduckgo.com') || urlLower.includes('google.com/search')) {
          // Try to convert to Bing search (iframe-friendly)
          try {
            const urlObj = new URL(targetUrl);
            const query = urlObj.searchParams.get('q') || urlObj.searchParams.get('query') || '';
            if (query) {
              // Convert to Startpage search URL (iframe-friendly and privacy-focused)
              const startpageUrl = `https://www.startpage.com/sp/search?query=${encodeURIComponent(query)}`;
              console.log(
                '[TabContentSurface] Converting iframe-blocked search to Startpage:',
                startpageUrl
              );
              setTimeout(() => {
                if (iframeRef.current) {
                  iframeRef.current.src = startpageUrl;
                  setLoading(true);
                  setFailedMessage(null);
                }
              }, 100);
              return; // Don't set error, we're retrying with Startpage
            }
          } catch {
            // URL parsing failed, continue with error handling
          }
        }
      }

      if (isFrameBlocked) {
        setBlockedExternal(true);
        // Special message for YouTube
        if (targetUrl && isYouTubeUrl(targetUrl) && !isYouTubeEmbeddable(targetUrl)) {
          setFailedMessage(
            'YouTube homepage cannot be embedded. Try opening a specific video URL.'
          );
        } else {
          setFailedMessage('This site blocks embedded views (X-Frame-Options).');
        }
      } else {
        // Generic error - don't assume it's blocking, might be network issue
        setFailedMessage('Failed to load this page. Please check the URL or your connection.');
        setBlockedExternal(false);
      }
    };

    // Set loading timeout
    timeoutId = setTimeout(() => {
      if (!isMounted) return; // Don't update state if unmounted
      setLoading(false);
      setFailedMessage(
        'This page is taking too long to load. Check your connection or try refreshing.'
      );
      timeoutId = null;
    }, LOADING_TIMEOUT_MS);

    iframe.addEventListener('load', handleLoad);
    iframe.addEventListener('error', handleError as EventListener);

    // Cleanup function to prevent memory leaks on tab hibernation/close
    return () => {
      isMounted = false; // Mark as unmounted to prevent state updates
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (iframe && iframeRef.current) {
        iframe.removeEventListener('load', handleLoad);
        iframe.removeEventListener('error', handleError);
      }
      // Clear state to prevent memory leaks
      setLoading(false);
      setFailedMessage(null);
      setBlockedExternal(false);
    };

    /* Legacy webview code - kept for reference but not used
    const webviewElement = webviewRef.current as Electron.WebviewTag;
    const LOADING_TIMEOUT_MS = 30000; // 30 seconds
    // const MAX_RETRIES = 2; // Reserved for future use

    const handleDidStartLoading = () => {
      setLoading(true);
      setFailedMessage(null);
      retryCountRef.current = 0;
      
      // Clear any existing timeout
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      
      // Set timeout for loading with retry option
      loadingTimeoutRef.current = setTimeout(() => {
        setLoading(false);
        setFailedMessage('This page is taking too long to load. Check your connection or try refreshing.');
        // Auto-retry once after timeout
        if (retryCountRef.current < 1 && targetUrl) {
          retryCountRef.current++;
          setTimeout(() => {
            if (webviewRef.current && targetUrl) {
              const webviewElement = webviewRef.current as Electron.WebviewTag;
              try {
                webviewElement.reload();
                setLoading(true);
                setFailedMessage(null);
              } catch (error) {
                console.warn('[TabContentSurface] Retry failed:', error);
              }
            }
          }, 2000);
        }
      }, LOADING_TIMEOUT_MS);
    };

    const handleDidStopLoading = () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      setLoading(false);
    };

    const handleDomReady = () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      setLoading(false);
      setFailedMessage(null);
      retryCountRef.current = 0;
    };

    const handleFailLoad = (event: any) => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      setLoading(false);
      
      const errorCode = event?.errorCode ?? -1;
      const errorDescription = event?.errorDescription ?? 'Unknown error';
      
      let message = 'Failed to load this page.';
      if (errorCode === -105 || errorDescription.includes('ERR_NAME_NOT_RESOLVED')) {
        message = 'Could not resolve the website address. Check your internet connection.';
      } else if (errorCode === -106 || errorDescription.includes('ERR_INTERNET_DISCONNECTED')) {
        message = 'No internet connection. Please check your network settings.';
      } else if (errorCode === -118 || errorDescription.includes('ERR_CONNECTION_TIMED_OUT')) {
        message = 'Connection timed out. The server may be slow or unreachable.';
      } else if (errorDescription.includes('ERR_BLOCKED_BY_RESPONSE')) {
        message = 'This site cannot be embedded for security reasons.';
      } else {
        message = `Failed to load: ${errorDescription || 'Unknown error'}`;
      }
      
      setFailedMessage(message);
    };

    webviewElement.addEventListener('did-start-loading', handleDidStartLoading);
    webviewElement.addEventListener('did-stop-loading', handleDidStopLoading);
    webviewElement.addEventListener('dom-ready', handleDomReady);
    webviewElement.addEventListener('did-fail-load', handleFailLoad);

    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      webviewElement.removeEventListener('did-start-loading', handleDidStartLoading);
      webviewElement.removeEventListener('did-stop-loading', handleDidStopLoading);
      webviewElement.removeEventListener('dom-ready', handleDomReady);
      webviewElement.removeEventListener('did-fail-load', handleFailLoad);
    };
    */
  }, [isElectron, isTauri, targetUrl]);

  useEffect(() => {
    // Use iframe for both web builds and Tauri (Tauri v2 doesn't support webview tag)
    if (isElectron || !iframeRef.current || !targetUrl) {
      return;
    }

    const iframe = iframeRef.current;
    let isMounted = true; // Track if component is still mounted
    const LOADING_TIMEOUT_MS = 30000; // 30 seconds
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const handleLoad = () => {
      if (!isMounted) return; // Don't update state if unmounted
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      setLoading(false);
      setFailedMessage(null);
      if (!iframeRef.current) return;

      // Check if iframe loaded successfully
      // Cross-origin frames will throw when accessing contentDocument, but that's OK
      // Only set blockedExternal if we can't access the iframe at all
      try {
        const doc = iframeRef.current.contentDocument;
        void doc?.title;
        setBlockedExternal(false);
      } catch (error) {
        // Cross-origin is normal - don't block unless there's an actual error
        // Only block if we can't even access the iframe element
        if (import.meta.env.DEV) {
          console.debug('[TabContentSurface] cross-origin frame (normal)', error);
        }
        // Don't set blockedExternal for cross-origin - many sites work fine
        // Only block if there's an actual X-Frame-Options error (detected via error handler)
        setBlockedExternal(false);
      }
    };

    const handleError = (event: ErrorEvent | Event) => {
      if (!isMounted) return; // Don't update state if unmounted
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      setLoading(false);

      // Check if this is an X-Frame-Options blocking error
      // Note: iframe error events don't always provide detailed error messages
      // We'll check the iframe's state to determine if it's actually blocked
      const errorMessage = event instanceof ErrorEvent ? event.message || '' : '';
      const errorTarget = event.target;

      // Check if the iframe itself failed to load (not just cross-origin)
      // If iframe has no contentWindow, it might be blocked
      const isFrameBlocked =
        (errorMessage &&
          (errorMessage.toLowerCase().includes('x-frame-options') ||
            errorMessage.toLowerCase().includes('frame-ancestors') ||
            errorMessage.toLowerCase().includes('refused to display') ||
            errorMessage.toLowerCase().includes('denied') ||
            (errorMessage.toLowerCase().includes('frame') &&
              errorMessage.toLowerCase().includes('blocked')))) ||
        (errorTarget === iframe &&
          iframe.contentWindow === null &&
          iframe.contentDocument === null);

      // Additional check: If URL is a search engine that blocks iframes, try alternative
      if (targetUrl && !isFrameBlocked) {
        const urlLower = targetUrl.toLowerCase();
        // DuckDuckGo and Google often block iframes
        if (urlLower.includes('duckduckgo.com') || urlLower.includes('google.com/search')) {
          // Try to convert to Bing search (iframe-friendly)
          try {
            const urlObj = new URL(targetUrl);
            const query = urlObj.searchParams.get('q') || urlObj.searchParams.get('query') || '';
            if (query) {
              // Convert to Startpage search URL (iframe-friendly and privacy-focused)
              const startpageUrl = `https://www.startpage.com/sp/search?query=${encodeURIComponent(query)}`;
              console.log(
                '[TabContentSurface] Converting iframe-blocked search to Startpage:',
                startpageUrl
              );
              setTimeout(() => {
                if (iframeRef.current) {
                  iframeRef.current.src = startpageUrl;
                  setLoading(true);
                  setFailedMessage(null);
                }
              }, 100);
              return; // Don't set error, we're retrying with Startpage
            }
          } catch {
            // URL parsing failed, continue with error handling
          }
        }
      }

      if (isFrameBlocked) {
        setBlockedExternal(true);
        // Special message for YouTube
        if (targetUrl && isYouTubeUrl(targetUrl) && !isYouTubeEmbeddable(targetUrl)) {
          setFailedMessage(
            'YouTube homepage cannot be embedded. Try opening a specific video URL.'
          );
        } else {
          setFailedMessage('This site blocks embedded views (X-Frame-Options).');
        }
      } else {
        // Generic error - don't assume it's blocking, might be network issue
        setFailedMessage('Failed to load this page. Please check the URL or your connection.');
        setBlockedExternal(false);
      }
    };

    // Set loading timeout
    timeoutId = setTimeout(() => {
      if (!isMounted) return; // Don't update state if unmounted
      setLoading(false);
      setFailedMessage(
        'This page is taking too long to load. Check your connection or try refreshing.'
      );
      timeoutId = null;
    }, LOADING_TIMEOUT_MS);

    iframe.addEventListener('load', handleLoad);
    iframe.addEventListener('error', handleError as EventListener);

    // MEMORY LEAK FIX: Listen for tab close event to cleanup
    const handleTabClose = ((e: CustomEvent) => {
      if (e.detail?.tabId === tab?.id) {
        isMounted = false;
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        if (iframe && iframeRef.current) {
          iframe.removeEventListener('load', handleLoad);
          iframe.removeEventListener('error', handleError);
          // Clear iframe src to release resources
          iframe.src = 'about:blank';
        }
      }
    }) as EventListener;

    window.addEventListener('tab-closed', handleTabClose);

    // Cleanup function to prevent memory leaks on tab hibernation/close
    return () => {
      isMounted = false; // Mark as unmounted to prevent state updates
      window.removeEventListener('tab-closed', handleTabClose);
      window.removeEventListener('message', handleIframeLinkClick);
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (iframe && iframeRef.current) {
        iframe.removeEventListener('load', handleLoad);
        iframe.removeEventListener('error', handleError);
        // Clear iframe src to release resources
        iframe.src = 'about:blank';
      }
      // Clear state to prevent memory leaks
      setLoading(false);
      setFailedMessage(null);
      setBlockedExternal(false);
    };
  }, [isElectron, isTauri, targetUrl, tab?.id]);

  const launchExternal = useCallback(() => {
    if (!targetUrl) return;
    try {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.warn('[TabContentSurface] failed to open external window', error);
    }
  }, [targetUrl]);

  useEffect(() => {
    if (!targetUrl) {
      setLoading(false);
      setFailedMessage(null);
      setBlockedExternal(false);
      return;
    }

    // In Electron, BrowserView navigation is handled by electron/services/tabs.ts
    // For Tauri and web builds, use iframe
    if (isElectron) {
      // BrowserView is managed by main process
      return;
    } else {
      const iframe = iframeRef.current;
      if (!iframe) return;
      if (iframe.src !== targetUrl) {
        setLoading(true);
        iframe.src = targetUrl;
      }
      setBlockedExternal(false);
    }
  }, [isElectron, isTauri, targetUrl]);

  const panelId = tab?.id ? `tabpanel-${tab.id}` : 'tabpanel-empty';
  const labelledById = tab?.id ? `tab-${tab.id}` : undefined;
  const isInactive = !tab || !tab.active;

  // Show NewTabPage for about:blank or internal URLs in Browse mode
  // Show OmniDesk for other modes
  const currentMode = useAppStore(state => state.mode ?? 'Browse');
  const isBrowseMode = currentMode === 'Browse' || !currentMode;

  if (!targetUrl) {
    return (
      <motion.div
        id={panelId}
        role="tabpanel"
        aria-labelledby={labelledById}
        aria-hidden={isInactive}
        className="h-full w-full overflow-hidden bg-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: isInactive ? 0 : 1,
          pointerEvents: 'auto',
        }}
      >
        {isBrowseMode ? <NewTabPage /> : <OmniDesk variant="split" forceShow />}
      </motion.div>
    );
  }

  return (
    <motion.div
      ref={containerRef}
      className={`h-full w-full bg-black ${overlayActive ? 'pointer-events-none' : ''}`}
      key={targetUrl}
      id={panelId}
      role="tabpanel"
      aria-labelledby={labelledById}
      aria-hidden={isInactive}
      initial={{ opacity: 0.4 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        zIndex: isInactive ? 0 : 1,
      }}
    >
      {/* In Electron, BrowserView is managed by main process */}
      {/* For Tauri and web builds, use iframe (Tauri v2 doesn't support webview tag) */}
      {!isElectron && targetUrl ? (
        <Suspense
          fallback={
            <div className="flex h-full w-full items-center justify-center bg-slate-950">
              <div className="text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-400" />
                <p className="mt-4 text-sm text-slate-400">Loading page...</p>
              </div>
            </div>
          }
        >
          <iframe
            ref={el => {
              if (el) {
                iframeRef.current = el;
                // GVE Optimization: Register iframe with optimizations
                if (tab?.id) {
                  const iframeManager = getIframeManager();
                  throttleViewUpdate(() => {
                    iframeManager.registerIframe(tab.id, el, {
                      lazy: !tab.active,
                      sandbox: SAFE_IFRAME_SANDBOX.split(' '),
                      allow:
                        'fullscreen; autoplay; camera; microphone; geolocation; payment; clipboard-read; clipboard-write; display-capture; storage-access; accelerometer; encrypted-media; gyroscope; picture-in-picture',
                    });
                  });
                }
              }
            }}
            className="h-full w-full border-0"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100%',
              height: '100%',
              border: 'none',
              // GVE Optimization: Performance improvements
              contentVisibility: tab?.active ? 'auto' : 'hidden',
              contain: 'layout style paint',
            }}
            src={targetUrl && targetUrl !== 'about:blank' ? targetUrl : 'regen://newtab'}
            sandbox={SAFE_IFRAME_SANDBOX}
            allow="fullscreen; autoplay; camera; microphone; geolocation; payment; clipboard-read; clipboard-write; display-capture; storage-access; accelerometer; encrypted-media; gyroscope; picture-in-picture"
            referrerPolicy="no-referrer"
            loading={tab?.active ? 'eager' : 'lazy'}
            fetchpriority={tab?.active ? 'high' : 'low'}
            title={tab?.title ?? 'Tab content'}
            aria-label={
              tab?.title
                ? `Content for ${tab.title}`
                : targetUrl
                  ? `External content for ${new URL(targetUrl).hostname}`
                  : 'Tab content'
            }
            aria-live="off"
            onError={e => {
              // Additional error handling for iframe
              console.warn('[TabContentSurface] Iframe error event:', e);
              // Check if it's a blocked iframe
              const iframe = e.currentTarget;
              if (iframe && !iframe.contentWindow && !iframe.contentDocument) {
                setBlockedExternal(true);
                // Special message for YouTube
                if (targetUrl && isYouTubeUrl(targetUrl) && !isYouTubeEmbeddable(targetUrl)) {
                  setFailedMessage(
                    'YouTube homepage cannot be embedded. Try opening a specific video URL.'
                  );
                } else {
                  setFailedMessage('This site blocks embedded views (X-Frame-Options).');
                }
              }
            }}
          />
        </Suspense>
      ) : null}

      <AnimatePresence>
        {loading && (
          <motion.div
            className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-slate-950/55 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="status"
            aria-live="polite"
            aria-label="Loading page content"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center gap-4 rounded-2xl border border-slate-700/60 bg-slate-900/90 px-6 py-5 text-sm text-slate-200 shadow-lg shadow-black/40"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <Loader2 className="h-6 w-6 text-emerald-300" aria-hidden="true" />
              </motion.div>
              <div className="w-full max-w-xs text-center">
                <div className="mb-2 font-medium">Loading {new URL(targetUrl).hostname}…</div>
                <div className="mb-3 mt-1 text-xs text-slate-400">This may take a moment</div>
                <div className="w-full">
                  <div className="h-1 w-full overflow-hidden rounded-full bg-slate-800/60">
                    <motion.div
                      className="h-full bg-gradient-to-r from-emerald-500 via-cyan-500 to-emerald-500"
                      initial={{ x: '-100%', width: '40%' }}
                      animate={{
                        x: ['-100%', '100%'],
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {failedMessage && (
          <motion.div
            className="pointer-events-auto absolute inset-0 z-10 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="alert"
            aria-live="assertive"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="max-w-md space-y-3 rounded-2xl border border-amber-400/40 bg-amber-500/15 px-5 py-4 text-center text-sm text-amber-100 shadow-lg shadow-black/50"
            >
              <div className="font-medium">{failedMessage}</div>
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (targetUrl && isElectron) {
                      // In Electron, reload is handled by main process via IPC
                      const activeTab = useTabsStore.getState().activeId;
                      if (activeTab) {
                        ipc.tabs.reload({ id: activeTab }).catch(console.error);
                      }
                      setFailedMessage(null);
                      setLoading(true);
                    } else if (targetUrl && !isElectron && iframeRef.current) {
                      setFailedMessage(null);
                      setLoading(true);
                      iframeRef.current.src = targetUrl;
                    }
                  }}
                  className="rounded-lg border border-amber-400/60 bg-amber-500/20 px-3 py-1.5 text-xs font-medium text-amber-50 transition-colors hover:bg-amber-500/30"
                >
                  Retry
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DAY 4: Error Page */}
      {error && (
        <ErrorPage
          error={error}
          onRetry={async () => {
            setError(null);
            setLoading(true);
            if (tab?.id && targetUrl) {
              try {
                await ipc.tabs.navigate(tab.id, targetUrl);
              } catch {
                setError({
                  code: 'RETRY_FAILED',
                  message: 'Failed to reload page',
                  url: targetUrl,
                });
              }
            }
          }}
          onGoHome={() => {
            if (tab?.id) {
              ipc.tabs.navigate(tab.id, 'about:blank').catch(console.error);
            }
          }}
        />
      )}

      {/* DAY 4: Loading Indicator */}
      {loading && !error && (
        <LoadingIndicator progress={loadProgress} message="Loading page..." fullPage={false} />
      )}

      <AnimatePresence>
        {!isElectron && blockedExternal && !error && (
          <motion.div
            className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/85 px-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="max-w-lg space-y-4 rounded-3xl border border-emerald-500/40 bg-emerald-500/15 p-6 text-center text-sm text-emerald-100 shadow-2xl shadow-black/50"
            >
              <div className="text-lg font-semibold text-emerald-50">
                {targetUrl && isYouTubeUrl(targetUrl) && !isYouTubeEmbeddable(targetUrl)
                  ? 'YouTube homepage cannot be embedded'
                  : targetUrl
                    ? `${new URL(targetUrl).hostname} cannot be embedded`
                    : 'This page cannot be embedded'}
              </div>
              <p className="text-emerald-100/70">
                {targetUrl && isYouTubeUrl(targetUrl) && !isYouTubeEmbeddable(targetUrl)
                  ? 'YouTube blocks embedding of their homepage. Try opening a specific video URL (e.g., youtube.com/watch?v=VIDEO_ID) or open it in your system browser.'
                  : 'This site blocks embedded views for security (X-Frame-Options). You can open it in your system browser or use the desktop build for full webview support.'}
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={launchExternal}
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/60 bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-50 transition hover:border-emerald-300/70 hover:bg-emerald-500/30"
                >
                  <ExternalLink size={16} />
                  Open in Browser
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Browser Automation Bridge - connects automation API with iframe */}
      {tab && !isElectron && iframeRef.current && (
        <BrowserAutomationBridge tabId={tab.id} iframeId={tab.id} sessionId={`tab-${tab.id}`} />
      )}
    </motion.div>
  );
}
