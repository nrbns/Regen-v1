/**
 * Workspaces Panel - Tier 2
 * Save and restore workspaces
 */

import { useState } from 'react';
import { Search, Pin, PinOff, Trash2, Save, FolderOpen } from 'lucide-react';
import { useWorkspacesStore } from '../state/workspacesStore';
import { useTabsStore } from '../state/tabsStore';
import { useAppStore } from '../state/appStore';
import { ipc } from '../lib/ipc-typed';
import { track } from '../services/analytics';
import { toast } from '../utils/toast';
import { formatDistanceToNow } from 'date-fns';

export function WorkspacesPanel() {
  const workspaces = useWorkspacesStore(state => state.workspaces);
  const add = useWorkspacesStore(state => state.add);
  const remove = useWorkspacesStore(state => state.remove);
  const togglePin = useWorkspacesStore(state => state.togglePin);
  const search = useWorkspacesStore(state => state.search);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const tabsStore = useTabsStore();
  const appMode = useAppStore(state => state.mode);

  // Sort: pinned first, then by updatedAt
  const sortedWorkspaces = [...workspaces].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return b.updatedAt - a.updatedAt;
  });

  const displayedWorkspaces = searchQuery ? search(searchQuery) : sortedWorkspaces;

  const handleSave = async () => {
    setSaving(true);
    try {
      const name = prompt('Workspace name:', `Workspace ${new Date().toLocaleDateString()}`);
      if (!name) {
        setSaving(false);
        return;
      }

      const workspaceId = add({
        name,
        tabs: tabsStore.tabs,
        mode: appMode,
        description: `${tabsStore.tabs.length} tab${tabsStore.tabs.length === 1 ? '' : 's'}`,
      });

      track('workspace_saved', { workspaceId, tabCount: tabsStore.tabs.length });
      toast.success('Workspace saved!');
    } catch (error) {
      console.error('Failed to save workspace', error);
      toast.error('Failed to save workspace');
    } finally {
      setSaving(false);
    }
  };

  const handleRestore = async (workspace: { id: string; tabs: any[]; mode: string }) => {
    try {
      // Clear current tabs
      const currentTabs = [...tabsStore.tabs];
      for (const tab of currentTabs) {
        try {
          await ipc.tabs.close({ id: tab.id });
        } catch (error) {
          console.warn('Failed to close tab', error);
        }
      }

      // Restore workspace tabs
      for (const tab of workspace.tabs) {
        try {
          const url = tab.url || 'about:blank';
          const newTab = await ipc.tabs.create(url);
          const tabId =
            typeof newTab === 'object' && newTab && 'id' in newTab
              ? newTab.id
              : typeof newTab === 'string'
                ? newTab
                : null;
          if (tabId && typeof tabId === 'string') {
            tabsStore.updateTab(tabId, {
              title: tab.title,
              appMode: tab.appMode,
            });
          }
        } catch (error) {
          console.warn('Failed to restore tab', error);
        }
      }

      // Set active tab
      if (workspace.tabs.length > 0 && workspace.tabs[0]?.id && workspace.tabs[0]?.url) {
        const firstTab = tabsStore.tabs.find(t => t.url === workspace.tabs[0].url);
        if (firstTab) {
          tabsStore.setActive(firstTab.id);
          await ipc.tabs.activate({ id: firstTab.id });
        }
      }

      // Restore mode
      if (workspace.mode) {
        await useAppStore.getState().setMode(workspace.mode as any);
      }

      track('workspace_restored', { workspaceId: workspace.id });
      toast.success('Workspace restored!');
    } catch (error) {
      console.error('Failed to restore workspace', error);
      toast.error('Failed to restore workspace');
    }
  };

  const handleRemove = (id: string) => {
    if (confirm('Delete this workspace?')) {
      remove(id);
      track('workspace_deleted', { workspaceId: id });
      toast.info('Workspace deleted');
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100">
      {/* Header */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Workspaces</h2>
          <button
            onClick={handleSave}
            disabled={saving || tabsStore.tabs.length === 0}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            <Save size={14} />
            Save Current
          </button>
        </div>
        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search workspaces..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>
      </div>

      {/* Workspaces List */}
      <div className="flex-1 overflow-y-auto p-4">
        {displayedWorkspaces.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            {searchQuery ? 'No workspaces found' : 'No workspaces yet'}
            <p className="text-sm mt-2">
              {!searchQuery && 'Save your current tabs as a workspace to get started'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayedWorkspaces.map(workspace => (
              <div
                key={workspace.id}
                className="group flex items-start gap-3 p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-sm text-slate-100">{workspace.name}</h3>
                    {workspace.isPinned && (
                      <Pin size={12} className="text-yellow-400 fill-current" />
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {workspace.tabs.length} tab{workspace.tabs.length === 1 ? '' : 's'} •{' '}
                    {workspace.mode}
                  </p>
                  {workspace.description && (
                    <p className="text-xs text-gray-500 mt-1">{workspace.description}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDistanceToNow(new Date(workspace.updatedAt), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => togglePin(workspace.id)}
                    className="p-1.5 rounded hover:bg-slate-700 transition-colors"
                    title={workspace.isPinned ? 'Unpin' : 'Pin'}
                  >
                    {workspace.isPinned ? (
                      <PinOff size={14} className="text-yellow-400" />
                    ) : (
                      <Pin size={14} className="text-gray-400" />
                    )}
                  </button>
                  <button
                    onClick={() => handleRestore(workspace)}
                    className="p-1.5 rounded hover:bg-blue-500/20 text-blue-400 transition-colors"
                    title="Restore workspace"
                  >
                    <FolderOpen size={14} />
                  </button>
                  <button
                    onClick={() => handleRemove(workspace.id)}
                    className="p-1.5 rounded hover:bg-red-500/20 text-red-400 transition-colors"
                    title="Delete workspace"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
