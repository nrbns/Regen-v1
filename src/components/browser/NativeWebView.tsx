/**
 * NativeWebView - Tauri native WebView component
 * Replaces iframe-based rendering with native WebView instances
 *
 * Architecture:
 * - Rust owns tab state (via TabManager)
 * - Frontend creates/manages WebView instances per tab
 * - WebView lifecycle tied to tab lifecycle
 */

import { useEffect, useRef, useState } from 'react';
import { isTauriRuntime } from '../../lib/env';
import { Loader2 } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

// Tauri 2.0 API imports (dynamic to avoid errors in non-Tauri environments)
let Webview: any;
let Window: any;

if (typeof window !== 'undefined') {
  try {
    const tauriApi = require('@tauri-apps/api');
    Webview = tauriApi.webview?.Webview || tauriApi.Webview;
    Window = tauriApi.window?.Window || tauriApi.Window;
  } catch {
    // Not in Tauri environment
  }
}

interface NativeWebViewProps {
  tabId: string;
  url: string;
  className?: string;
  onUrlChange?: (url: string) => void;
  onTitleChange?: (title: string) => void;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  privacyMode?: 'normal' | 'private' | 'ghost';
}

/**
 * Native WebView component using Tauri's WebView API
 * Creates a native WebView instance for each tab
 */
export function NativeWebView({
  tabId,
  url,
  className = 'w-full h-full',
  onUrlChange,
  onTitleChange,
  onLoadStart,
  onLoadEnd,
  privacyMode = 'normal',
}: NativeWebViewProps) {
  const webviewRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isTauriRuntime()) {
      // Fallback to iframe for non-Tauri environments
      return;
    }

    let webview: any = null;
    let isMounted = true;

    const createWebView = async () => {
      try {
        if (!Webview || !Window) {
          console.warn('[NativeWebView] Tauri WebView API not available');
          return;
        }

        const appWindow = Window.getCurrent();

        // Get container dimensions
        const container = containerRef.current;
        if (!container) {
          console.error('[NativeWebView] Container not found');
          return;
        }

        const rect = container.getBoundingClientRect();
        const parentRect = container.parentElement?.getBoundingClientRect() || { x: 0, y: 0 };

        // Handle WebView crash - report to Rust and attempt reload
        const handleWebViewCrash = async () => {
          if (!isMounted) return;

          try {
            // Report crash to Rust backend
            const shouldSafeMode = await invoke<boolean>('tabs:record_crash', { id: tabId });

            if (shouldSafeMode) {
              console.warn(
                `[NativeWebView] Tab ${tabId} exceeded crash threshold, entering safe mode`
              );
              setError('This tab has crashed multiple times. Safe mode enabled.');
              return;
            }

            // Attempt to reload after a short delay
            setTimeout(() => {
              if (webviewRef.current && url && isMounted) {
                // Try to reload the WebView
                if (typeof webviewRef.current.reload === 'function') {
                  webviewRef.current.reload().catch((err: any) => {
                    console.error(
                      `[NativeWebView] Failed to reload WebView for tab ${tabId}:`,
                      err
                    );
                    setError('WebView crashed. Please refresh the page.');
                  });
                } else if (typeof webviewRef.current.navigate === 'function') {
                  // Fallback: navigate to same URL
                  webviewRef.current.navigate(url).catch((err: any) => {
                    console.error(
                      `[NativeWebView] Failed to reload WebView for tab ${tabId}:`,
                      err
                    );
                    setError('WebView crashed. Please refresh the page.');
                  });
                }
              }
            }, 1000);
          } catch (error) {
            console.error(`[NativeWebView] Failed to report crash for tab ${tabId}:`, error);
          }
        };

        // Create WebView with unique label per tab
        // Tauri 2.0 WebView API
        webview = new Webview(appWindow, {
          label: `tab-${tabId}`,
          url: url || 'about:blank',
          x: Math.round(rect.left - parentRect.x),
          y: Math.round(rect.top - parentRect.y),
          width: Math.round(rect.width || 800),
          height: Math.round(rect.height || 600),
          transparent: false,
          // Privacy mode settings
          userAgent:
            privacyMode === 'ghost'
              ? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' // Standardized UA for ghost mode
              : undefined,
        });

        // Handle WebView creation (Tauri 2.0 uses promises)
        webview
          .then((wv: any) => {
            if (!isMounted) return;
            webview = wv;
            console.log(`[NativeWebView] WebView created for tab ${tabId}`);
            setIsLoading(false);
            onLoadEnd?.();
            webviewRef.current = webview;

            // Set up crash/error handlers if available
            // Note: Tauri 2.0 WebView API may have different event handling
            // Attempt to listen for crashes/errors
            try {
              if (typeof wv.on === 'function') {
                // Handle WebView crash
                wv.on('crashed', () => {
                  console.error(`[NativeWebView] WebView crashed for tab ${tabId}`);
                  handleWebViewCrash();
                });

                // Handle WebView errors
                wv.on('error', (err: any) => {
                  console.error(`[NativeWebView] WebView error for tab ${tabId}:`, err);
                  handleWebViewCrash();
                });
              }
            } catch (e) {
              // Event handling may not be available in this Tauri version
              console.warn('[NativeWebView] Could not set up crash handlers:', e);
            }
          })
          .catch((err: any) => {
            if (!isMounted) return;
            console.error(`[NativeWebView] Error creating WebView for tab ${tabId}:`, err);
            setError('Failed to create WebView');
            setIsLoading(false);
            // Report crash on creation failure
            handleWebViewCrash();
          });

        // Note: Tauri 2.0 WebView events may use different API
        // Navigation and title changes will be handled via IPC or WebView events

        onLoadStart?.();
      } catch (err) {
        console.error(`[NativeWebView] Failed to create WebView for tab ${tabId}:`, err);
        setError('Failed to create WebView');
        setIsLoading(false);
      }
    };

    createWebView();

    // Cleanup: destroy WebView when component unmounts
    return () => {
      isMounted = false;
      if (webviewRef.current) {
        // Tauri 2.0 WebView close API
        if (typeof webviewRef.current.close === 'function') {
          webviewRef.current
            .close()
            .catch((err: any) =>
              console.error(`[NativeWebView] Error closing WebView for tab ${tabId}:`, err)
            );
        } else if (typeof webviewRef.current.destroy === 'function') {
          webviewRef.current
            .destroy()
            .catch((err: any) =>
              console.error(`[NativeWebView] Error destroying WebView for tab ${tabId}:`, err)
            );
        }
        webviewRef.current = null;
      }
    };
  }, [tabId, url, privacyMode, onUrlChange, onTitleChange, onLoadStart, onLoadEnd]);

  // Update WebView URL when prop changes
  useEffect(() => {
    if (webviewRef.current && url) {
      // Tauri 2.0 WebView navigation
      if (typeof webviewRef.current.navigate === 'function') {
        webviewRef.current
          .navigate(url)
          .catch((err: any) => console.error(`[NativeWebView] Error navigating to ${url}:`, err));
      } else if (typeof webviewRef.current.url === 'function') {
        // Alternative API
        webviewRef.current
          .url(url)
          .catch((err: any) => console.error(`[NativeWebView] Error navigating to ${url}:`, err));
      }
    }
  }, [url]);

  // Update WebView position/size when container resizes
  useEffect(() => {
    if (!webviewRef.current || !containerRef.current) return;

    const updateWebViewSize = () => {
      const container = containerRef.current;
      if (!container || !webviewRef.current) return;

      const rect = container.getBoundingClientRect();
      const parentRect = container.parentElement?.getBoundingClientRect() || { x: 0, y: 0 };

      // Tauri 2.0 WebView position/size API
      if (typeof webviewRef.current.setPosition === 'function') {
        webviewRef.current
          .setPosition({
            x: Math.round(rect.left - parentRect.x),
            y: Math.round(rect.top - parentRect.y),
          })
          .catch(console.error);
      }

      if (typeof webviewRef.current.setSize === 'function') {
        webviewRef.current
          .setSize({ width: Math.round(rect.width), height: Math.round(rect.height) })
          .catch(console.error);
      }
    };

    const resizeObserver = new ResizeObserver(updateWebViewSize);
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Fallback to iframe for non-Tauri
  if (!isTauriRuntime()) {
    return (
      <iframe
        src={url}
        className={className}
        style={{ border: 'none', width: '100%', height: '100%' }}
        onLoad={() => {
          setIsLoading(false);
          onLoadEnd?.();
        }}
      />
    );
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-400" />
            <p className="mt-4 text-sm text-gray-400">Loading {url}...</p>
          </div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-red-900/50">
          <div className="text-center">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        </div>
      )}
      {/* WebView is rendered natively by Tauri, this div is just a container */}
    </div>
  );
}
