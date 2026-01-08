import React, { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { systemState, IPCHandler } from '../../backend';

export function TabsBar() {
  const [tabs, setTabs] = useState(systemState.getState().tabs);
  const [activeTabId, setActiveTabId] = useState(systemState.getState().activeTabId);

  // Subscribe to state changes
  useEffect(() => {
    const handleStateChange = (newState: any) => {
      setTabs(newState.tabs);
      setActiveTabId(newState.activeTabId);
    };

    systemState.on('state-changed', handleStateChange);
    return () => systemState.off('state-changed', handleStateChange);
  }, []);

  const handleNewTab = () => {
    IPCHandler.newTab();
  };

  const handleCloseTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    IPCHandler.closeTab(tabId);
  };

  const truncateTitle = (title: string, maxLength: number = 20) => {
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength - 3) + '...';
  };

  return (
    <div className="flex items-center bg-slate-800 border-b border-slate-700 px-1 py-0.5">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`
            flex items-center gap-2 px-4 py-2 mx-px rounded-t-md cursor-pointer transition-all duration-150
            ${activeTabId === tab.id
              ? 'bg-slate-900 text-white border-t border-l border-r border-slate-600 shadow-sm'
              : 'bg-slate-700 text-gray-400 hover:bg-slate-600 hover:text-gray-300'
            }
          `}
          onClick={() => IPCHandler.switchTab(tab.id)}
        >
          <span className="text-sm font-medium truncate max-w-40">
            {truncateTitle(tab.title)}
          </span>

          {tabs.length > 1 && (
            <button
              onClick={(e) => handleCloseTab(tab.id, e)}
              className="p-0.5 rounded-full hover:bg-red-600 transition-colors opacity-60 hover:opacity-100"
              title="Close tab"
            >
              <X size={11} />
            </button>
          )}
        </div>
      ))}

      <button
        onClick={handleNewTab}
        className="ml-1 p-2 rounded-md hover:bg-slate-600 transition-colors text-gray-400 hover:text-gray-300"
        title="New tab"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
