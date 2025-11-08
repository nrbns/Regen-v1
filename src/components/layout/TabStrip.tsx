/**
 * TabStrip - Floating tab bar with Arc-like design
 * Fully functional tab management with real-time updates
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus } from 'lucide-react';
import { ipc } from '../../lib/ipc-typed';
import { useTabsStore } from '../../state/tabsStore';
import { ipcEvents } from '../../lib/ipc-events';
import { TabHoverCard } from '../TopNav/TabHoverCard';
import { TabContextMenu } from './TabContextMenu';

interface Tab {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  active: boolean;
}

export function TabStrip() {
  const { tabs: storeTabs, setAll: setAllTabs, setActive: setActiveTab, activeId } = useTabsStore();
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [contextMenu, setContextMenu] = useState<{ tabId: string; url: string; x: number; y: number } | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  const isRestoringRef = useRef(false);
  const isCreatingTabRef = useRef(false); // Prevent infinite tab creation loops
  const previousTabIdsRef = useRef<string>(''); // Track tab IDs to prevent unnecessary updates
  const currentActiveIdRef = useRef<string | null>(null); // Track active ID without causing re-renders
  const activationInFlightRef = useRef<string | null>(null); // Track activations to avoid duplicate work
  const stripRef = (typeof window !== 'undefined') ? (window as any).__tabStripRef || { current: null } : { current: null } as React.RefObject<HTMLDivElement> as any;
  
  // Keep ref in sync with activeId (doesn't cause re-renders)
  useEffect(() => {
    currentActiveIdRef.current = activeId;
  }, [activeId]);

  const refreshTabsFromMain = useCallback(async () => {
    try {
      const tabList = await ipc.tabs.list();
      if (!Array.isArray(tabList)) return;

      const mappedTabs = tabList.map((t: any) => ({
        id: t.id,
        title: t.title || 'New Tab',
        url: t.url || 'about:blank',
        active: t.active || false,
        mode: t.mode || 'normal',
      }));

      const ids = mappedTabs.map(t => t.id).sort().join(',');
      previousTabIdsRef.current = ids;

      setTabs(mappedTabs);
      tabsRef.current = mappedTabs;
      setAllTabs(mappedTabs.map(t => ({ id: t.id, title: t.title, active: t.active, url: t.url, mode: t.mode })));

      const activeTab = mappedTabs.find(t => t.active);
      if (activeTab) {
        setActiveTab(activeTab.id);
        currentActiveIdRef.current = activeTab.id;
      } else if (mappedTabs.length === 0) {
        setActiveTab(null);
        currentActiveIdRef.current = null;
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[TabStrip] Failed to refresh tabs from main process:', error);
      }
    }
  }, [setActiveTab, setAllTabs]);

  // Wait for IPC to be ready before making calls
  useEffect(() => {
    let isMounted = true;
    let ipcReady = false;
    
    const waitForIPC = () => {
      return new Promise<void>((resolve) => {
        if (window.ipc && typeof (window.ipc as any).invoke === 'function') {
          ipcReady = true;
          resolve();
          return;
        }
        
        const checkIPC = () => {
          if (window.ipc && typeof (window.ipc as any).invoke === 'function') {
            ipcReady = true;
            resolve();
          }
        };
        
        // Listen for IPC ready signal
        window.addEventListener('ipc:ready', checkIPC, { once: true });
        
        // Also check periodically (fallback)
        const interval = setInterval(() => {
          if (window.ipc && typeof (window.ipc as any).invoke === 'function') {
            clearInterval(interval);
            ipcReady = true;
            resolve();
          }
        }, 100);
        
        // Timeout after 5 seconds
        setTimeout(() => {
          clearInterval(interval);
          if (!ipcReady) {
            console.warn('IPC not ready after 5 seconds, proceeding anyway');
            resolve();
          }
        }, 5000);
      });
    };
    
    const loadTabs = async (isInitialLoad = false) => {
      if (!isMounted) return;
      
      // CRITICAL: Don't load tabs if we're creating one (prevents loops)
      if (isCreatingTabRef.current && !isInitialLoad) {
        return;
      }
      
      // Wait for IPC to be ready
      if (!ipcReady) {
        await waitForIPC();
      }
      
      if (!isMounted) return;
      
      try {
        const tabList = await ipc.tabs.list();
        if (!isMounted) return;
        
        if (Array.isArray(tabList) && tabList.length > 0) {
          const mappedTabs = tabList.map((t: any) => ({
            id: t.id,
            title: t.title || 'New Tab',
            url: t.url || 'about:blank',
            active: t.active || false,
          }));
          
          // Update ref to track tab IDs and only update state if changed
          const tabIds = mappedTabs.map(t => t.id).sort().join(',');
          if (previousTabIdsRef.current !== tabIds) {
            previousTabIdsRef.current = tabIds;
            setTabs(mappedTabs);
            setAllTabs(mappedTabs.map(t => ({ id: t.id, title: t.title, active: t.active, url: t.url, mode: t.mode })));
          }
          
          // Set active tab in store (only if changed - use ref to avoid dependency)
          const activeTab = mappedTabs.find(t => t.active);
          const currentActive = currentActiveIdRef.current;
          if (activeTab && activeTab.id !== currentActive) {
            setActiveTab(activeTab.id);
          } else if (mappedTabs.length > 0 && !activeTab && mappedTabs[0] && mappedTabs[0].id !== currentActive) {
            // No active tab, activate first one
            await ipc.tabs.activate({ id: mappedTabs[0].id });
            setActiveTab(mappedTabs[0].id);
          }
          
          if (isInitialLoad) {
            setHasInitialized(true);
          }
        } else {
          // Only create initial tab on first mount, not every time tabs are empty
          // AND only if we're not restoring from session
          // AND only if we're not already creating a tab
          // AND only if we haven't already initialized (prevent HMR duplicates)
          if (isInitialLoad && !hasInitialized && !isRestoringRef.current && !isCreatingTabRef.current) {
            // Always wait a bit to allow session restoration to complete
            // This prevents creating duplicate tabs during HMR or session restore
            setTimeout(async () => {
              // Double-check conditions after delay
              if (!isMounted || hasInitialized || isRestoringRef.current || isCreatingTabRef.current) {
                return;
              }
              
              // Check again if tabs exist after waiting (they might have been restored)
              try {
                const recheckTabs = await ipc.tabs.list();
                if (Array.isArray(recheckTabs) && recheckTabs.length > 0) {
                  // Tabs exist (restored from session or created elsewhere), don't create new one
                  setHasInitialized(true);
                  return;
                }
              } catch (e) {
                // Ignore errors, proceed to create tab
              }
              
              // Still no tabs after waiting, create one
              isCreatingTabRef.current = true;
              setHasInitialized(true);
              
              try {
                // Ensure IPC is ready
                if (!window.ipc || typeof (window.ipc as any).invoke !== 'function') {
                  await new Promise(resolve => setTimeout(resolve, 200));
                }
                
                const result = await ipc.tabs.create('about:blank');
                if (result && result.id) {
                  if (process.env.NODE_ENV === 'development') {
                    console.log('[TabStrip] Initial tab created after wait:', result.id);
                  }
                }
              } catch (error) {
                if (process.env.NODE_ENV === 'development') {
                  console.error('[TabStrip] Failed to create initial tab:', error);
                }
              } finally {
                setTimeout(() => {
                  isCreatingTabRef.current = false;
                }, 1000);
              }
            }, 300); // Wait 300ms to allow session restoration
          } else {
            // No tabs and we've already initialized - just clear state
            if (isMounted) {
              setTabs([]);
              setAllTabs([]);
              setActiveTab(null);
              if (!hasInitialized) {
                setHasInitialized(true);
              }
            }
          }
        }
      } catch (error) {
        // Silently handle errors - don't auto-create tab on error
        if (isInitialLoad && isMounted && !hasInitialized) {
          setHasInitialized(true);
        }
      }
    };

    // Listen for session restoration state (only once)
    const handleRestoring = (restoring: boolean) => {
      if (isMounted) {
        isRestoringRef.current = restoring;
      }
    };
    
    const unsubscribeRestoring = ipcEvents.on<boolean>('session:restoring', handleRestoring);
    
    // Listen for restore tab messages (only once)
    const handleRestoreTab = async (tabState: any) => {
      if (!isMounted || isCreatingTabRef.current) return;
      
      isCreatingTabRef.current = true;
      try {
        await ipc.tabs.create(tabState.url || 'about:blank');
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to restore tab from session:', error);
        }
      } finally {
        // Reset flag after a delay
        setTimeout(() => {
          isCreatingTabRef.current = false;
        }, 500);
      }
    };
    
    const unsubscribeRestoreTab = ipcEvents.on<any>('session:restore-tab', handleRestoreTab);

    // Initial load only - don't auto-create tabs on subsequent updates
    // Add a small delay to ensure session restoration has a chance to complete first
    const initTimer = setTimeout(() => {
      loadTabs(true);
    }, 100);

    // Listen for tab updates via IPC events (more reliable)
    // IPC events are the source of truth - always sync with them
    const handleTabUpdate = (tabList: any[]) => {
      // Don't process updates if component is unmounted or invalid data
      if (!isMounted || !Array.isArray(tabList)) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[TabStrip] handleTabUpdate: Invalid data or unmounted', { isMounted, tabList });
        }
        return;
      }
      
      // Only log in development if there's a significant change or error
      if (process.env.NODE_ENV === 'development' && false) { // Disabled to reduce console noise
        console.log('[TabStrip] handleTabUpdate received:', tabList.map(t => ({ id: t.id, active: t.active })));
      }
      
      const mappedTabs = tabList.map((t: any) => ({
        id: t.id,
        title: t.title || 'New Tab',
        url: t.url || 'about:blank',
        active: t.active || false,
      }));
      
      // Find the active tab from IPC (source of truth)
      const activeTabFromIPC = mappedTabs.find(t => t.active);
      const activeTabIdFromIPC = activeTabFromIPC?.id || null;
      
      // Compare tab IDs to detect if tabs were added/removed
      const newTabIds = mappedTabs.map(t => t.id).sort().join(',');
      const currentTabIds = previousTabIdsRef.current;
      
      // Always update tabs array to reflect current state from main process
      // This ensures UI stays in sync even if optimistic updates were wrong
      setTabs(mappedTabs);
      tabsRef.current = mappedTabs;
      setAllTabs(mappedTabs.map(t => ({ id: t.id, title: t.title, active: t.active, url: t.url, mode: t.mode })));
      
      // Update previousTabIdsRef to track changes
      if (currentTabIds !== newTabIds) {
        previousTabIdsRef.current = newTabIds;
      }
      
      // ALWAYS sync active tab with IPC (main process is source of truth)
      // This overrides any optimistic updates
      if (activeTabIdFromIPC) {
        if (currentActiveIdRef.current !== activeTabIdFromIPC || activeId !== activeTabIdFromIPC) {
          // Sync active tab from IPC (main process is source of truth)
          setActiveTab(activeTabIdFromIPC);
          currentActiveIdRef.current = activeTabIdFromIPC;
        }
      } else if (mappedTabs.length > 0) {
        // No active tab in IPC, but tabs exist - activate first one
        const firstTabId = mappedTabs[0].id;
        if (currentActiveIdRef.current !== firstTabId && activeId !== firstTabId) {
          // Don't call IPC here - main process should handle this
          // Just update UI to match
          setActiveTab(firstTabId);
          currentActiveIdRef.current = firstTabId;
        }
      } else {
        // No tabs at all
        if (currentActiveIdRef.current !== null || activeId !== null) {
          setActiveTab(null);
          currentActiveIdRef.current = null;
        }
      }
    };

    // Subscribe to IPC events via the event bus (only once)
    const unsubscribe = ipcEvents.on('tabs:updated', handleTabUpdate);
      
    // Fallback polling if events don't work (less frequent) - reduced frequency
    // Only poll to sync state, don't auto-create tabs
    // Note: We can poll even when creating tabs - loadTabs won't create duplicate tabs
    const pollInterval = setInterval(() => {
      if (isMounted && ipcReady && hasInitialized) {
        // Only skip if actively creating to avoid race conditions during creation
        if (!isCreatingTabRef.current) {
          loadTabs(false).catch(() => {}); // Silent error handling
        }
      }
    }, 10000); // Poll every 10 seconds as fallback (reduced frequency)
      
    return () => {
      isMounted = false;
      unsubscribe();
      unsubscribeRestoring();
      unsubscribeRestoreTab();
      clearInterval(pollInterval);
      clearTimeout(initTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run on mount, IPC events handle all updates

  const addTab = async () => {
    // Prevent multiple simultaneous tab creations (debounce)
    if (isCreatingTabRef.current) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[TabStrip] Tab creation already in progress, skipping');
      }
      return;
    }
    
    isCreatingTabRef.current = true;
    try {
      // Ensure IPC is ready
      if (!window.ipc || typeof (window.ipc as any).invoke !== 'function') {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      const result = await ipc.tabs.create('about:blank');
      if (result && result.id) {
        // Tab created successfully - IPC event will update the UI
        if (process.env.NODE_ENV === 'development') {
          console.log('[TabStrip] Tab created via addTab:', result.id);
        }
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[TabStrip] Tab creation returned no ID:', result);
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to create tab:', error);
      }
    } finally {
      // Reset flag quickly - IPC events will handle the update
      // Don't wait too long or we'll block legitimate updates
      setTimeout(() => {
        isCreatingTabRef.current = false;
      }, 100); // Reduced from 500ms to 100ms
    }
  };

  const closeTab = async (tabId: string) => {
    // Prevent closing if already creating a tab
    if (isCreatingTabRef.current) {
      return;
    }

    // Get current tabs
    const currentTabs = tabsRef.current.length > 0 ? tabsRef.current : tabs;
    const tabToClose = currentTabs.find(t => t.id === tabId);
    if (!tabToClose) {
      return;
    }

    const wasActive = tabToClose.active;
    const tabIndex = currentTabs.findIndex(t => t.id === tabId);
    const remainingTabs = currentTabs.filter(t => t.id !== tabId);
    const snapshotTabs = currentTabs.map(t => ({ ...t }));
    const previousActiveId = currentActiveIdRef.current;
    
    // Update UI immediately (optimistic update)
    setTabs(remainingTabs);
    tabsRef.current = remainingTabs;
    previousTabIdsRef.current = remainingTabs.map(t => t.id).sort().join(',');
    setAllTabs(remainingTabs.map(t => ({ id: t.id, title: t.title, active: t.active, url: t.url, mode: t.mode })));

    // If closing active tab, activate the next one
    if (wasActive && remainingTabs.length > 0) {
      const nextTabIndex = Math.min(tabIndex, remainingTabs.length - 1);
      const nextTab = remainingTabs[nextTabIndex];
      if (nextTab) {
        setActiveTab(nextTab.id);
        currentActiveIdRef.current = nextTab.id;
      }
    } else if (remainingTabs.length === 0) {
      setActiveTab(null);
      currentActiveIdRef.current = null;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[TabStrip] Closing tab (optimistic):', tabId, 'previous active:', previousActiveId);
    }

    try {
      const result = await Promise.race([
        ipc.tabs.close({ id: tabId }),
        new Promise<{ success: boolean; error?: string }>((resolve) =>
          setTimeout(() => resolve({ success: false, error: 'Timeout' }), 2000)
        ),
      ]);

      if (process.env.NODE_ENV === 'development') {
        console.log('[TabStrip] tabs.close result:', result);
      }

      if (!result || !result.success) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[TabStrip] Tab close failed or timed out, reverting:', tabId, result?.error);
        }

        setTabs(snapshotTabs);
        tabsRef.current = snapshotTabs;
        previousTabIdsRef.current = snapshotTabs.map(t => t.id).sort().join(',');
        setAllTabs(snapshotTabs.map(t => ({ id: t.id, title: t.title, active: t.active, url: t.url, mode: t.mode })));

        if (previousActiveId) {
          setActiveTab(previousActiveId);
          currentActiveIdRef.current = previousActiveId;
        }

        await refreshTabsFromMain();
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[TabStrip] Exception during tab close, reverting:', error);
      }

      setTabs(snapshotTabs);
      tabsRef.current = snapshotTabs;
      previousTabIdsRef.current = snapshotTabs.map(t => t.id).sort().join(',');
      setAllTabs(snapshotTabs.map(t => ({ id: t.id, title: t.title, active: t.active, url: t.url, mode: t.mode })));

      if (previousActiveId) {
        setActiveTab(previousActiveId);
        currentActiveIdRef.current = previousActiveId;
      }

      await refreshTabsFromMain();
    }
  };

  const activateTab = async (tabId: string) => {
    // Prevent activating if already the active tab
    if (activeId === tabId || activationInFlightRef.current === tabId) {
      return;
    }

    // Get current tabs from ref (most up-to-date)
    const currentTabs = tabsRef.current.length > 0 ? tabsRef.current : tabs;
    const tabToActivate = currentTabs.find(t => t.id === tabId);
    if (!tabToActivate) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[TabStrip] Tab not found for activation:', tabId, 'Available tabs:', currentTabs.map(t => t.id));
      }
      return;
    }

    activationInFlightRef.current = tabId;

    // Optimistically update active tab for immediate feedback
    // Note: IPC event will confirm/correct this, so we don't need to worry about conflicts
    const previousActiveId = currentActiveIdRef.current;
    const snapshotTabs = currentTabs.map(t => ({ ...t }));

    // Update UI immediately for responsiveness
    setActiveTab(tabId);
    currentActiveIdRef.current = tabId;
    
    // Update tabs array to reflect active state optimistically
    const updatedTabs = currentTabs.map(t => ({
      ...t,
      active: t.id === tabId
    }));
    setTabs(updatedTabs);
    tabsRef.current = updatedTabs;
    setAllTabs(updatedTabs.map(t => ({ id: t.id, title: t.title, active: t.active, url: t.url, mode: t.mode })));

    if (process.env.NODE_ENV === 'development') {
      console.log('[TabStrip] Activating tab (optimistic):', tabId, 'previous:', previousActiveId);
    }

    try {
      const result = await Promise.race([
        ipc.tabs.activate({ id: tabId }),
        new Promise<{ success: boolean; error?: string }>((resolve) =>
          setTimeout(() => resolve({ success: false, error: 'Timeout' }), 2000)
        ),
      ]);

      if (process.env.NODE_ENV === 'development') {
        console.log('[TabStrip] tabs.activate result:', result);
      }

      if (!result || !result.success) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[TabStrip] Tab activation failed or timed out, reverting:', tabId, result?.error);
        }

        // Revert optimistic update
        setTabs(snapshotTabs);
        tabsRef.current = snapshotTabs;
        previousTabIdsRef.current = snapshotTabs.map(t => t.id).sort().join(',');
        setAllTabs(snapshotTabs.map(t => ({ id: t.id, title: t.title, active: t.active, url: t.url, mode: t.mode })));

        if (previousActiveId) {
          setActiveTab(previousActiveId);
          currentActiveIdRef.current = previousActiveId;
        }

        await refreshTabsFromMain();
      } else if (process.env.NODE_ENV === 'development') {
        console.log('[TabStrip] Tab activation acknowledged by IPC:', tabId);
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[TabStrip] Exception during tab activation, reverting:', error);
      }

      setTabs(snapshotTabs);
      tabsRef.current = snapshotTabs;
      previousTabIdsRef.current = snapshotTabs.map(t => t.id).sort().join(',');
      setAllTabs(snapshotTabs.map(t => ({ id: t.id, title: t.title, active: t.active, url: t.url, mode: t.mode })));

      if (previousActiveId) {
        setActiveTab(previousActiveId);
        currentActiveIdRef.current = previousActiveId;
      }

      await refreshTabsFromMain();
    } finally {
      activationInFlightRef.current = null;
    }
  };

  // Ensure active tab stays visible (only when activeId changes)
  useEffect(() => {
    if (!activeId || !stripRef?.current) return;
    try {
      const el = stripRef.current.querySelector(`[data-tab="${CSS.escape(activeId)}"]`);
      (el as any)?.scrollIntoView?.({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    } catch {}
  }, [activeId]); // Only depend on activeId, not tabs array

  // Keyboard navigation (Left/Right/Home/End)
  // Use refs to access current tabs/activeId without causing re-renders
  const tabsRef = useRef(tabs);
  const activeIdRef = useRef(activeId);
  
  useEffect(() => {
    tabsRef.current = tabs;
    activeIdRef.current = activeId;
  }, [tabs, activeId]);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if TabStrip is focused or no other input is focused
      if (document.activeElement?.tagName === 'INPUT' || 
          document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;
      
      // Use refs to get current values without dependencies
      const currentTabs = tabsRef.current;
      const currentActiveId = activeIdRef.current;

      // Ctrl+Tab / Ctrl+Shift+Tab: Switch tabs
      if (modifier && e.key === 'Tab') {
        e.preventDefault();
        const currentIndex = currentTabs.findIndex(t => t.id === currentActiveId);
        if (currentIndex >= 0) {
          const nextIndex = e.shiftKey 
            ? (currentIndex - 1 + currentTabs.length) % currentTabs.length
            : (currentIndex + 1) % currentTabs.length;
          if (currentTabs[nextIndex]) {
            activateTab(currentTabs[nextIndex].id);
          }
        }
        return;
      }

      // Home: First tab
      if (e.key === 'Home' && !modifier) {
        e.preventDefault();
        if (currentTabs.length > 0 && currentTabs[0].id !== currentActiveId) {
          activateTab(currentTabs[0].id);
        }
        return;
      }

      // End: Last tab
      if (e.key === 'End' && !modifier) {
        e.preventDefault();
        if (currentTabs.length > 0 && currentTabs[currentTabs.length - 1].id !== currentActiveId) {
          activateTab(currentTabs[currentTabs.length - 1].id);
        }
        return;
      }

      // Left Arrow: Previous tab
      if (e.key === 'ArrowLeft' && modifier && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        const currentIndex = currentTabs.findIndex(t => t.id === currentActiveId);
        if (currentIndex > 0) {
          activateTab(currentTabs[currentIndex - 1].id);
        }
        return;
      }

      // Right Arrow: Next tab
      if (e.key === 'ArrowRight' && modifier && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        const currentIndex = currentTabs.findIndex(t => t.id === currentActiveId);
        if (currentIndex < currentTabs.length - 1) {
          activateTab(currentTabs[currentIndex + 1].id);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - use refs to access current values

  return (
    <div 
      ref={stripRef as any} 
      role="tablist"
      aria-label="Browser tabs"
      className="no-drag flex items-center gap-1 px-3 py-2 bg-[#1A1D28] border-b border-gray-700/30 overflow-x-auto scrollbar-hide"
      style={{ pointerEvents: 'auto' }}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1" style={{ pointerEvents: 'auto' }}>
        <AnimatePresence mode="popLayout">
          {tabs.length > 0 ? (
            tabs.map((tab) => (
              <TabHoverCard key={tab.id} tabId={tab.id}>
                <motion.div
                  data-tab={tab.id}
                  role="tab"
                  aria-selected={tab.active}
                  aria-label={`Tab: ${tab.title}${tab.mode === 'ghost' ? ' (Ghost tab)' : tab.mode === 'private' ? ' (Private tab)' : ''}`}
                  tabIndex={tab.active ? 0 : -1}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className={`
                    relative flex items-center gap-2 px-4 py-2 rounded-lg
                    min-w-[100px] max-w-[220px] cursor-pointer group
                    transition-all duration-200
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                    ${tab.active
                      ? 'bg-purple-600/20 border border-purple-500/40 shadow-lg shadow-purple-500/20'
                      : 'bg-gray-800/30 hover:bg-gray-800/50 border border-transparent'
                    }
                    ${tab.mode === 'ghost' ? 'ring-1 ring-purple-500/40' : ''}
                    ${tab.mode === 'private' ? 'ring-1 ring-emerald-500/40' : ''}
                  `}
                  style={{ pointerEvents: 'auto', zIndex: 1, userSelect: 'none' }}
                  onClick={(e) => {
                    // Primary click handler - ensure it fires
                    e.preventDefault();
                    e.stopPropagation();
                    // Call activateTab immediately
                    activateTab(tab.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      activateTab(tab.id);
                    }
                  }}
                  onAuxClick={(e: any) => { 
                    e.preventDefault(); 
                    e.stopPropagation();
                    if (e.button === 1) { // Middle click
                      closeTab(tab.id); 
                    }
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    (window as any).__lastContextMenuPos = { x: e.clientX, y: e.clientY };
                    setContextMenu({ tabId: tab.id, url: tab.url, x: e.clientX, y: e.clientY });
                  }}
                >
                  {/* Favicon */}
                  <div className="flex-shrink-0 w-4 h-4 bg-gray-600 rounded-full flex items-center justify-center">
                    {tab.favicon ? (
                      <img src={tab.favicon} alt="" className="w-full h-full rounded-full" />
                    ) : (
                      <div className="w-2 h-2 bg-gray-400 rounded-full" />
                    )}
                  </div>

                  {tab.mode && tab.mode !== 'normal' && (
                    <span
                      className={`px-1.5 py-0.5 rounded-md text-[10px] font-medium border ${
                        tab.mode === 'ghost'
                          ? 'bg-purple-500/20 text-purple-200 border-purple-400/40'
                          : 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40'
                      }`}
                    >
                      {tab.mode === 'ghost' ? 'Ghost' : 'Private'}
                    </span>
                  )}

                  {/* Title */}
                  <span className={`flex-1 text-sm truncate ${tab.active ? 'text-gray-100' : 'text-gray-400'}`}>
                    {tab.title}
                  </span>

                  {/* Close Button */}
                  <motion.button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      closeTab(tab.id);
                    }}
                    onMouseDown={(e) => {
                      // Stop propagation but don't prevent default
                      // Preventing default can interfere with click events
                      e.stopPropagation();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        closeTab(tab.id);
                      }
                    }}
                    aria-label={`Close tab: ${tab.title}`}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-gray-700/50 transition-opacity ml-1 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 no-drag"
                    style={{ pointerEvents: 'auto', zIndex: 2 }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    title="Close tab (Middle click)"
                  >
                    <X size={14} className="text-gray-400" />
                  </motion.button>
                </motion.div>
              </TabHoverCard>
            ))
          ) : null}
        </AnimatePresence>

        {/* New Tab Button */}
        <motion.button
          onClick={addTab}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              addTab();
            }
          }}
          aria-label="New tab"
          className="flex-shrink-0 p-2 rounded-lg hover:bg-gray-800/50 border border-transparent hover:border-gray-700/30 text-gray-400 hover:text-gray-200 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title="New Tab (Ctrl+T / ⌘T)"
        >
          <Plus size={18} />
        </motion.button>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <TabContextMenu
          tabId={contextMenu.tabId}
          url={contextMenu.url}
          mode={tabs.find(t => t.id === contextMenu.tabId)?.mode}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
