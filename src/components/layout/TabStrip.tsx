/**
 * TabStrip - Floating tab bar with Arc-like design
 * Fully functional tab management with real-time updates
 */

// @ts-nocheck

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Eye, Sparkles } from 'lucide-react';
import { ipc } from '../../lib/ipc-typed';
import { useTabsStore } from '../../state/tabsStore';
import { ipcEvents } from '../../lib/ipc-events';
import { TabHoverCard } from '../TopNav/TabHoverCard';
import { TabContextMenu } from './TabContextMenu';
import { usePeekPreviewStore } from '../../state/peekStore';
import { Portal } from '../common/Portal';
import { useTabGraphStore } from '../../state/tabGraphStore';
import { PredictiveClusterChip, PredictivePrefetchHint } from './PredictiveClusterChip';
import { HolographicPreviewOverlay } from '../hologram';
import { useCrossRealityStore } from '../../state/crossRealityStore';

const TAB_GRAPH_DRAG_MIME = 'application/x-omnibrowser-tab-id';

interface Tab {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  active: boolean;
  mode?: 'normal' | 'ghost' | 'private';
  containerId?: string;
  containerName?: string;
  containerColor?: string;
  createdAt?: number;
  lastActiveAt?: number;
  sessionId?: string;
  profileId?: string;
  sleeping?: boolean;
}

export function TabStrip() {
  const { tabs: storeTabs, setAll: setAllTabs, setActive: setActiveTab, activeId } = useTabsStore();
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [predictedClusters, setPredictedClusters] = useState<Array<{ id: string; label: string; tabIds: string[]; confidence?: number }>>([]);
  const [prefetchEntries, setPrefetchEntries] = useState<Array<{ tabId: string; url: string; reason: string; confidence?: number }>>([]);
  const [predictionSummary, setPredictionSummary] = useState<string | null>(null);
  const [holographicPreviewTabId, setHolographicPreviewTabId] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewMetadata, setPreviewMetadata] = useState<{ url?: string; title?: string } | null>(null);
  const [hologramSupported, setHologramSupported] = useState<boolean | null>(null);
  const [handoffStatus, setHandoffStatus] = useState<{ platform: string; lastSentAt: number | null }>({ platform: 'desktop', lastSentAt: null });
  const registerHandoff = useCrossRealityStore((state) => state.registerHandoff);
  const [contextMenu, setContextMenu] = useState<{
    tabId: string;
    url: string;
    containerId?: string;
    containerName?: string;
    containerColor?: string;
    mode?: 'normal' | 'ghost' | 'private';
    sleeping?: boolean;
    x: number;
    y: number;
  } | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  const isRestoringRef = useRef(false);
  const isCreatingTabRef = useRef(false); // Prevent infinite tab creation loops
  const previousTabIdsRef = useRef<string>(''); // Track tab IDs to prevent unnecessary updates
  const currentActiveIdRef = useRef<string | null>(null); // Track active ID without causing re-renders
  const activationInFlightRef = useRef<string | null>(null); // Track activations to avoid duplicate work
  const stripRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<Tab[]>(tabs);
  const openPeek = usePeekPreviewStore((state) => state.open);
  const predictiveRequestRef = useRef<Promise<void> | null>(null);
  const lastPredictionSignatureRef = useRef<string>('');
  const fetchPredictiveSuggestionsRef = useRef<(options?: { force?: boolean }) => Promise<void> | void>();
  
  // Keep ref in sync with activeId (doesn't cause re-renders)
  useEffect(() => {
    currentActiveIdRef.current = activeId;
  }, [activeId]);

  const runPredictiveSuggestions = useCallback(
    async (options?: { force?: boolean }) => {
      if (predictiveRequestRef.current && !options?.force) {
        return predictiveRequestRef.current;
      }

      const signature = tabsRef.current
        .map((tab) => `${tab.id}:${tab.lastActiveAt ?? 0}`)
        .sort()
        .join('|');

      if (!options?.force && signature && signature === lastPredictionSignatureRef.current && predictedClusters.length > 0) {
        return;
      }

      const requestPromise = (async () => {
        try {
          const response = await ipc.tabs.predictiveGroups(options?.force ? { force: true } : {});
          lastPredictionSignatureRef.current = signature;
          if (!response) {
            setPredictedClusters([]);
            setPrefetchEntries([]);
            setPredictionSummary(null);
            return;
          }

          setPredictedClusters(Array.isArray(response.groups) ? response.groups : []);
          setPrefetchEntries(Array.isArray(response.prefetch) ? response.prefetch : []);
          setPredictionSummary(response.summary?.explanation ?? null);
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('[TabStrip] Predictive suggestions failed', error);
          }
          if (options?.force) {
            setPredictedClusters([]);
            setPrefetchEntries([]);
            setPredictionSummary(null);
          }
        } finally {
          if (predictiveRequestRef.current === requestPromise) {
            predictiveRequestRef.current = null;
          }
        }
      })();

      predictiveRequestRef.current = requestPromise;
      return requestPromise;
    },
    [predictedClusters.length]
  );

  useEffect(() => {
    fetchPredictiveSuggestionsRef.current = runPredictiveSuggestions;
  }, [runPredictiveSuggestions]);

  useEffect(() => {
    if (!hasInitialized) return;
    fetchPredictiveSuggestionsRef.current?.({ force: true });
  }, [hasInitialized]);

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
        containerId: t.containerId,
        containerName: t.containerName,
        containerColor: t.containerColor,
        createdAt: t.createdAt,
        lastActiveAt: t.lastActiveAt,
        sessionId: t.sessionId,
        profileId: t.profileId,
      }));

      const ids = mappedTabs.map(t => t.id).sort().join(',');
      previousTabIdsRef.current = ids;

      setTabs(mappedTabs);
      tabsRef.current = mappedTabs;
      setAllTabs(mappedTabs.map(t => ({
        id: t.id,
        title: t.title,
        active: t.active,
        url: t.url,
        mode: t.mode,
        containerId: t.containerId,
        containerColor: t.containerColor,
        containerName: t.containerName,
        createdAt: t.createdAt,
        lastActiveAt: t.lastActiveAt,
        sessionId: t.sessionId,
        profileId: t.profileId,
      })));

      const activeTab = mappedTabs.find(t => t.active);
      if (activeTab) {
        setActiveTab(activeTab.id);
        currentActiveIdRef.current = activeTab.id;
      } else if (mappedTabs.length === 0) {
        setActiveTab(null);
        currentActiveIdRef.current = null;
      }

      fetchPredictiveSuggestionsRef.current?.();
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[TabStrip] Failed to refresh tabs from main process:', error);
      }
    }
  }, [setActiveTab, setAllTabs]);

  useEffect(() => {
    const checkHologramSupport = () => {
      const supported = typeof navigator !== 'undefined' && 'xr' in navigator;
      setHologramSupported(supported);
      if (supported) {
        setHandoffStatus((prev) => ({ ...prev, platform: 'xr-ready' }));
      }
    };
    checkHologramSupport();
  }, []);

  useEffect(() => {
    if (!handoffStatus.lastSentAt) return;
    void ipc.crossReality.sendHandoffStatus(handoffStatus);
  }, [handoffStatus]);

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
            mode: t.mode || 'normal',
            containerId: t.containerId,
            containerName: t.containerName,
            containerColor: t.containerColor,
            createdAt: t.createdAt,
            lastActiveAt: t.lastActiveAt,
            sessionId: t.sessionId,
            profileId: t.profileId,
          }));
          
          // Update ref to track tab IDs and only update state if changed
          const tabIds = mappedTabs.map(t => t.id).sort().join(',');
          if (previousTabIdsRef.current !== tabIds) {
            previousTabIdsRef.current = tabIds;
            setTabs(mappedTabs);
            setAllTabs(mappedTabs.map(t => ({
              id: t.id,
              title: t.title,
              active: t.active,
              url: t.url,
              mode: t.mode,
              containerId: t.containerId,
              containerColor: t.containerColor,
              containerName: t.containerName,
              createdAt: t.createdAt,
              lastActiveAt: t.lastActiveAt,
              sessionId: t.sessionId,
              profileId: t.profileId,
            })));
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
        await ipc.tabs.create({
          url: tabState.url || 'about:blank',
          containerId: tabState.containerId,
          mode: tabState.mode,
          profileId: tabState.profileId,
          tabId: tabState.id,
          activate: Boolean(tabState.activate),
          createdAt: tabState.createdAt,
          lastActiveAt: tabState.lastActiveAt,
          sessionId: tabState.sessionId,
          fromSessionRestore: true,
        });
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
      containerId: t.containerId,
      containerName: t.containerName,
      containerColor: t.containerColor,
      mode: t.mode,
      createdAt: t.createdAt,
      lastActiveAt: t.lastActiveAt,
      sessionId: t.sessionId,
      profileId: t.profileId,
      sleeping: Boolean(t.sleeping),
    }));

    const peekState = usePeekPreviewStore.getState();
    if (peekState.visible && peekState.tab) {
      const updatedPeek = mappedTabs.find((t) => t.id === peekState.tab?.id);
      if (updatedPeek) {
        usePeekPreviewStore.getState().sync(updatedPeek);
      }
    }
      
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
      setAllTabs(mappedTabs.map(t => ({
        id: t.id,
        title: t.title,
        active: t.active,
        url: t.url,
        mode: t.mode,
        containerId: t.containerId,
        containerColor: t.containerColor,
      containerName: t.containerName,
      createdAt: t.createdAt,
      lastActiveAt: t.lastActiveAt,
      sessionId: t.sessionId,
      profileId: t.profileId,
      })));
      
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

  const handleApplyCluster = useCallback((clusterId: string) => {
    const cluster = predictedClusters.find((c) => c.id === clusterId);
    if (!cluster) return;
    if (!cluster.tabIds.length) return;

    const currentTabs = tabsRef.current;
    const matching = currentTabs.filter((tab) => cluster.tabIds.includes(tab.id));
    if (matching.length <= 1) return;

    let etld = 'workspace';
    try {
      if (matching[0]?.url) {
        etld = new URL(matching[0].url).hostname.replace(/^www\./, '') || 'workspace';
      }
    } catch {
      etld = 'workspace';
    }

    const label = matching.length >= 3 ? `${etld} cluster` : cluster.label;

    void ipc.tabs.create({
      url: 'about:blank',
      containerId: etld,
      activate: true,
    }).then(async (result: any) => {
      if (!result?.id) return;
      for (const tab of matching) {
        try {
          await ipc.tabs.moveToWorkspace({ tabId: tab.id, workspaceId: result.id, label });
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('[TabStrip] Failed to regroup tab', error);
          }
        }
      }
      setTimeout(() => {
        void useTabGraphStore.getState().refresh();
      }, 300);
      fetchPredictiveSuggestionsRef.current?.({ force: true });
    });
  }, [predictedClusters]);

  const handlePrefetchOpen = useCallback(
    (entry: { tabId: string; url: string; reason: string; confidence?: number }) => {
      if (!entry?.url) return;
      void ipc.tabs.create({ url: entry.url, activate: true }).then(() => {
        fetchPredictiveSuggestionsRef.current?.({ force: true });
      });
    },
    []
  );

  // Ensure active tab stays visible (only when activeId changes)
  useEffect(() => {
    if (!activeId || !stripRef.current) return;
    try {
      const el = stripRef.current.querySelector(`[data-tab="${CSS.escape(activeId)}"]`);
      (el as any)?.scrollIntoView?.({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    } catch {}
  }, [activeId]); // Only depend on activeId, not tabs array

  // Keyboard navigation (Left/Right/Home/End)
  // Use refs to access current tabs/activeId without causing re-renders
  const activeIdRef = useRef(activeId);
  
  useEffect(() => {
    tabsRef.current = tabs;
    activeIdRef.current = activeId;
  }, [tabs, activeId]);
  
  useEffect(() => {
    if (!stripRef.current || !activeId) {
      return;
    }

    const target = stripRef.current.querySelector<HTMLDivElement>(
      `[data-tab="${CSS.escape(activeId)}"]`
    );
    target?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [activeId, tabs.length]);

  const handleKeyNavigation = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
        return;
      }

      const currentIndex = tabs.findIndex((t) => t.id === activeId);
      if (currentIndex === -1) {
        return;
      }

      event.preventDefault();

      let nextIndex = currentIndex;
      switch (event.key) {
        case 'Home':
          nextIndex = 0;
          break;
        case 'End':
          nextIndex = tabs.length - 1;
          break;
        case 'ArrowLeft':
          nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
          break;
        case 'ArrowRight':
          nextIndex = (currentIndex + 1) % tabs.length;
          break;
      }

      const nextTab = tabs[nextIndex];
      if (nextTab) {
        activateTab(nextTab.id);
      }
    },
    [tabs, activeId, activateTab]
  );

  useEffect(() => {
    const handleModifiedShortcuts = (event: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const modifier = isMac ? event.metaKey : event.ctrlKey;

      if (!modifier || event.key !== 'Tab') {
        return;
      }

      const currentTabs = tabsRef.current;
      const currentActiveId = activeIdRef.current;
      if (!currentTabs.length || !currentActiveId) {
        return;
      }

      event.preventDefault();
      const currentIndex = currentTabs.findIndex((tab) => tab.id === currentActiveId);
      if (currentIndex === -1) {
        return;
      }

      const nextIndex = event.shiftKey
        ? (currentIndex - 1 + currentTabs.length) % currentTabs.length
        : (currentIndex + 1) % currentTabs.length;

      const nextTab = currentTabs[nextIndex];
      if (nextTab) {
        activateTab(nextTab.id);
      }
    };

    window.addEventListener('keydown', handleModifiedShortcuts);
    return () => window.removeEventListener('keydown', handleModifiedShortcuts);
  }, [activateTab]);

  return (
    <>
      <div 
        ref={stripRef} 
        role="tablist"
        aria-label="Browser tabs"
        className="no-drag flex items-center gap-1 px-3 py-2 bg-[#1A1D28] border-b border-gray-700/30 overflow-x-auto scrollbar-hide"
        style={{ pointerEvents: 'auto' }}
        onKeyDown={handleKeyNavigation}
        data-onboarding="tabstrip"
      >
        <PredictivePrefetchHint entry={prefetchEntries[0] ?? null} onOpen={handlePrefetchOpen} />
        <PredictiveClusterChip clusters={predictedClusters} onApply={handleApplyCluster} summary={predictionSummary} />
        <div className="flex items-center gap-2 min-w-0 flex-1" style={{ pointerEvents: 'auto' }}>
          <AnimatePresence mode="popLayout">
            {tabs.length > 0 ? (
              tabs.map((tab) => {
                const prefetchForTab = prefetchEntries.find((entry) => entry.tabId === tab.id);
                return (
                <TabHoverCard key={tab.id} tabId={tab.id}>
                  <motion.div
                    data-tab={tab.id}
                    role="tab"
                    aria-selected={tab.active}
                    aria-label={`Tab: ${tab.title}${tab.mode === 'ghost' ? ' (Ghost tab)' : tab.mode === 'private' ? ' (Private tab)' : ''}${tab.sleeping ? ' (Hibernating)' : ''}`}
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
                      ${tab.sleeping ? 'ring-1 ring-amber-400/40' : ''}
                    `}
                    style={{ pointerEvents: 'auto', zIndex: 1, userSelect: 'none' }}
                    draggable
                    onDragStart={(event) => {
                      try {
                        event.dataTransfer?.setData(TAB_GRAPH_DRAG_MIME, tab.id);
                        if (tab.title) {
                          event.dataTransfer?.setData('text/plain', tab.title);
                        }
                        if (event.dataTransfer) {
                          event.dataTransfer.effectAllowed = 'copy';
                        }
                      } catch (error) {
                        if (process.env.NODE_ENV === 'development') {
                          console.warn('[TabStrip] Drag start failed', error);
                        }
                      }
                    }}
                    onDragEnd={() => {
                      window.dispatchEvent(new CustomEvent('tabgraph:dragend'));
                    }}
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
                        return;
                      }

                      if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
                        e.preventDefault();
                        e.stopPropagation();

                        const currentIndex = tabs.findIndex((t) => t.id === tab.id);
                        if (currentIndex === -1) {
                          return;
                        }

                        let nextIndex = currentIndex;
                        switch (e.key) {
                          case 'Home':
                            nextIndex = 0;
                            break;
                          case 'End':
                            nextIndex = tabs.length - 1;
                            break;
                          case 'ArrowLeft':
                            nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
                            break;
                          case 'ArrowRight':
                            nextIndex = (currentIndex + 1) % tabs.length;
                            break;
                        }

                        const nextTab = tabs[nextIndex];
                        if (nextTab) {
                          activateTab(nextTab.id);
                        }
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
                      setContextMenu({
                        tabId: tab.id,
                        url: tab.url,
                        containerId: tab.containerId,
                      containerName: tab.containerName,
                      containerColor: tab.containerColor,
                        mode: tab.mode,
                        sleeping: tab.sleeping,
                        x: e.clientX,
                        y: e.clientY,
                      });
                    }}
                    onMouseEnter={() => {
                      if (tab === tabs[tabs.length - 1]) {
                        setHolographicPreviewTabId(tab.id);
                        setPreviewMetadata({ url: tab.url, title: tab.title });
                      }
                    }}
                    onMouseLeave={() => {
                      if (holographicPreviewTabId === tab.id) {
                        setHolographicPreviewTabId(null);
                        setPreviewMetadata(null);
                      }
                    }}
                  >
                    {prefetchForTab && (
                      <span
                        className="absolute top-1 right-2 text-emerald-300 text-[11px] font-semibold"
                        title={`Suggested follow-up: ${prefetchForTab.reason}`}
                      >
                        ⚡
                      </span>
                    )}
                  {hologramSupported !== false && holographicPreviewTabId === tab.id && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      className="absolute -bottom-9 left-1/2 flex -translate-x-1/2 items-center gap-2"
                    >
                      <motion.button
                        type="button"
                        className="flex items-center gap-1 rounded-full border border-cyan-400/40 bg-cyan-500/15 px-3 py-1 text-[10px] text-cyan-100 shadow-lg backdrop-blur transition-colors hover:bg-cyan-500/25"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setHandoffStatus({ platform: 'xr', lastSentAt: Date.now() });
                          window.dispatchEvent(
                            new CustomEvent('tab:holographic-preview', {
                              detail: { tabId: tab.id },
                            }),
                          );
                          void ipc.crossReality.handoff(tab.id, 'xr');
                        }}
                      >
                        <Sparkles size={12} /> XR Hologram
                      </motion.button>
                      <motion.button
                        type="button"
                        className="flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-500/15 px-2.5 py-1 text-[10px] text-amber-100 shadow-lg backdrop-blur transition-colors hover:bg-amber-500/25"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setHandoffStatus({ platform: 'mobile', lastSentAt: Date.now() });
                          void ipc.crossReality.handoff(tab.id, 'mobile');
                        }}
                      >
                        <span role="img" aria-label="mobile">📱</span> Send
                      </motion.button>
                    </motion.div>
                  )}
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

                    {tab.containerId && tab.containerId !== 'default' && (
                      <div
                        className="w-2.5 h-2.5 rounded-full border border-gray-700/60"
                        style={{ backgroundColor: tab.containerColor || '#6366f1' }}
                        title={`${tab.containerName || 'Custom'} container`}
                      />
                    )}

                    {tab.sleeping && (
                      <span className="flex items-center" title="Tab is hibernating">
                        <motion.span
                          className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.55)]"
                          animate={{ scale: [1, 1.25, 1], opacity: [0.7, 1, 0.7] }}
                          transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
                        />
                      </span>
                    )}

                    {/* Title */}
                    <span className={`flex-1 text-sm truncate ${tab.active ? 'text-gray-100' : 'text-gray-400'}`}>
                      {tab.title}
                    </span>

                    {/* Peek Button */}
                    <motion.button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openPeek(tab);
                      }}
                      aria-label={`Peek preview: ${tab.title}`}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-gray-700/50 transition-opacity text-gray-400 hover:text-gray-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 no-drag ml-1"
                      style={{ pointerEvents: 'auto', zIndex: 2 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.96 }}
                      title="Peek preview"
                    >
                      <Eye size={14} />
                    </motion.button>

                    {/* Close Button */}
                    <motion.button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        closeTab(tab.id);
                      }}
                      onAuxClick={(e) => {
                        if (e.button === 1) {
                          e.preventDefault();
                          e.stopPropagation();
                          closeTab(tab.id);
                        }
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
              );
            })
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
          <Portal>
            <TabContextMenu
              tabId={contextMenu.tabId}
              url={contextMenu.url}
              containerId={contextMenu.containerId ?? tabs.find(t => t.id === contextMenu.tabId)?.containerId}
              containerName={contextMenu.containerName ?? tabs.find(t => t.id === contextMenu.tabId)?.containerName}
              containerColor={contextMenu.containerColor ?? tabs.find(t => t.id === contextMenu.tabId)?.containerColor}
              mode={contextMenu.mode ?? tabs.find(t => t.id === contextMenu.tabId)?.mode}
              sleeping={contextMenu.sleeping ?? tabs.find(t => t.id === contextMenu.tabId)?.sleeping}
              onClose={() => setContextMenu(null)}
            />
          </Portal>
        )}
      </div>

      <HolographicPreviewOverlay
        visible={Boolean(holographicPreviewTabId)}
        tabId={holographicPreviewTabId}
        url={previewMetadata?.url}
        title={previewMetadata?.title}
        onClose={() => {
          setHolographicPreviewTabId(null);
          setPreviewMetadata(null);
        }}
      />
    </>
  );
}
