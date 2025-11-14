/**
 * MainView - Browser webview container with real-time updates
 * BrowserView is managed by Electron main process, we show it here
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTabsStore } from '../../state/tabsStore';
import { ipcEvents } from '../../lib/ipc-events';
import { ipc } from '../../lib/ipc-typed';
import { isDevEnv } from '../../lib/env';

export function MainView() {
  const { activeId, tabs } = useTabsStore();
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
    // Don't embed about:blank or internal URLs
    if (activeTabUrl === 'about:blank' || activeTabUrl.startsWith('about:') || 
        activeTabUrl.startsWith('ob://') || activeTabUrl.startsWith('chrome:')) {
      return false;
    }
    try {
      const url = new URL(activeTabUrl, activeTabUrl.startsWith('http') ? undefined : 'https://localhost');
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }, [activeTabUrl]);
  
  const isAboutBlank = useMemo(() => {
    return !activeTabUrl || 
           activeTabUrl === 'about:blank' || 
           activeTabUrl.startsWith('about:') ||
           activeTabUrl.startsWith('ob://newtab') ||
           activeTabUrl.startsWith('ob://home');
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
    const loadInitialData = async (retryCount = 0) => {
      const MAX_RETRIES = 3;
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
        // Retry with exponential backoff
        if (retryCount < MAX_RETRIES) {
          const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
          setTimeout(() => {
            loadInitialData(retryCount + 1);
          }, delay);
        } else {
          // Max retries reached - use store data as fallback
          if (tabs.length > 0 && activeId) {
            setBrowserReady(true);
            setIsLoading(false);
          }
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
      } catch {
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
      {/* Browser Webview Container - always present so BrowserView can render immediately */}
      <div
        id="browser-view-container"
        data-active={!isAboutBlank}
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
      <AnimatePresence>
        {isLoading && activeId && (
          <motion.div 
            className="absolute top-0 left-0 right-0 h-1 z-50 pointer-events-none"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
          >
            <div className="h-full bg-slate-800/30">
              <motion.div 
                className="h-full bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500"
                initial={{ width: '0%' }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fallback content when no active tab - Only show when truly no tabs */}
      {(!activeId || tabs.length === 0) && (
        <motion.div 
          className="absolute inset-0 h-full w-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900" 
          style={{ zIndex: 2, pointerEvents: 'auto' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div 
            className="text-center max-w-2xl px-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <motion.div 
              className="text-7xl mb-8"
              animate={{ 
                scale: [1, 1.05, 1],
                rotate: [0, 2, -2, 0],
              }}
              transition={{ 
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              🌐
            </motion.div>
            <motion.h2 
              className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              Welcome to OmniBrowser
            </motion.h2>
            <motion.p 
              className="text-slate-600 dark:text-slate-400 text-base mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Your intelligent browser with AI-powered research, privacy protection, and seamless browsing
            </motion.p>
            <motion.div
              className="flex flex-wrap gap-3 justify-center mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <motion.button
                onClick={async () => {
                  try {
                    await ipc.tabs.create('about:blank');
                  } catch {
                    // Fallback handled
                  }
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-lg transition-colors"
              >
                New Tab
              </motion.button>
              <motion.button
                onClick={() => {
                  const input = document.querySelector('[data-omnibox-input]') as HTMLInputElement;
                  input?.focus();
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-slate-100 rounded-lg font-medium shadow-lg transition-colors"
              >
                Search or Enter URL
              </motion.button>
            </motion.div>
            <motion.div
              className="flex flex-wrap gap-3 justify-center text-sm text-slate-500 dark:text-slate-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <span className="flex items-center gap-1">
                <kbd className="px-2 py-1 bg-slate-200 dark:bg-slate-800 rounded text-xs font-mono">Ctrl+T</kbd>
                <span>New tab</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <kbd className="px-2 py-1 bg-slate-200 dark:bg-slate-800 rounded text-xs font-mono">Ctrl+L</kbd>
                <span>Search</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <kbd className="px-2 py-1 bg-slate-200 dark:bg-slate-800 rounded text-xs font-mono">Ctrl+K</kbd>
                <span>Ask Redix</span>
              </span>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
      
      {/* Loading overlay - Only show briefly on initial load if no tabs exist yet */}
      {/* Once tabs exist, BrowserView should be visible immediately */}
      {tabs.length === 0 && !browserReady && (
        <motion.div 
          className="absolute inset-0 h-full w-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" 
          style={{ 
            zIndex: 2, 
            pointerEvents: 'none',
          }}
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div 
            className="text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <motion.div 
              className="text-6xl mb-4"
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              🌐
            </motion.div>
            <motion.h2 
              className="text-xl font-semibold text-slate-100 mb-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              OmniBrowser
            </motion.h2>
            <motion.p 
              className="text-slate-400 text-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Initializing...
            </motion.p>
            <motion.div
              className="mt-4 w-48 h-1 bg-slate-700/50 rounded-full overflow-hidden mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500"
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
            </motion.div>
          </motion.div>
        </motion.div>
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
