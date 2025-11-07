/**
 * TabStrip - Floating tab bar with Arc-like design
 * Fully functional tab management with real-time updates
 */

import { useState, useEffect } from 'react';
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
  const [isRestoring, setIsRestoring] = useState(false);
  const stripRef = (typeof window !== 'undefined') ? (window as any).__tabStripRef || { current: null } : { current: null } as React.RefObject<HTMLDivElement> as any;

  // Load tabs on mount and listen for updates
  useEffect(() => {
    const loadTabs = async (isInitialLoad = false) => {
      try {
        const tabList = await ipc.tabs.list();
        if (Array.isArray(tabList) && tabList.length > 0) {
          const mappedTabs = tabList.map((t: any) => ({
            id: t.id,
            title: t.title || 'New Tab',
            url: t.url || 'about:blank',
            active: t.active || false,
          }));
          setTabs(mappedTabs);
          setAllTabs(mappedTabs.map(t => ({ id: t.id, title: t.title, active: t.active })));
          
          // Set active tab in store
          const activeTab = mappedTabs.find(t => t.active);
          if (activeTab && activeTab.id !== activeId) {
            setActiveTab(activeTab.id);
          } else if (mappedTabs.length > 0 && !activeTab && mappedTabs[0]) {
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
          if (isInitialLoad && !hasInitialized && !isRestoring) {
            try {
              const result = await ipc.tabs.create('about:blank');
              if (result) {
                setHasInitialized(true);
                // Wait a bit and reload
                setTimeout(() => loadTabs(false), 300);
              }
            } catch (error) {
              console.error('Failed to create initial tab:', error);
              setHasInitialized(true); // Mark as initialized even on error
            }
          } else {
            // No tabs and we've already initialized - just clear state
            setTabs([]);
            setAllTabs([]);
            setActiveTab(null);
            if (!hasInitialized) {
              setHasInitialized(true);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load tabs:', error);
        // Don't auto-create tab on error - just mark as initialized
        if (isInitialLoad) {
          setHasInitialized(true);
        }
      }
    };

    // Listen for session restoration state
    const handleRestoring = (restoring: boolean) => {
      setIsRestoring(restoring);
    };
    
    const unsubscribeRestoring = ipcEvents.on<boolean>('session:restoring', handleRestoring);
    
    // Listen for restore tab messages
    const handleRestoreTab = async (tabState: any) => {
      try {
        await ipc.tabs.create(tabState.url || 'about:blank');
      } catch (error) {
        console.error('Failed to restore tab from session:', error);
      }
    };
    
    const unsubscribeRestoreTab = ipcEvents.on<any>('session:restore-tab', handleRestoreTab);

    // Initial load only - don't auto-create tabs on subsequent updates
    loadTabs(true);

    // Listen for tab updates via IPC events (more reliable)
    const handleTabUpdate = (tabList: any[]) => {
      if (!Array.isArray(tabList)) return;
      
      const mappedTabs = tabList.map((t: any) => ({
        id: t.id,
        title: t.title || 'New Tab',
        url: t.url || 'about:blank',
        active: t.active || false,
      }));
      
      setTabs(mappedTabs);
      setAllTabs(mappedTabs.map(t => ({ id: t.id, title: t.title, active: t.active })));
      
      // Update active tab in store
      const activeTab = mappedTabs.find(t => t.active);
      if (activeTab && activeTab.id !== activeId) {
        setActiveTab(activeTab.id);
      } else if (mappedTabs.length > 0 && !activeTab && mappedTabs[0]) {
        // No active tab, activate first one
        ipc.tabs.activate({ id: mappedTabs[0].id }).catch(console.error);
        setActiveTab(mappedTabs[0].id);
      } else if (mappedTabs.length === 0) {
        // No tabs, clear active - DON'T auto-create
        setActiveTab(null);
        setTabs([]);
        setAllTabs([]);
      }
      // Do not re-dispatch 'tabs:updated' here to avoid feedback loops
    };

    // Subscribe to IPC events via the event bus
    const unsubscribe = ipcEvents.on('tabs:updated', handleTabUpdate);

    // Also listen directly to IPC for immediate updates
    if (window.ipc && (window.ipc as any).on) {
      const directListener = (_event: any, data: any) => {
        const tabList = Array.isArray(data) ? data : (Array.isArray(_event) ? _event : []);
        if (Array.isArray(tabList)) {
          handleTabUpdate(tabList);
        }
      };
      
      (window.ipc as any).on('tabs:updated', directListener);
      (window.ipc as any).on('ob://ipc/v1/tabs:updated', directListener);
      
      // Fallback polling if events don't work (less frequent) - reduced frequency
      // Only poll to sync state, don't auto-create tabs
      const pollInterval = setInterval(() => {
        loadTabs(false).catch(console.error);
      }, 5000); // Poll every 5 seconds as fallback
      
      return () => {
        unsubscribe();
        if (window.ipc?.removeListener) {
          (window.ipc as any).removeListener('tabs:updated', directListener);
          (window.ipc as any).removeListener('ob://ipc/v1/tabs:updated', directListener);
        }
        clearInterval(pollInterval);
      };
    }

    return () => {
      unsubscribe();
      unsubscribeRestoring();
      unsubscribeRestoreTab();
    };
  }, [setAllTabs, setActiveTab, activeId, isRestoring]);

  const addTab = async () => {
    try {
      const result = await ipc.tabs.create('about:blank');
      if (result) {
        // Wait for tab to be created
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Reload tabs
        try {
          const tabList = await ipc.tabs.list();
          if (Array.isArray(tabList) && tabList.length > 0) {
            const mappedTabs = tabList.map((t: any) => ({
              id: t.id,
              title: t.title || 'New Tab',
              url: t.url || 'about:blank',
              active: t.active || false,
            }));
            setTabs(mappedTabs);
            setAllTabs(mappedTabs.map(t => ({ id: t.id, title: t.title, active: t.active })));
            
            // Activate the new tab
            const newTab = mappedTabs[mappedTabs.length - 1];
            if (!newTab.active) {
              await ipc.tabs.activate({ id: newTab.id });
              setActiveTab(newTab.id);
            }
          }
        } catch (error) {
          console.error('Failed to reload tabs after creation:', error);
        }
      }
    } catch (error) {
      console.error('Failed to add tab:', error);
    }
  };

  const closeTab = async (tabId: string) => {
    try {
      // Update local state optimistically
      const updatedTabs = tabs.filter(t => t.id !== tabId);
      setTabs(updatedTabs);
      setAllTabs(updatedTabs.map(t => ({ id: t.id, title: t.title, active: t.active })));
      
      // Close tab with timeout to prevent hanging
      await Promise.race([
        ipc.tabs.close({ id: tabId }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
      ]).catch((error) => {
        console.warn('Tab close timeout or error:', error);
      });
      
      // Reload tabs from backend to sync state
      try {
        const tabList = await ipc.tabs.list();
        if (Array.isArray(tabList)) {
          const mappedTabs = tabList.map((t: any) => ({
            id: t.id,
            title: t.title || 'New Tab',
            url: t.url || 'about:blank',
            active: t.active || false,
          }));
          setTabs(mappedTabs);
          setAllTabs(mappedTabs.map(t => ({ id: t.id, title: t.title, active: t.active })));
          
          // Update active tab based on backend state
          const activeTab = mappedTabs.find(t => t.active);
          if (activeTab) {
            setActiveTab(activeTab.id);
          } else if (mappedTabs.length > 0) {
            // No active tab, activate first one
            try {
              await ipc.tabs.activate({ id: mappedTabs[0].id });
              setActiveTab(mappedTabs[0].id);
            } catch (e) {
              console.warn('Failed to activate tab after close:', e);
            }
          } else {
            setActiveTab(null);
          }
        }
      } catch (error) {
        console.error('Failed to reload tabs after close:', error);
      }
    } catch (error) {
      console.error('Failed to close tab:', error);
      // Try to reload tabs to sync state
      try {
        const tabList = await ipc.tabs.list();
        if (Array.isArray(tabList)) {
          const mappedTabs = tabList.map((t: any) => ({
            id: t.id,
            title: t.title || 'New Tab',
            url: t.url || 'about:blank',
            active: t.active || false,
          }));
          setTabs(mappedTabs);
          setAllTabs(mappedTabs.map(t => ({ id: t.id, title: t.title, active: t.active })));
        }
      } catch (e) {
        console.error('Failed to reload tabs after error:', e);
      }
    }
  };

  const activateTab = async (tabId: string) => {
    try {
      await ipc.tabs.activate({ id: tabId });
      setActiveTab(tabId);
      // Update local state immediately
      const updatedTabs = tabs.map(t => ({
        ...t,
        active: t.id === tabId,
      }));
      setTabs(updatedTabs);
      setAllTabs(updatedTabs.map(t => ({ id: t.id, title: t.title, active: t.active })));
      
      // Force reload to ensure UI updates
      setTimeout(async () => {
        try {
          const tabList = await ipc.tabs.list();
          if (Array.isArray(tabList)) {
            const mappedTabs = tabList.map((t: any) => ({
              id: t.id,
              title: t.title || 'New Tab',
              url: t.url || 'about:blank',
              active: t.active || false,
            }));
            setTabs(mappedTabs);
            setAllTabs(mappedTabs.map(t => ({ id: t.id, title: t.title, active: t.active })));
          }
        } catch (error) {
          console.error('Failed to reload tabs after activate:', error);
        }
      }, 100);
    } catch (error) {
      console.error('Failed to activate tab:', error);
    }
  };

  // Ensure active tab stays visible
  useEffect(() => {
    try {
      const active = tabs.find(t => t.active);
      if (!active || !stripRef?.current) return;
      const el = stripRef.current.querySelector(`[data-tab="${CSS.escape(active.id)}"]`);
      (el as any)?.scrollIntoView?.({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    } catch {}
  }, [tabs, stripRef]);

  // Keyboard navigation (Left/Right/Home/End)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if TabStrip is focused or no other input is focused
      if (document.activeElement?.tagName === 'INPUT' || 
          document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      // Ctrl+Tab / Ctrl+Shift+Tab: Switch tabs
      if (modifier && e.key === 'Tab') {
        e.preventDefault();
        const currentIndex = tabs.findIndex(t => t.active);
        if (currentIndex >= 0) {
          const nextIndex = e.shiftKey 
            ? (currentIndex - 1 + tabs.length) % tabs.length
            : (currentIndex + 1) % tabs.length;
          if (tabs[nextIndex]) {
            activateTab(tabs[nextIndex].id);
          }
        }
        return;
      }

      // Home: First tab
      if (e.key === 'Home' && !modifier) {
        e.preventDefault();
        if (tabs.length > 0 && !tabs[0].active) {
          activateTab(tabs[0].id);
        }
        return;
      }

      // End: Last tab
      if (e.key === 'End' && !modifier) {
        e.preventDefault();
        if (tabs.length > 0 && !tabs[tabs.length - 1].active) {
          activateTab(tabs[tabs.length - 1].id);
        }
        return;
      }

      // Left Arrow: Previous tab
      if (e.key === 'ArrowLeft' && modifier && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        const currentIndex = tabs.findIndex(t => t.active);
        if (currentIndex > 0) {
          activateTab(tabs[currentIndex - 1].id);
        }
        return;
      }

      // Right Arrow: Next tab
      if (e.key === 'ArrowRight' && modifier && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        const currentIndex = tabs.findIndex(t => t.active);
        if (currentIndex < tabs.length - 1) {
          activateTab(tabs[currentIndex + 1].id);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tabs]);

  return (
    <div ref={stripRef as any} className="no-drag flex items-center gap-1 px-3 py-2 bg-[#1A1D28] border-b border-gray-700/30 overflow-x-auto scrollbar-hide">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <AnimatePresence mode="popLayout">
          {tabs.length > 0 ? (
            tabs.map((tab) => (
              <TabHoverCard key={tab.id} tabId={tab.id}>
                <motion.div
                  data-tab={tab.id}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className={`
                    relative flex items-center gap-2 px-4 py-2 rounded-lg
                    min-w-[100px] max-w-[220px] cursor-pointer group
                    transition-all duration-200
                    ${tab.active
                      ? 'bg-purple-600/20 border border-purple-500/40 shadow-lg shadow-purple-500/20'
                      : 'bg-gray-800/30 hover:bg-gray-800/50 border border-transparent'
                    }
                  `}
                  onClick={() => activateTab(tab.id)}
                  onAuxClick={(e: any) => { e.preventDefault(); closeTab(tab.id); }}
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

                  {/* Title */}
                  <span className={`flex-1 text-sm truncate ${tab.active ? 'text-gray-100' : 'text-gray-400'}`}>
                    {tab.title}
                  </span>

                  {/* Close Button */}
                  <motion.button
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(tab.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-gray-700/50 transition-opacity ml-1"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
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
          className="flex-shrink-0 p-2 rounded-lg hover:bg-gray-800/50 border border-transparent hover:border-gray-700/30 text-gray-400 hover:text-gray-200 transition-all"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title="New Tab (Ctrl+T)"
        >
          <Plus size={18} />
        </motion.button>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <TabContextMenu
          tabId={contextMenu.tabId}
          url={contextMenu.url}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
