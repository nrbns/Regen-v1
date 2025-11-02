/**
 * TabStrip - Floating tab bar with Arc-like design
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus } from 'lucide-react';
import { ipc } from '../../lib/ipc-typed';
import { useTabsStore } from '../../state/tabsStore';

interface Tab {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  active: boolean;
}

export function TabStrip() {
  const { tabs: storeTabs, setAll: setAllTabs, setActive: setActiveTab, remove: removeTab } = useTabsStore();
  const [tabs, setTabs] = useState<Tab[]>([]);

  // Load tabs on mount and listen for updates
  useEffect(() => {
    const loadTabs = async () => {
      try {
        const tabList = await ipc.tabs.list();
        if (tabList.length > 0) {
          const mappedTabs = tabList.map((t: any) => ({
            id: t.id,
            title: t.title || 'New Tab',
            url: t.url || 'about:blank',
            active: t.active,
          }));
          setTabs(mappedTabs);
          setAllTabs(mappedTabs.map(t => ({ id: t.id, title: t.title, active: t.active })));
        } else {
          // Create initial tab if none exist
          try {
            const result = await ipc.tabs.create('about:blank');
            const newTabId = typeof result === 'string' ? result : (result as any).id;
            const newTab = {
              id: newTabId,
              title: 'New Tab',
              url: 'about:blank',
              active: true,
            };
            setTabs([newTab]);
            setAllTabs([{ id: newTabId, title: 'New Tab', active: true }]);
          } catch (error) {
            console.error('Failed to create initial tab:', error);
          }
        }
      } catch (error) {
        console.error('Failed to load tabs:', error);
      }
    };

    loadTabs();

    // Listen for tab updates from main process via IPC
    const handleTabUpdate = (tabList: any[]) => {
      if (tabList && Array.isArray(tabList)) {
        const mappedTabs = tabList.map((t: any) => ({
          id: t.id,
          title: t.title || 'New Tab',
          url: t.url || 'about:blank',
          active: t.active,
        }));
        setTabs(mappedTabs);
        setAllTabs(mappedTabs.map(t => ({ id: t.id, title: t.title, active: t.active })));
        
        // Dispatch custom event for URL bar updates
        window.dispatchEvent(new CustomEvent('tabs:updated', { detail: tabList }));
      }
    };

    // Listen for tab updates via IPC
    if (window.ipc && window.ipc.on) {
      // Use typed IPC listener
      window.ipc.on('tabs:updated', handleTabUpdate);
      return () => {
        if (window.ipc?.removeListener) {
          window.ipc.removeListener('tabs:updated', handleTabUpdate);
        }
      };
    } else if (window.api?.tabs?.onUpdated) {
      // Fallback to legacy API
      window.api.tabs.onUpdated(handleTabUpdate);
      return () => {};
    } else {
      // Fallback: poll for updates
      const interval = setInterval(loadTabs, 1000);
      return () => clearInterval(interval);
    }
  }, []);

  const addTab = async () => {
    try {
      const result = await ipc.tabs.create('about:blank');
      const newTabId = typeof result === 'string' ? result : (result as any).id;
      const newTabs = [...tabs.map(t => ({ ...t, active: false })), { 
        id: newTabId, 
        title: 'New Tab', 
        url: 'about:blank',
        active: true 
      }];
      setTabs(newTabs);
      setAllTabs(newTabs.map(t => ({ id: t.id, title: t.title, active: t.active })));
      await ipc.tabs.activate({ id: newTabId });
    } catch (error) {
      console.error('Failed to add tab:', error);
    }
  };

  const closeTab = async (tabId: string) => {
    try {
      await ipc.tabs.close({ id: tabId });
      const wasActive = tabs.find(t => t.id === tabId)?.active;
      const newTabs = tabs.filter(t => t.id !== tabId);
      if (newTabs.length > 0 && wasActive) {
        // Activate first tab if closed tab was active
        const firstTab = newTabs[0];
        firstTab.active = true;
        await ipc.tabs.activate({ id: firstTab.id });
      }
      setTabs(newTabs);
    } catch (error) {
      console.error('Failed to close tab:', error);
    }
  };

  const activateTab = async (tabId: string) => {
    try {
      await ipc.tabs.activate({ id: tabId });
      const updatedTabs = tabs.map(t => ({ ...t, active: t.id === tabId }));
      setTabs(updatedTabs);
      setActiveTab(tabId);
      setAllTabs(updatedTabs.map(t => ({ id: t.id, title: t.title, active: t.active })));
    } catch (error) {
      console.error('Failed to activate tab:', error);
    }
  };

  return (
    <div className="flex items-center gap-1 px-3 py-2 bg-[#1A1D28] border-b border-gray-700/30 overflow-x-auto scrollbar-hide">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <AnimatePresence mode="popLayout">
          {tabs.map((tab) => (
            <motion.div
              key={tab.id}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className={`
                relative flex items-center gap-2 px-4 py-2 rounded-lg
                min-w-[100px] max-w-[220px] cursor-pointer group
                transition-all duration-200
                ${tab.active
                  ? 'bg-purple-600/20 border border-purple-500/40'
                  : 'bg-gray-800/30 hover:bg-gray-800/50 border border-transparent'
                }
              `}
              onClick={() => activateTab(tab.id)}
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
          ))}
        </AnimatePresence>

        {/* New Tab Button */}
        <motion.button
          onClick={addTab}
          className="flex-shrink-0 p-2 rounded-lg hover:bg-gray-800/50 border border-transparent hover:border-gray-700/30 text-gray-400 hover:text-gray-200 transition-all"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title="New Tab"
        >
          <Plus size={18} />
        </motion.button>
      </div>
    </div>
  );
}

