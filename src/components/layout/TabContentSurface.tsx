// @ts-nocheck

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Tab } from '../../state/tabsStore';
import { isElectronRuntime } from '../../lib/env';
import { OmniDesk } from '../OmniDesk';
import { ipc } from '../../lib/ipc-typed';
import { useTabsStore } from '../../state/tabsStore';

interface TabContentSurfaceProps {
  tab: Tab | undefined;
  overlayActive?: boolean;
}

const INTERNAL_PROTOCOLS = ['ob://', 'about:', 'chrome://', 'edge://', 'app://', 'omnibrowser://'];

function isInternalUrl(url?: string | null): boolean {
  if (!url) return true;
  return INTERNAL_PROTOCOLS.some(prefix => url.startsWith(prefix));
}

export function TabContentSurface({ tab, overlayActive }: TabContentSurfaceProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // const webviewRef = useRef<any>(null); // Not used - BrowserView managed by main process
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const isElectron = isElectronRuntime();
  const [loading, setLoading] = useState(false);
  const [failedMessage, setFailedMessage] = useState<string | null>(null);
  const [blockedExternal, setBlockedExternal] = useState(false);
  // const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null); // Not used - BrowserView managed by main process
  // const retryCountRef = useRef(0); // Not used - BrowserView managed by main process

  const targetUrl = useMemo(() => {
    const url = tab?.url;
    // For about:blank or empty URLs, show OmniDesk (search page) instead of webview
    if (!url || url === 'about:blank' || isInternalUrl(url)) {
      return null;
    }
    return url;
  }, [tab?.url]);

  // In Electron, BrowserView is managed by main process, so we don't need webview event handlers
  // The main process handles all BrowserView lifecycle events
  // Cleanup: Ensure no memory leaks when tab is hibernated or closed
  useEffect(() => {
    if (!isElectron || !targetUrl) {
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
  }, [isElectron, targetUrl]);

  useEffect(() => {
    if (isElectron || !iframeRef.current || !targetUrl) {
      return;
    }

    const iframe = iframeRef.current;
    const LOADING_TIMEOUT_MS = 30000; // 30 seconds
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const handleLoad = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      setLoading(false);
      setFailedMessage(null);
      if (!iframeRef.current) return;
      try {
        const doc = iframeRef.current.contentDocument;
        void doc?.title;
        setBlockedExternal(false);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.info('[TabContentSurface] cross-origin frame detected', error);
        }
        setBlockedExternal(true);
      }
    };

    const handleError = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      setLoading(false);
      setFailedMessage('Failed to load this page. Please check the URL or your connection.');
      setBlockedExternal(true);
    };

    // Set loading timeout
    timeoutId = setTimeout(() => {
      setLoading(false);
      setFailedMessage(
        'This page is taking too long to load. Check your connection or try refreshing.'
      );
      timeoutId = null;
    }, LOADING_TIMEOUT_MS);

    iframe.addEventListener('load', handleLoad);
    iframe.addEventListener('error', handleError);

    // Cleanup function to prevent memory leaks on tab hibernation/close
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (iframe && iframeRef.current) {
        iframe.removeEventListener('load', handleLoad);
        iframe.removeEventListener('error', handleError);
      }
      // Clear refs to prevent stale references
      setLoading(false);
      setFailedMessage(null);
      setBlockedExternal(false);
    };
  }, [isElectron, targetUrl]);

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
    // We don't need to update webview src here
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
  }, [isElectron, targetUrl]);

  const panelId = tab?.id ? `tabpanel-${tab.id}` : 'tabpanel-empty';
  const labelledById = tab?.id ? `tab-${tab.id}` : undefined;
  const isInactive = !tab || !tab.active;

  // Show OmniDesk (search page) for about:blank or internal URLs
  if (!targetUrl) {
    return (
      <motion.div
        id={panelId}
        role="tabpanel"
        aria-labelledby={labelledById}
        aria-hidden={isInactive}
        className="h-full w-full overflow-hidden bg-[#1A1D28]"
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
        <OmniDesk variant="split" forceShow />
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
      {/* In Electron, BrowserView is managed by main process, so we don't render webview tag here */}
      {/* The BrowserView is positioned by electron/services/tabs.ts */}
      {/* For non-Electron builds, use iframe fallback */}
      {!isElectron && (
        <iframe
          ref={iframeRef}
          className="w-full h-full border-0"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%',
            border: 'none',
          }}
          src={targetUrl ?? 'about:blank'}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          allow="fullscreen"
          title={tab?.title ?? 'Tab content'}
          aria-label={tab?.title ? `Content for ${tab.title}` : 'Tab content'}
        />
      )}

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
              <div className="text-center w-full max-w-xs">
                <div className="font-medium mb-2">Loading {new URL(targetUrl).hostname}…</div>
                <div className="mt-1 text-xs text-slate-400 mb-3">This may take a moment</div>
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

      <AnimatePresence>
        {!isElectron && blockedExternal && (
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
                {new URL(targetUrl).hostname} works best in its own tab
              </div>
              <p className="text-emerald-100/70">
                This site blocks embedded views for security. Open it in a dedicated tab or use the
                Electron build for a fully integrated webview.
              </p>
              <button
                type="button"
                onClick={launchExternal}
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/60 bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-50 transition hover:border-emerald-300/70 hover:bg-emerald-500/30"
              >
                <ExternalLink size={16} />
                Open {new URL(targetUrl).hostname}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
