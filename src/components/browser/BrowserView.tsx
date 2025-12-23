/**
 * Unified BrowserView Component
 * Real web browser engine for all modes (Browse, Research, Trade)
 * Uses native Tauri WebView (if available) or falls back to iframes
 *
 * Architecture:
 * - In Tauri: Uses native WebView instances (better performance, isolation)
 * - In web: Falls back to iframes (for development/testing)
 */

import { useEffect, useRef, useState, Suspense } from 'react';
import { useTabsStore } from '../../state/tabsStore';
import { useSettingsStore } from '../../state/settingsStore';
import { isTauriRuntime } from '../../lib/env';
import { Loader2 } from 'lucide-react';
import { NativeWebView } from './NativeWebView';

interface BrowserViewProps {
  tabId?: string; // Tab ID from Rust TabManager
  url?: string;
  mode?: 'browse' | 'research' | 'trade';
  className?: string;
  onUrlChange?: (url: string) => void;
  onTitleChange?: (title: string) => void;
}

export default function BrowserView({
  tabId,
  url,
  mode: _mode = 'browse',
  className = 'w-full h-full',
  onUrlChange,
  onTitleChange,
}: BrowserViewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [currentUrl, setCurrentUrl] = useState(url || 'https://www.google.com');
  const [isLoading, setIsLoading] = useState(true);
  const privacySettings = useSettingsStore(state => state.privacy);
  const privacyMode = privacySettings.trackerProtection && privacySettings.adBlockEnabled;

  // Get active tab if tabId not provided
  const activeTab = useTabsStore(state =>
    tabId ? state.tabs.find(t => t.id === tabId) : state.tabs.find(t => t.active)
  );

  // Use tab URL if available, otherwise use prop URL
  const displayUrl = activeTab?.url || currentUrl;
  const displayTabId = tabId || activeTab?.id || 'default';
  const displayPrivacyMode = (activeTab?.mode || 'normal') as 'normal' | 'private' | 'ghost';

  // Update URL when prop changes
  useEffect(() => {
    if (url && url !== currentUrl) {
      setCurrentUrl(url);
    }
  }, [url]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    // Handle navigation events
    const handleLoad = () => {
      setIsLoading(false);
      try {
        const iframeUrl = iframe.contentWindow?.location.href || currentUrl;
        if (iframeUrl && iframeUrl !== currentUrl) {
          setCurrentUrl(iframeUrl);
          onUrlChange?.(iframeUrl);
        }
      } catch {
        // Cross-origin - can't access URL, use currentUrl
      }
    };

    // Handle title changes (for pages that allow it)
    const handleTitleChange = () => {
      try {
        const title = iframe.contentDocument?.title;
        if (title) {
          onTitleChange?.(title);
        }
      } catch {
        // Cross-origin - can't access document
      }
    };

    iframe.addEventListener('load', handleLoad);

    // Try to observe title changes (may not work for cross-origin)
    const observer = new MutationObserver(handleTitleChange);
    try {
      if (iframe.contentDocument) {
        observer.observe(iframe.contentDocument.head, {
          childList: true,
          subtree: true,
        });
      }
    } catch {
      // Cross-origin - can't observe
    }

    return () => {
      iframe.removeEventListener('load', handleLoad);
      observer.disconnect();
    };
  }, [currentUrl, onUrlChange, onTitleChange]);

  // Build sandbox attributes based on mode and privacy
  const sandboxAttrs = privacyMode
    ? [
        'allow-same-origin',
        'allow-scripts',
        'allow-forms',
        'allow-popups',
        'allow-popups-to-escape-sandbox',
        'allow-modals',
        'allow-downloads',
      ]
    : [
        'allow-same-origin',
        'allow-scripts',
        'allow-forms',
        'allow-popups',
        'allow-popups-to-escape-sandbox',
        'allow-modals',
        'allow-downloads',
        'allow-top-navigation',
        'allow-top-navigation-by-user-activation',
      ];

  // Use native WebView in Tauri, fallback to iframe in web
  if (isTauriRuntime()) {
    return (
      <NativeWebView
        tabId={displayTabId}
        url={displayUrl}
        className={className}
        privacyMode={displayPrivacyMode}
        onUrlChange={newUrl => {
          setCurrentUrl(newUrl);
          onUrlChange?.(newUrl);
        }}
        onTitleChange={onTitleChange}
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => setIsLoading(false)}
      />
    );
  }

  // Fallback: iframe for non-Tauri environments (web dev/testing)
  const IframeContent = () => (
    <iframe
      ref={iframeRef}
      src={displayUrl}
      className="h-full w-full border-0"
      sandbox={sandboxAttrs.join(' ')}
      allow="fullscreen; autoplay; camera; microphone; geolocation; payment; clipboard-read; clipboard-write; display-capture; storage-access"
      style={{ background: '#000' }}
      onLoad={() => setIsLoading(false)}
    />
  );

  return (
    <div className={`relative ${className}`}>
      <Suspense
        fallback={
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900">
            <div className="text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-400" />
              <p className="mt-4 text-sm text-gray-400">Loading {displayUrl}...</p>
            </div>
          </div>
        }
      >
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900">
            <div className="text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-400" />
              <p className="mt-4 text-sm text-gray-400">Loading {displayUrl}...</p>
            </div>
          </div>
        )}
        <IframeContent />
      </Suspense>
    </div>
  );
}
