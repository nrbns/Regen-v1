/**
 * Tab Bar - Browser-grade horizontal tabs
 * 
 * STRONG UI REQUIREMENT:
 * - Multi-tab, real browser feel
 * - Favicons, loading states, error states
 * - Keyboard shortcuts (Ctrl+T, Ctrl+W, Ctrl+Tab)
 * - Instant switching, never blocks
 */

import React, { useEffect } from 'react';
import { X, Loader2, AlertCircle, Globe } from 'lucide-react';
import { useTabsStore } from '../../state/tabsStore';
import { listTasks } from '../../core/execution/taskManager';
import type { Tab } from '../../state/tabsStore';
import { cn } from '../../lib/utils';

interface TabBarProps {
  className?: string;
}

export function TabBar({ className = '' }: TabBarProps) {
  const { tabs, activeTabId, addTab, closeTab, switchTab } = useTabsStore();
  const [tasksWithTabRef, setTasksWithTabRef] = React.useState<Set<string>>(new Set());

  // Track which tabs have running tasks
  useEffect(() => {
    const updateTasks = () => {
      const allTasks = listTasks();
      const runningTasks = allTasks.filter(t => 
        t.status === 'RUNNING' && t.meta?.currentTabId
      );
      setTasksWithTabRef(new Set(runningTasks.map(t => t.meta.currentTabId)));
    };

    updateTasks();
    const interval = setInterval(updateTasks, 1000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcuts (Ctrl+T, Ctrl+W, Ctrl+Tab)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      if (!modifier) return;

      // Ctrl+T / Cmd+T: New tab
      if (e.key === 't' && !e.shiftKey) {
        e.preventDefault();
        addTab();
        return;
      }

      // Ctrl+W / Cmd+W: Close active tab
      if (e.key === 'w' && !e.shiftKey) {
        e.preventDefault();
        if (activeTabId) {
          closeTab(activeTabId);
        }
        return;
      }

      // Ctrl+Tab / Cmd+Tab: Next tab
      if (e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        if (tabs.length > 1) {
          const currentIndex = tabs.findIndex(t => t.id === activeTabId);
          const nextIndex = (currentIndex + 1) % tabs.length;
          switchTab(tabs[nextIndex].id);
        }
        return;
      }

      // Ctrl+Shift+Tab / Cmd+Shift+Tab: Previous tab
      if (e.key === 'Tab' && e.shiftKey) {
        e.preventDefault();
        if (tabs.length > 1) {
          const currentIndex = tabs.findIndex(t => t.id === activeTabId);
          const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
          switchTab(tabs[prevIndex].id);
        }
        return;
      }

      // Ctrl+1-9 / Cmd+1-9: Switch to tab by number
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 9) {
        e.preventDefault();
        const tab = tabs[num - 1];
        if (tab) {
          switchTab(tab.id);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tabs, activeTabId, addTab, closeTab, switchTab]);

  const getTabFavicon = (tab: Tab) => {
    // Extract favicon URL from tab URL
    if (!tab.url || tab.url === 'about:blank') return <Globe size={14} className="text-gray-400" />;
    
    try {
      const url = new URL(tab.url);
      const faviconUrl = `${url.protocol}//${url.host}/favicon.ico`;
      return (
        <img
          src={faviconUrl}
          alt=""
          className="w-4 h-4"
          onError={(e) => {
            // Fallback to Globe icon on error
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      );
    } catch {
      return <Globe size={14} className="text-gray-400" />;
    }
  };

  const getTabIndicator = (tabId: string) => {
    // Show indicator if tab has running tasks
    if (tasksWithTabRef.has(tabId)) {
      return (
        <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-yellow-400 rounded-full" />
      );
    }
    return null;
  };

  if (tabs.length === 0) {
    return (
      <div className={cn('h-9 bg-slate-800 border-b border-slate-700 flex items-center px-2', className)}>
        <button
          onClick={() => addTab()}
          className="px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
        >
          + New Tab
        </button>
      </div>
    );
  }

  return (
    <div className={cn('h-9 bg-slate-800 border-b border-slate-700 flex items-center overflow-x-auto', className)}>
      <div className="flex items-center gap-1 min-w-0 flex-1">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const hasTasks = tasksWithTabRef.has(tab.id);

          return (
            <div
              key={tab.id}
              className={cn(
                'group relative flex items-center gap-2 px-3 py-1.5 min-w-[120px] max-w-[240px] rounded-t-lg cursor-pointer transition-colors',
                isActive
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-800/50 text-gray-300 hover:bg-slate-800 hover:text-white'
              )}
              onClick={() => switchTab(tab.id)}
            >
              {/* Favicon */}
              <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
                {tab.isLoading ? (
                  <Loader2 size={14} className="text-blue-400 animate-spin" />
                ) : (
                  getTabFavicon(tab)
                )}
              </div>

              {/* Tab Title */}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">
                  {tab.title || tab.url || 'New Tab'}
                </div>
              </div>

              {/* Task Indicator */}
              {hasTasks && (
                <div className="flex-shrink-0 w-1.5 h-1.5 bg-yellow-400 rounded-full" />
              )}

              {/* Close Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                className={cn(
                  'flex-shrink-0 p-0.5 rounded hover:bg-slate-700 transition-colors opacity-0 group-hover:opacity-100',
                  isActive && 'opacity-100'
                )}
                title="Close tab"
              >
                <X size={12} className="text-gray-400 hover:text-white" />
              </button>
            </div>
          );
        })}

        {/* New Tab Button */}
        <button
          onClick={() => addTab()}
          className="flex-shrink-0 px-2 py-1.5 text-gray-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
          title="New Tab (Ctrl+T)"
        >
          +
        </button>
      </div>
    </div>
  );
}
