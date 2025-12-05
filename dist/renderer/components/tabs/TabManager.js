import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Tab Manager - Grouping, Discarding, Snapshot Restore
 */
import { useState, useEffect } from 'react';
import { Folder, FolderPlus, RefreshCw, Archive, Search, X } from 'lucide-react';
import { useTabsStore } from '../../state/tabsStore';
export function TabManager() {
    const { tabs, activeId, remove } = useTabsStore();
    const [groups, setGroups] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [discardedTabs, setDiscardedTabs] = useState(new Set());
    useEffect(() => {
        // Load groups from localStorage
        const saved = localStorage.getItem('regen-tab-groups');
        if (saved) {
            try {
                setGroups(JSON.parse(saved));
            }
            catch {
                // Invalid data
            }
        }
        // Load discarded tabs
        const discarded = localStorage.getItem('regen-discarded-tabs');
        if (discarded) {
            try {
                setDiscardedTabs(new Set(JSON.parse(discarded)));
            }
            catch {
                // Invalid data
            }
        }
    }, []);
    const createGroup = () => {
        const name = prompt('Group name:') || 'Untitled Group';
        const group = {
            id: `group_${Date.now()}`,
            name,
            tabIds: [],
            color: `hsl(${Math.random() * 360}, 70%, 50%)`,
        };
        const updated = [...groups, group];
        setGroups(updated);
        saveGroups(updated);
    };
    const addTabToGroup = (tabId, groupId) => {
        const updated = groups.map(g => {
            if (g.id === groupId) {
                if (!g.tabIds.includes(tabId)) {
                    return { ...g, tabIds: [...g.tabIds, tabId] };
                }
            }
            else {
                // Remove from other groups
                return { ...g, tabIds: g.tabIds.filter(id => id !== tabId) };
            }
            return g;
        });
        setGroups(updated);
        saveGroups(updated);
    };
    const removeTabFromGroup = (tabId, groupId) => {
        const updated = groups.map(g => {
            if (g.id === groupId) {
                return { ...g, tabIds: g.tabIds.filter(id => id !== tabId) };
            }
            return g;
        });
        setGroups(updated);
        saveGroups(updated);
    };
    const deleteGroup = (groupId) => {
        if (confirm('Delete this group? Tabs will not be closed.')) {
            const updated = groups.filter(g => g.id !== groupId);
            setGroups(updated);
            saveGroups(updated);
        }
    };
    const discardTab = (tabId) => {
        const tab = tabs.find(t => t.id === tabId);
        if (!tab)
            return;
        // Save snapshot
        saveTabSnapshot(tabId, tab);
        // Mark as discarded
        const updated = new Set(discardedTabs);
        updated.add(tabId);
        setDiscardedTabs(updated);
        saveDiscardedTabs(updated);
        // Remove iframe src to free memory
        const iframe = document.querySelector(`iframe[data-tab-id="${tabId}"]`);
        if (iframe) {
            iframe.src = 'about:blank';
        }
    };
    const restoreTab = (tabId) => {
        const snapshot = loadTabSnapshot(tabId);
        if (!snapshot)
            return;
        // Restore tab
        const updated = new Set(discardedTabs);
        updated.delete(tabId);
        setDiscardedTabs(updated);
        saveDiscardedTabs(updated);
        // Restore iframe
        const iframe = document.querySelector(`iframe[data-tab-id="${tabId}"]`);
        if (iframe && snapshot.url) {
            iframe.src = snapshot.url;
        }
    };
    const saveTabSnapshot = (tabId, tab) => {
        const snapshot = {
            id: tabId,
            url: tab.url,
            title: tab.title,
            timestamp: Date.now(),
            // Could include text content snapshot
        };
        localStorage.setItem(`regen-tab-snapshot-${tabId}`, JSON.stringify(snapshot));
    };
    const loadTabSnapshot = (tabId) => {
        const saved = localStorage.getItem(`regen-tab-snapshot-${tabId}`);
        if (!saved)
            return null;
        try {
            return JSON.parse(saved);
        }
        catch {
            return null;
        }
    };
    const saveGroups = (groupsToSave) => {
        localStorage.setItem('regen-tab-groups', JSON.stringify(groupsToSave));
    };
    const saveDiscardedTabs = (discarded) => {
        localStorage.setItem('regen-discarded-tabs', JSON.stringify(Array.from(discarded)));
    };
    const filteredTabs = tabs.filter(tab => tab.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tab.url?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false));
    const getTabGroup = (tabId) => {
        return groups.find(g => g.tabIds.includes(tabId));
    };
    return (_jsxs("div", { className: "flex flex-col h-full bg-gray-900", children: [_jsxs("div", { className: "p-4 border-b border-gray-700", children: [_jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsxs("h2", { className: "text-lg font-semibold text-white flex items-center gap-2", children: [_jsx(Folder, { className: "w-5 h-5" }), "Tab Manager"] }), _jsx("button", { onClick: createGroup, className: "p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg", children: _jsx(FolderPlus, { className: "w-4 h-4" }) })] }), _jsxs("div", { className: "relative", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" }), _jsx("input", { type: "text", value: searchQuery, onChange: e => setSearchQuery(e.target.value), placeholder: "Search tabs...", className: "w-full bg-gray-800 text-white rounded-lg pl-10 pr-4 py-2 text-sm" })] })] }), groups.length > 0 && (_jsxs("div", { className: "p-4 border-b border-gray-700", children: [_jsx("h3", { className: "text-sm font-semibold text-gray-400 mb-2", children: "Groups" }), _jsx("div", { className: "space-y-2", children: groups.map(group => (_jsxs("div", { className: "flex items-center justify-between p-2 bg-gray-800 rounded-lg", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "w-3 h-3 rounded-full", style: { backgroundColor: group.color } }), _jsx("span", { className: "text-sm text-white", children: group.name }), _jsxs("span", { className: "text-xs text-gray-400", children: ["(", group.tabIds.length, ")"] })] }), _jsx("button", { onClick: () => deleteGroup(group.id), className: "p-1 text-red-400 hover:text-red-300", children: _jsx(X, { className: "w-4 h-4" }) })] }, group.id))) })] })), _jsx("div", { className: "flex-1 overflow-y-auto p-4", children: filteredTabs.length === 0 ? (_jsxs("div", { className: "text-center text-gray-400 mt-8", children: [_jsx(Folder, { className: "w-12 h-12 mx-auto mb-4 opacity-50" }), _jsx("p", { className: "text-sm", children: "No tabs found" })] })) : (_jsx("div", { className: "space-y-2", children: filteredTabs.map(tab => {
                        const group = getTabGroup(tab.id);
                        const isDiscarded = discardedTabs.has(tab.id);
                        return (_jsxs("div", { className: `p-3 rounded-lg transition-colors ${activeId === tab.id
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-800 hover:bg-gray-700 text-gray-200'} ${isDiscarded ? 'opacity-50' : ''}`, children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsxs("div", { className: "flex items-center gap-2 flex-1 min-w-0", children: [group && (_jsx("div", { className: "w-2 h-2 rounded-full flex-shrink-0", style: { backgroundColor: group.color } })), _jsx("p", { className: "text-sm font-medium truncate", children: tab.title || tab.url }), isDiscarded && (_jsx("span", { className: "text-xs px-2 py-0.5 bg-yellow-600/20 text-yellow-400 rounded", children: "Discarded" }))] }), _jsxs("div", { className: "flex items-center gap-1", children: [isDiscarded ? (_jsx("button", { onClick: () => restoreTab(tab.id), className: "p-1 hover:bg-white/20 rounded", title: "Restore", children: _jsx(RefreshCw, { className: "w-4 h-4" }) })) : (_jsx("button", { onClick: () => discardTab(tab.id), className: "p-1 hover:bg-white/20 rounded", title: "Discard", children: _jsx(Archive, { className: "w-4 h-4" }) })), _jsx("button", { onClick: () => remove(tab.id), className: "p-1 hover:bg-white/20 rounded text-red-400", title: "Close", children: _jsx(X, { className: "w-4 h-4" }) })] })] }), _jsx("p", { className: "text-xs opacity-75 truncate", children: tab.url }), _jsx("div", { className: "mt-2 flex items-center gap-2", children: _jsxs("select", { value: group?.id || '', onChange: e => {
                                            if (e.target.value) {
                                                addTabToGroup(tab.id, e.target.value);
                                            }
                                            else if (group) {
                                                removeTabFromGroup(tab.id, group.id);
                                            }
                                        }, className: "text-xs bg-gray-700 text-white rounded px-2 py-1", onClick: e => e.stopPropagation(), children: [_jsx("option", { value: "", children: "No group" }), groups.map(g => (_jsx("option", { value: g.id, children: g.name }, g.id)))] }) })] }, tab.id));
                    }) })) })] }));
}
