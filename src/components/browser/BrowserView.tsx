/**
 * Unified BrowserView Component
 * Real web browser engine for all modes (Browse, Research, Trade)
 * Uses iframes to load actual websites - no proxies, no fake dashboards
 */

import { useEffect, useRef, useState, Suspense } from 'react';
// import { useTabsStore } from '../../state/tabsStore'; // Unused
import { useSettingsStore } from '../../state/settingsStore';
import { Loader2 } from 'lucide-react';

interface BrowserViewProps {
  url?: string;
  mode?: 'browse' | 'research' | 'trade';
  className?: string;
  onUrlChange?: (url: string) => void;
  onTitleChange?: (title: string) => void;
}

export default function BrowserView({
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

  // WEEK 1 TASK 3: Wrap iframe in Suspense to prevent white screens
  const IframeContent = () => (
    <iframe
      ref={iframeRef}
      src={currentUrl}
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
              <p className="mt-4 text-sm text-gray-400">Loading {currentUrl}...</p>
            </div>
          </div>
        }
      >
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900">
            <div className="text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-400" />
              <p className="mt-4 text-sm text-gray-400">Loading {currentUrl}...</p>
            </div>
          </div>
        )}
        <IframeContent />
      </Suspense>
    </div>
  );
}
