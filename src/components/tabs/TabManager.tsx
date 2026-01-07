/**
 * Tab Manager - Grouping, Discarding, Snapshot Restore
 */

import { useState, useEffect } from 'react';
import { Folder, FolderPlus, RefreshCw, Archive, Search, X } from 'lucide-react';
import { useTabsStore } from '../../state/tabsStore';

interface TabGroup {
  id: string;
  name: string;
  tabIds: string[];
  color?: string;
}

export function TabManager() {
  const { tabs, activeId, remove } = useTabsStore();
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

  const filteredTabs = tabs.filter(
    tab =>
      tab.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tab.url?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  const getTabGroup = (tabId: string) => {
    return groups.find(g => g.tabIds.includes(tabId));
  };

  return (
    <div className="flex h-full flex-col bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-700 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Folder className="h-5 w-5" />
            Tab Manager
          </h2>
          <button
            onClick={createGroup}
            className="rounded-lg bg-purple-600 p-2 text-white hover:bg-purple-700"
          >
            <FolderPlus className="h-4 w-4" />
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search tabs..."
            className="w-full rounded-lg bg-gray-800 py-2 pl-10 pr-4 text-sm text-white"
          />
        </div>
      </div>

      {/* Groups */}
      {groups.length > 0 && (
        <div className="border-b border-gray-700 p-4">
          <h3 className="mb-2 text-sm font-semibold text-gray-400">Groups</h3>
          <div className="space-y-2">
            {groups.map(group => (
              <div
                key={group.id}
                className="flex items-center justify-between rounded-lg bg-gray-800 p-2"
              >
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: group.color }} />
                  <span className="text-sm text-white">{group.name}</span>
                  <span className="text-xs text-gray-400">({group.tabIds.length})</span>
                </div>
                <button
                  onClick={() => deleteGroup(group.id)}
                  className="p-1 text-red-400 hover:text-red-300"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs List */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredTabs.length === 0 ? (
          <div className="mt-8 text-center text-gray-400">
            <Folder className="mx-auto mb-4 h-12 w-12 opacity-50" />
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
                  className={`rounded-lg p-3 transition-colors ${
                    activeId === tab.id
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800 text-gray-200 hover:bg-gray-700'
                  } ${isDiscarded ? 'opacity-50' : ''}`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      {group && (
                        <div
                          className="h-2 w-2 flex-shrink-0 rounded-full"
                          style={{ backgroundColor: group.color }}
                        />
                      )}
                      <p className="truncate text-sm font-medium">{tab.title || tab.url}</p>
                      {isDiscarded && (
                        <span className="rounded bg-yellow-600/20 px-2 py-0.5 text-xs text-yellow-400">
                          Discarded
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {isDiscarded ? (
                        <button
                          onClick={() => restoreTab(tab.id)}
                          className="rounded p-1 hover:bg-white/20"
                          title="Restore"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => discardTab(tab.id)}
                          className="rounded p-1 hover:bg-white/20"
                          title="Discard"
                        >
                          <Archive className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => remove(tab.id)}
                        className="rounded p-1 text-red-400 hover:bg-white/20"
                        title="Close"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <p className="truncate text-xs opacity-75">{tab.url}</p>

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
                      className="rounded bg-gray-700 px-2 py-1 text-xs text-white"
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
