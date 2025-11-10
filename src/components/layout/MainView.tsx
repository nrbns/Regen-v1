/**
 * MainView - Browser webview container with real-time updates
 * BrowserView is managed by Electron main process, we show it here
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTabsStore } from '../../state/tabsStore';
import { useAppStore } from '../../state/appStore';
import { ipcEvents } from '../../lib/ipc-events';
import { ipc } from '../../lib/ipc-typed';
import { isDevEnv } from '../../lib/env';

export function MainView() {
  const { activeId, tabs } = useTabsStore();
  const { mode } = useAppStore();
  const containerRef = useRef<HTMLDivElement>(null);
  // Initialize browserReady - if tabs exist, assume ready immediately
  const [browserReady, setBrowserReady] = useState(() => tabs.length > 0);
  const [activeTabUrl, setActiveTabUrl] = useState<string>('');
  const [activeTabTitle, setActiveTabTitle] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const isElectron = useMemo(() => typeof window !== 'undefined' && Boolean((window as any).electron), []);
  const isDev = useMemo(() => isDevEnv(), []);

  const canEmbedInIframe = useMemo(() => {
    if (!activeTabUrl) return false;
    try {
      const url = new URL(activeTabUrl, activeTabUrl.startsWith('http') ? undefined : 'https://localhost');
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }, [activeTabUrl]);

  // Update browser view bounds when container size changes
  useEffect(() => {
    if (!containerRef.current || !activeId) return;

    const updateBounds = () => {
      // BrowserView bounds are managed by main process via setupBrowserViewResize
      // We just ensure the container exists and is ready
      const container = containerRef.current;
      if (container) {
        // Container is ready for BrowserView positioning
        // Main process will position BrowserView based on window bounds
      }
    };

    updateBounds();

    // Listen for window resize to trigger bounds update
    const handleResize = () => {
      updateBounds();
    };
    
    window.addEventListener('resize', handleResize);
    const resizeObserver = new ResizeObserver(updateBounds);
    
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
    };
  }, [activeId, tabs]);

  // Listen for tab updates in real-time
  useEffect(() => {
    const handleTabUpdate = (tabList: any[]) => {
      if (!Array.isArray(tabList)) return;
      
      const activeTab = tabList.find((t: any) => t.id === activeId);
      if (activeTab) {
        setActiveTabUrl(activeTab.url || '');
        setActiveTabTitle(activeTab.title || 'New Tab');
        // Mark as ready immediately when we have an active tab with content
        // Don't wait for URL to load - BrowserView should be visible even for about:blank
        setBrowserReady(true);
        setIsLoading(false);
      } else if (tabList.length > 0) {
        // Tabs exist but no active one - mark as ready anyway
        // The first tab will become active automatically
        setBrowserReady(true);
        setIsLoading(false);
        const firstTab = tabList[0];
        if (firstTab) {
          setActiveTabUrl(firstTab.url || '');
          setActiveTabTitle(firstTab.title || 'New Tab');
        }
      } else if (tabList.length === 0) {
        // No tabs at all
        setBrowserReady(false);
        setIsLoading(false);
        setActiveTabUrl('');
        setActiveTabTitle('');
      }
    };

    // Listen via IPC events
    const unsubscribe = ipcEvents.on('tabs:updated', handleTabUpdate);

    // Also listen for navigation state and progress
    const unsubscribeProgress = ipcEvents.on<{ tabId: string; progress: number }>('tabs:progress', (data) => {
      if (data.tabId === activeId || !data.tabId) {
        setProgress(data.progress);
        setIsLoading(data.progress > 0 && data.progress < 100);
        // When progress starts or completes, BrowserView is ready
        if (data.progress > 0 || data.progress === 100) {
          setBrowserReady(true);
        }
      }
    });

    // Load initial tab data (wait for IPC to be ready)
    const loadInitialData = async () => {
      try {
        // Wait for IPC to be ready before making calls
        if (!window.ipc || typeof window.ipc.invoke !== 'function') {
          // Wait a bit and retry
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        const tabList = await ipc.tabs.list();
        if (Array.isArray(tabList) && tabList.length > 0) {
          handleTabUpdate(tabList);
          setBrowserReady(true);
          setIsLoading(false);
        } else if (tabs.length > 0) {
          // If store has tabs but IPC returned empty, use store data
          setBrowserReady(true);
          setIsLoading(false);
        }
      } catch (error) {
        // Silently handle - will retry on next update
        // On error, if tabs exist in store, mark as ready to avoid stuck loading
        if (tabs.length > 0 && activeId) {
          setBrowserReady(true);
          setIsLoading(false);
        }
      }
    };

    // Delay initial load slightly to allow IPC to initialize
    setTimeout(() => {
      loadInitialData();
    }, 300);

    return () => {
      unsubscribe();
      unsubscribeProgress();
    };
  }, [activeId]);

  // Listen for page title updates
  useEffect(() => {
    if (!activeId) return;

    const interval = setInterval(async () => {
      try {
        const tabList = await ipc.tabs.list();
        const activeTab = tabList.find((t: any) => t.id === activeId);
        if (activeTab) {
          if (activeTab.title !== activeTabTitle) {
            setActiveTabTitle(activeTab.title || 'New Tab');
          }
          if (activeTab.url !== activeTabUrl) {
            setActiveTabUrl(activeTab.url || '');
          }
        }
      } catch (error) {
        // Silent fail
      }
    }, 500); // Poll every 500ms for updates

    return () => clearInterval(interval);
  }, [activeId, activeTabTitle, activeTabUrl]);

  // Auto-hide loading overlay immediately when tabs exist
  useEffect(() => {
    if (tabs.length > 0) {
      // Tabs exist - BrowserView should be visible
      setBrowserReady(true);
      setIsLoading(false);
    } else {
      // No tabs, show empty state
      setBrowserReady(false);
      setIsLoading(false);
    }
  }, [tabs.length]);

  // Show browser view container even when no active tab (for BrowserView positioning)
  // Empty state overlay is handled by OmniDesk component

  return (
    <div ref={containerRef} className="flex-1 relative bg-white overflow-hidden w-full">
      {/* Browser Webview Container - Full Width */}
      {/* BrowserView is rendered by Electron main process and positioned by window coordinates */}
      {/* This container div is just for reference - BrowserView uses window coordinates, not DOM coordinates */}
      <div
        id="browser-view-container"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* In non-Electron builds (e.g., web preview) render a safe iframe fallback */}
      {!isElectron && canEmbedInIframe && (
        <iframe
          key={activeTabUrl}
          src={activeTabUrl}
          title={activeTabTitle || activeTabUrl}
          className="absolute inset-0 h-full w-full border-0"
          style={{ zIndex: 1, pointerEvents: 'auto' }}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      )}

      {!isElectron && !canEmbedInIframe && activeTabUrl && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/95 px-6 text-center text-sm text-gray-600" style={{ zIndex: 1 }}>
          <span className="text-base font-medium text-gray-800">Preview unavailable for this URL</span>
          <p>
            The current site cannot be embedded in a web preview. Open OmniBrowser desktop or copy the link below to view it.
          </p>
          <code className="max-w-full break-all rounded bg-gray-100 px-3 py-1 text-xs text-gray-700">{activeTabUrl}</code>
        </div>
      )}
      
      {/* Loading indicator overlay - Only show at top, don't block BrowserView */}
      {isLoading && activeId && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200 z-50 pointer-events-none">
          <div 
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Fallback content when no active tab - Only show when truly no tabs */}
      {(!activeId || tabs.length === 0) && (
        <div className="absolute inset-0 h-full w-full flex items-center justify-center bg-white" style={{ zIndex: 2, pointerEvents: 'auto' }}>
          <div className="text-center">
            <div className="text-6xl mb-4 animate-pulse">🌐</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              OmniBrowser
            </h2>
            <p className="text-gray-500 text-sm">
              Enter a URL or search to get started
            </p>
          </div>
        </div>
      )}
      
      {/* Loading overlay - Only show briefly on initial load if no tabs exist yet */}
      {/* Once tabs exist, BrowserView should be visible immediately */}
      {tabs.length === 0 && !browserReady && (
        <div 
          className="absolute inset-0 h-full w-full flex items-center justify-center bg-white transition-opacity duration-300" 
          style={{ 
            zIndex: 2, 
            pointerEvents: 'none',
          }}
        >
          <div className="text-center">
            <div className="text-6xl mb-4 animate-pulse">🌐</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              OmniBrowser
            </h2>
            <p className="text-gray-500 text-sm">
              Initializing...
            </p>
          </div>
        </div>
      )}
      

      {/* Debug info (can be removed in production) */}
      {isDev && activeTabUrl && activeId && (
        <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded opacity-50 hover:opacity-100 transition-opacity z-50 pointer-events-none">
          {activeTabTitle} - {activeTabUrl}
        </div>
      )}
    </div>
  );
}
