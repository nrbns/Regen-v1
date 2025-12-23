/**
 * Workspaces Panel - Tier 2
 * Save and restore workspaces
 */

import { useState, useRef } from 'react';
import { Search, Pin, PinOff, Trash2, Save, FolderOpen, Upload, Download } from 'lucide-react';
import { useWorkspacesStore } from '../../state/workspacesStore';
import { eventBus, EVENTS } from '../../core/state/eventBus';
import { useAppStore } from '../../state/appStore';
import { ipc } from '../../lib/ipc-typed';
import { track } from '../../services/analytics';
import { toast } from '../../utils/toast';
import { formatDistanceToNow } from 'date-fns';
import { exportSessionToFile, importSessionFromFile } from '../../lib/session-transfer';

export function WorkspacesPanel() {
  const workspaces = useWorkspacesStore(state => state.workspaces);
  const add = useWorkspacesStore(state => state.add);
  const remove = useWorkspacesStore(state => state.remove);
  const togglePin = useWorkspacesStore(state => state.togglePin);
  const search = useWorkspacesStore(state => state.search);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // Local tab state, updated via event bus
  const [tabs, setTabs] = useState<any[]>([]);
  const appMode = useAppStore(state => state.mode);

  // Listen for tab events and update local state
  useEffect(() => {
    // Handler to update tabs from event payload
    const _handleTabsUpdate = (updatedTabs: any[]) => {
      setTabs(updatedTabs);
    };

    // Initial fetch: try to get from Zustand (for now, fallback to empty)
    // This can be replaced with a more robust source if needed
    if (window?.__ZUSTAND_DEVTOOLS__?.tabsStore) {
      setTabs(window.__ZUSTAND_DEVTOOLS__.tabsStore.getState().tabs || []);
    }

    // Listen for all tab events that could change the tab list
    const offOpened = eventBus.on(EVENTS.TAB_OPENED, () => {
      // Assume tabsStore is still updating, so fetch from it
      if (window?.__ZUSTAND_DEVTOOLS__?.tabsStore) {
        setTabs(window.__ZUSTAND_DEVTOOLS__.tabsStore.getState().tabs || []);
      }
    });
    const offClosed = eventBus.on(EVENTS.TAB_CLOSED, () => {
      if (window?.__ZUSTAND_DEVTOOLS__?.tabsStore) {
        setTabs(window.__ZUSTAND_DEVTOOLS__.tabsStore.getState().tabs || []);
      }
    });
    const offUpdated = eventBus.on('tab:updated', () => {
      if (window?.__ZUSTAND_DEVTOOLS__?.tabsStore) {
        setTabs(window.__ZUSTAND_DEVTOOLS__.tabsStore.getState().tabs || []);
      }
    });
    const offActivated = eventBus.on(EVENTS.TAB_ACTIVATED, () => {
      if (window?.__ZUSTAND_DEVTOOLS__?.tabsStore) {
        setTabs(window.__ZUSTAND_DEVTOOLS__.tabsStore.getState().tabs || []);
      }
    });

    return () => {
      offOpened();
      offClosed();
      offUpdated();
      offActivated();
    };
  }, []);

  // Sort: pinned first, then by updatedAt
  const sortedWorkspaces = [...workspaces].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return b.updatedAt - a.updatedAt;
  });

  const baseWorkspaces = searchQuery ? search(searchQuery) : sortedWorkspaces;
  const displayedWorkspaces = baseWorkspaces.filter(
    workspace => (workspace.mode ?? 'Research') === 'Research'
  );

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
        tabs,
        mode: appMode,
        description: `${tabs.length} tab${tabs.length === 1 ? '' : 's'}`,
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
      const _currentTabs = [...tabsStore.tabs];
      for (const tab of tabs) {
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
        const firstTab = tabs.find(t => t.url === workspace.tabs[0].url);
        if (firstTab) {
          tabsStore.setActive(firstTab.id);
          await ipc.tabs.activate({ id: firstTab.id });
        }
      }

      // Restore mode (Research-only alpha)
      await useAppStore.getState().setMode('Research');

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

  const handleSessionImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      await importSessionFromFile(file);
    } catch {
      // errors handled inside helper
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  return (
    <div className="flex h-full flex-col bg-slate-900 text-slate-100">
      {/* Header */}
      <div className="border-b border-slate-800 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Workspaces</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                await exportSessionToFile();
              }}
              className="flex items-center gap-2 rounded-lg border border-slate-700/70 px-3 py-1.5 text-xs text-slate-200 transition hover:border-slate-500/80"
            >
              <Download size={14} />
              Export .omnisession
            </button>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-700/70 px-3 py-1.5 text-xs text-slate-200 transition hover:border-slate-500/80">
              <Upload size={14} />
              {importing ? 'Importing...' : 'Import session'}
              <input
                ref={fileInputRef}
                type="file"
                accept=".omnisession,application/json"
                className="hidden"
                onChange={handleSessionImport}
                disabled={importing}
              />
            </label>
            <button
              onClick={handleSave}
              disabled={saving || tabs.length === 0}
              className="flex items-center gap-2 rounded-lg bg-blue-600/20 px-3 py-1.5 text-sm text-blue-300 transition-colors hover:bg-blue-600/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save size={14} />
              Save Workspace
            </button>
          </div>
        </div>
        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search workspaces..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>
      </div>

      {/* Workspaces List */}
      <div className="flex-1 overflow-y-auto p-4">
        {displayedWorkspaces.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            {searchQuery ? 'No workspaces found' : 'No workspaces yet'}
            <p className="mt-2 text-sm">
              {!searchQuery && 'Save your current tabs as a workspace to get started'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayedWorkspaces.map(workspace => (
              <div
                key={workspace.id}
                className="group flex items-start gap-3 rounded-lg bg-slate-800/50 p-3 transition-colors hover:bg-slate-800"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-slate-100">{workspace.name}</h3>
                    {workspace.isPinned && (
                      <Pin size={12} className="fill-current text-yellow-400" />
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-400">
                    {workspace.tabs.length} tab{workspace.tabs.length === 1 ? '' : 's'} •{' '}
                    {workspace.mode}
                  </p>
                  {workspace.description && (
                    <p className="mt-1 text-xs text-gray-500">{workspace.description}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    {formatDistanceToNow(new Date(workspace.updatedAt), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => togglePin(workspace.id)}
                    className="rounded p-1.5 transition-colors hover:bg-slate-700"
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
                    className="rounded p-1.5 text-blue-400 transition-colors hover:bg-blue-500/20"
                    title="Restore workspace"
                  >
                    <FolderOpen size={14} />
                  </button>
                  <button
                    onClick={() => handleRemove(workspace.id)}
                    className="rounded p-1.5 text-red-400 transition-colors hover:bg-red-500/20"
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
