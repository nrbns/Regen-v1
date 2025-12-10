/**
 * Enhanced Tab Manager Component
 * Integrates error pages, loading indicators, and navigation controls
 */

import { useState, useEffect } from 'react';
import { ErrorPage } from './ErrorPage';
import { LoadingIndicator } from './LoadingIndicator';
import { NavigationControls } from './NavigationControls';
import { TabPreview } from './TabPreview';
import { useTabsStore } from '../../state/tabsStore';
import { ipc } from '../../lib/ipc-typed';
import type { Tab } from '../../state/tabsStore';

export interface EnhancedTabManagerProps {
  tab: Tab | null;
  children: React.ReactNode;
  onNavigate?: (url: string) => void;
  className?: string;
}

export interface TabError {
  code?: string;
  message?: string;
  url?: string;
}

export function EnhancedTabManager({
  tab,
  children,
  onNavigate,
  className,
}: EnhancedTabManagerProps) {
  const [error, setError] = useState<TabError | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewPosition, _setPreviewPosition] = useState<{ x: number; y: number } | null>(null);

  const { goBack, goForward, canGoBack, canGoForward } = useTabsStore();

  // Listen for iframe load events
  useEffect(() => {
    if (!tab?.id) return;

    const handleLoadStart = () => {
      setLoading(true);
      setError(null);
      setLoadProgress(0);
    };

    const handleLoadProgress = (progress: number) => {
      setLoadProgress(progress);
    };

    const handleLoadComplete = () => {
      setLoading(false);
      setLoadProgress(100);
      setTimeout(() => setLoadProgress(0), 300);
    };

    const handleError = (errorEvent: CustomEvent<TabError>) => {
      setLoading(false);
      setError(errorEvent.detail);
    };

    const handleBlocked = (blockedEvent: CustomEvent<{ tabId: string; url?: string }>) => {
      if (blockedEvent.detail.tabId === tab.id) {
        setLoading(false);
        setError({
          code: 'X-Frame-Options',
          message: 'This page cannot be displayed in a frame',
          url: blockedEvent.detail.url || tab.url,
        });
      }
    };

    window.addEventListener('iframe:loadstart', handleLoadStart as EventListener);
    window.addEventListener('iframe:progress', handleLoadProgress as unknown as EventListener);
    window.addEventListener('iframe:load', handleLoadComplete);
    window.addEventListener('iframe:error', handleError as EventListener);
    window.addEventListener('iframe-blocked', handleBlocked as EventListener);

    return () => {
      window.removeEventListener('iframe:loadstart', handleLoadStart as EventListener);
      window.removeEventListener('iframe:progress', handleLoadProgress as unknown as EventListener);
      window.removeEventListener('iframe:load', handleLoadComplete);
      window.removeEventListener('iframe:error', handleError as EventListener);
      window.removeEventListener('iframe-blocked', handleBlocked as EventListener);
    };
  }, [tab?.id, tab?.url]);

  const handleRetry = async () => {
    if (!tab?.url) return;
    setError(null);
    setLoading(true);

    try {
      if (onNavigate) {
        onNavigate(tab.url);
      } else {
        await ipc.tabs.navigate(tab.id, tab.url);
      }
    } catch {
      setError({
        code: 'RETRY_FAILED',
        message: 'Failed to reload page',
        url: tab.url,
      });
    }
  };

  const handleGoHome = () => {
    if (onNavigate) {
      onNavigate('about:blank');
    } else if (tab?.id) {
      ipc.tabs.navigate(tab.id, 'about:blank').catch(console.error);
    }
  };

  const handleBack = () => {
    if (tab?.id) {
      goBack(tab.id);
    }
  };

  const handleForward = () => {
    if (tab?.id) {
      goForward(tab.id);
    }
  };

  const handleReload = async () => {
    if (!tab?.id) return;
    try {
      await ipc.tabs.reload(tab.id);
    } catch (err) {
      console.error('Failed to reload tab:', err);
    }
  };

  return (
    <div className={`relative h-full w-full ${className || ''}`}>
      {/* Navigation Controls */}
      {tab && (
        <div className="absolute left-2 top-2 z-20">
          <NavigationControls
            tab={tab}
            canGoBack={tab ? canGoBack(tab.id) : false}
            canGoForward={tab ? canGoForward(tab.id) : false}
            isLoading={loading}
            onBack={handleBack}
            onForward={handleForward}
            onReload={handleReload}
            onHome={handleGoHome}
          />
        </div>
      )}

      {/* Error Page */}
      {error && <ErrorPage error={error} onRetry={handleRetry} onGoHome={handleGoHome} />}

      {/* Loading Indicator */}
      {loading && !error && <LoadingIndicator progress={loadProgress} message="Loading page..." />}

      {/* Tab Content */}
      {!error && <div className="h-full w-full">{children}</div>}

      {/* Tab Preview (hover) */}
      {tab && previewVisible && previewPosition && (
        <TabPreview
          tab={tab}
          visible={previewVisible}
          position={previewPosition}
          onClose={() => setPreviewVisible(false)}
          onNavigate={url => {
            if (onNavigate) {
              onNavigate(url);
            } else if (tab.id) {
              ipc.tabs.navigate(tab.id, url).catch(console.error);
            }
            setPreviewVisible(false);
          }}
          onReload={handleReload}
        />
      )}
    </div>
  );
}
