/**
 * Tab Manager - Grouping, Discarding, Snapshot Restore
 */

import { useState, useEffect } from 'react';
import { 
  Folder, 
  FolderPlus, 
  Trash2, 
  RefreshCw, 
  Archive,
  Search,
  X,
} from 'lucide-react';
import { useTabsStore } from '../../state/tabsStore';
import { SessionWorkspace } from '../../core/workspace/SessionWorkspace';

interface TabGroup {
  id: string;
  name: string;
  tabIds: string[];
  color?: string;
}

export function TabManager() {
  const { tabs, activeId, setActiveId, closeTab } = useTabsStore();
  const [groups, setGroups] = useState<TabGroup[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [discardedTabs, setDiscardedTabs] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Load groups from localStorage
    const saved = localStorage.getItem('regen-tab-groups');
    if (saved) {
      try {
        setGroups(JSON.parse(saved));
      } catch {
        // Invalid data
      }
    }

    // Load discarded tabs
    const discarded = localStorage.getItem('regen-discarded-tabs');
    if (discarded) {
      try {
        setDiscardedTabs(new Set(JSON.parse(discarded)));
      } catch {
        // Invalid data
      }
    }
  }, []);

  const createGroup = () => {
    const name = prompt('Group name:') || 'Untitled Group';
    const group: TabGroup = {
      id: `group_${Date.now()}`,
      name,
      tabIds: [],
      color: `hsl(${Math.random() * 360}, 70%, 50%)`,
    };
    
    const updated = [...groups, group];
    setGroups(updated);
    saveGroups(updated);
  };

  const addTabToGroup = (tabId: string, groupId: string) => {
    const updated = groups.map(g => {
      if (g.id === groupId) {
        if (!g.tabIds.includes(tabId)) {
          return { ...g, tabIds: [...g.tabIds, tabId] };
        }
      } else {
        // Remove from other groups
        return { ...g, tabIds: g.tabIds.filter(id => id !== tabId) };
      }
      return g;
    });
    
    setGroups(updated);
    saveGroups(updated);
  };

  const removeTabFromGroup = (tabId: string, groupId: string) => {
    const updated = groups.map(g => {
      if (g.id === groupId) {
        return { ...g, tabIds: g.tabIds.filter(id => id !== tabId) };
      }
      return g;
    });
    
    setGroups(updated);
    saveGroups(updated);
  };

  const deleteGroup = (groupId: string) => {
    if (confirm('Delete this group? Tabs will not be closed.')) {
      const updated = groups.filter(g => g.id !== groupId);
      setGroups(updated);
      saveGroups(updated);
    }
  };

  const discardTab = (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    // Save snapshot
    saveTabSnapshot(tabId, tab);

    // Mark as discarded
    const updated = new Set(discardedTabs);
    updated.add(tabId);
    setDiscardedTabs(updated);
    saveDiscardedTabs(updated);

    // Remove iframe src to free memory
    const iframe = document.querySelector(`iframe[data-tab-id="${tabId}"]`) as HTMLIFrameElement;
    if (iframe) {
      iframe.src = 'about:blank';
    }
  };

  const restoreTab = (tabId: string) => {
    const snapshot = loadTabSnapshot(tabId);
    if (!snapshot) return;

    // Restore tab
    const updated = new Set(discardedTabs);
    updated.delete(tabId);
    setDiscardedTabs(updated);
    saveDiscardedTabs(updated);

    // Restore iframe
    const iframe = document.querySelector(`iframe[data-tab-id="${tabId}"]`) as HTMLIFrameElement;
    if (iframe && snapshot.url) {
      iframe.src = snapshot.url;
    }
  };

  const saveTabSnapshot = (tabId: string, tab: any) => {
    const snapshot = {
      id: tabId,
      url: tab.url,
      title: tab.title,
      timestamp: Date.now(),
      // Could include text content snapshot
    };
    
    localStorage.setItem(`regen-tab-snapshot-${tabId}`, JSON.stringify(snapshot));
  };

  const loadTabSnapshot = (tabId: string) => {
    const saved = localStorage.getItem(`regen-tab-snapshot-${tabId}`);
    if (!saved) return null;
    
    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  };

  const saveGroups = (groupsToSave: TabGroup[]) => {
    localStorage.setItem('regen-tab-groups', JSON.stringify(groupsToSave));
  };

  const saveDiscardedTabs = (discarded: Set<string>) => {
    localStorage.setItem('regen-discarded-tabs', JSON.stringify(Array.from(discarded)));
  };

  const filteredTabs = tabs.filter(tab =>
    tab.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tab.url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTabGroup = (tabId: string) => {
    return groups.find(g => g.tabIds.includes(tabId));
  };

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Folder className="w-5 h-5" />
            Tab Manager
          </h2>
          <button
            onClick={createGroup}
            className="p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
          >
            <FolderPlus className="w-4 h-4" />
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search tabs..."
            className="w-full bg-gray-800 text-white rounded-lg pl-10 pr-4 py-2 text-sm"
          />
        </div>
      </div>

      {/* Groups */}
      {groups.length > 0 && (
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-sm font-semibold text-gray-400 mb-2">Groups</h3>
          <div className="space-y-2">
            {groups.map(group => (
              <div
                key={group.id}
                className="flex items-center justify-between p-2 bg-gray-800 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: group.color }}
                  />
                  <span className="text-sm text-white">{group.name}</span>
                  <span className="text-xs text-gray-400">({group.tabIds.length})</span>
                </div>
                <button
                  onClick={() => deleteGroup(group.id)}
                  className="p-1 text-red-400 hover:text-red-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs List */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredTabs.length === 0 ? (
          <div className="text-center text-gray-400 mt-8">
            <Folder className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">No tabs found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTabs.map(tab => {
              const group = getTabGroup(tab.id);
              const isDiscarded = discardedTabs.has(tab.id);
              
              return (
                <div
                  key={tab.id}
                  className={`p-3 rounded-lg transition-colors ${
                    activeId === tab.id
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800 hover:bg-gray-700 text-gray-200'
                  } ${isDiscarded ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {group && (
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: group.color }}
                        />
                      )}
                      <p className="text-sm font-medium truncate">{tab.title || tab.url}</p>
                      {isDiscarded && (
                        <span className="text-xs px-2 py-0.5 bg-yellow-600/20 text-yellow-400 rounded">
                          Discarded
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {isDiscarded ? (
                        <button
                          onClick={() => restoreTab(tab.id)}
                          className="p-1 hover:bg-white/20 rounded"
                          title="Restore"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => discardTab(tab.id)}
                          className="p-1 hover:bg-white/20 rounded"
                          title="Discard"
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => closeTab(tab.id)}
                        className="p-1 hover:bg-white/20 rounded text-red-400"
                        title="Close"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs opacity-75 truncate">{tab.url}</p>
                  
                  {/* Group selector */}
                  <div className="mt-2 flex items-center gap-2">
                    <select
                      value={group?.id || ''}
                      onChange={e => {
                        if (e.target.value) {
                          addTabToGroup(tab.id, e.target.value);
                        } else if (group) {
                          removeTabFromGroup(tab.id, group.id);
                        }
                      }}
                      className="text-xs bg-gray-700 text-white rounded px-2 py-1"
                      onClick={e => e.stopPropagation()}
                    >
                      <option value="">No group</option>
                      {groups.map(g => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

