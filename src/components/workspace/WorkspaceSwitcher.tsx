/**
 * WorkspaceSwitcher - Arc-style workspace switcher with tab groups
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, Plus, X, Edit2, Check, Loader2, Layers } from 'lucide-react';
import { ipc } from '../../lib/ipc-typed';
import { useWorkspaceStore, type Workspace } from '../../state/workspaceStore';
import { useTabsStore } from '../../state/tabsStore';
import { isDevEnv } from '../../lib/env';

const IS_DEV = isDevEnv();

interface WorkspaceSwitcherProps {
  compact?: boolean;
}

export function WorkspaceSwitcher({ compact = false }: WorkspaceSwitcherProps) {
  const { workspaces, activeWorkspaceId, setWorkspaces, setActiveWorkspace, loadWorkspaces } = useWorkspaceStore();
  const { tabs } = useTabsStore();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [editName, setEditName] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void loadWorkspaces();
  }, [loadWorkspaces]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (switcherRef.current && !switcherRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleCreate = useCallback(async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const workspaceId = `workspace-${Date.now()}`;
      const workspace: Workspace = {
        id: workspaceId,
        name: newName.trim(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tabs: tabs.map((tab, idx) => ({
          id: tab.id,
          url: tab.url || 'about:blank',
          title: tab.title,
          position: idx,
        })),
      };
      
      await ipc.workspaceV2.save(workspace);
      await loadWorkspaces();
      setActiveWorkspace(workspaceId);
      setNewName('');
      setCreating(false);
      setOpen(false);
    } catch (error) {
      console.error('Failed to create workspace:', error);
    } finally {
      setSaving(false);
    }
  }, [newName, tabs, setActiveWorkspace, loadWorkspaces]);

  const handleSelect = useCallback(async (workspaceId: string) => {
    setLoading(true);
    try {
      const workspace = await ipc.workspaceV2.load(workspaceId);
      if (workspace) {
        setActiveWorkspace(workspaceId);
        
        // Close all current tabs first
        const currentTabs = await ipc.tabs.list();
        for (const tab of currentTabs) {
          await ipc.tabs.close({ id: tab.id }).catch(() => {});
        }
        
        // Open workspace tabs in order
        const workspaceTabs = (workspace as any).tabs || [];
        for (let i = 0; i < workspaceTabs.length; i++) {
          const tabLayout = workspaceTabs[i];
          await ipc.tabs.create({
            url: tabLayout.url,
            activate: i === 0, // Activate first tab
          });
        }
        
        setOpen(false);
      }
    } catch (error) {
      console.error('Failed to load workspace:', error);
    } finally {
      setLoading(false);
    }
  }, [setActiveWorkspace]);

  const handleSaveCurrent = useCallback(async () => {
    if (!activeWorkspaceId) return;
    setSaving(true);
    try {
      const workspace: Workspace = {
        id: activeWorkspaceId,
        name: workspaces.find(w => w.id === activeWorkspaceId)?.name || 'Workspace',
        createdAt: workspaces.find(w => w.id === activeWorkspaceId)?.createdAt || Date.now(),
        updatedAt: Date.now(),
        tabs: tabs.map((tab, idx) => ({
          id: tab.id,
          url: tab.url || 'about:blank',
          title: tab.title,
          position: idx,
        })),
      };
      
      await ipc.workspaceV2.save(workspace);
      await loadWorkspaces();
    } catch (error) {
      console.error('Failed to save workspace:', error);
    } finally {
      setSaving(false);
    }
  }, [activeWorkspaceId, workspaces, tabs, loadWorkspaces]);

  const handleDelete = useCallback(async (workspaceId: string) => {
    if (!confirm('Delete this workspace? This cannot be undone.')) return;
    try {
      await ipc.workspaceV2.delete(workspaceId);
      await loadWorkspaces();
      if (activeWorkspaceId === workspaceId) {
        setActiveWorkspace(null);
      }
    } catch (error) {
      console.error('Failed to delete workspace:', error);
    }
  }, [activeWorkspaceId, setActiveWorkspace, loadWorkspaces]);

  const handleEdit = useCallback(async (workspaceId: string) => {
    const workspace = workspaces.find(w => w.id === workspaceId);
    if (!workspace) return;
    
    setEditName(workspace.name);
    setEditingId(workspaceId);
  }, [workspaces]);

  const handleSaveEdit = useCallback(async () => {
    if (!editingId || !editName.trim()) return;
    try {
      const workspace = workspaces.find(w => w.id === editingId);
      if (!workspace) return;
      
      await ipc.workspaceV2.save({
        ...workspace,
        name: editName.trim(),
      } as any);
      await loadWorkspaces();
      setEditingId(null);
      setEditName('');
    } catch (error) {
      console.error('Failed to update workspace:', error);
    }
  }, [editingId, editName, workspaces, loadWorkspaces]);

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);

  return (
    <div ref={switcherRef} className="relative">
      <motion.button
        onClick={() => setOpen(!open)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all border ${
          activeWorkspace
            ? 'bg-primary/20 border-primary/40 text-primary'
            : 'bg-white/5 border-white/10 text-muted hover:bg-white/10 hover:text-primary'
        }`}
        title={activeWorkspace ? `Workspace: ${activeWorkspace.name}` : 'Select workspace'}
      >
        <Layers size={16} />
        {!compact && activeWorkspace && (
          <span className="max-w-[120px] truncate">{activeWorkspace.name}</span>
        )}
        {activeWorkspace && (
          <span className="text-xs opacity-70">{activeWorkspace.tabs.length}</span>
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-white/10 bg-surface-elevated/95 backdrop-blur-xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="p-4 border-b border-white/5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm">Workspaces</h3>
                  <div className="flex items-center gap-2">
                    {activeWorkspaceId && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleSaveCurrent}
                        disabled={saving}
                        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
                        title="Save current workspace"
                      >
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      </motion.button>
                    )}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setCreating(true);
                        setNewName('');
                      }}
                      className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                      title="Create workspace"
                    >
                      <Plus size={16} />
                    </motion.button>
                  </div>
                </div>

                {creating && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Workspace name"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          void handleCreate();
                        } else if (e.key === 'Escape') {
                          setCreating(false);
                          setNewName('');
                        }
                      }}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleCreate}
                        disabled={!newName.trim() || saving}
                        className="flex-1 px-3 py-1.5 bg-primary hover:bg-primary/80 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                      >
                        Create
                      </button>
                      <button
                        onClick={() => {
                          setCreating(false);
                          setNewName('');
                        }}
                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-muted"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="max-h-96 overflow-y-auto">
                {workspaces.length === 0 && !creating && (
                  <div className="p-4 text-center text-sm text-muted">
                    No workspaces yet. Create one to get started.
                  </div>
                )}

                {workspaces.map((workspace) => {
                  const isActive = workspace.id === activeWorkspaceId;
                  const isEditing = editingId === workspace.id;

                  return (
                    <div
                      key={workspace.id}
                      className={`p-3 border-b border-white/5 transition-colors ${
                        isActive ? 'bg-primary/10' : 'hover:bg-white/5'
                      }`}
                    >
                      {isEditing ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                void handleSaveEdit();
                              } else if (e.key === 'Escape') {
                                setEditingId(null);
                                setEditName('');
                              }
                            }}
                            className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={handleSaveEdit}
                              className="px-2 py-1 bg-primary hover:bg-primary/80 rounded text-xs text-white"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingId(null);
                                setEditName('');
                              }}
                              className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded text-xs text-muted"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleSelect(workspace.id)}
                            disabled={loading}
                            className="flex-1 text-left"
                          >
                            <div className="flex items-center gap-2">
                              <Folder size={16} className={isActive ? 'text-primary' : 'text-muted'} />
                              <div className="flex-1 min-w-0">
                                <div className={`text-sm font-medium truncate ${isActive ? 'text-primary' : 'text-white'}`}>
                                  {workspace.name}
                                </div>
                                <div className="text-xs text-muted">
                                  {workspace.tabs.length} tab{workspace.tabs.length !== 1 ? 's' : ''} • Updated {new Date(workspace.updatedAt).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                          </button>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleEdit(workspace.id)}
                              className="p-1 rounded hover:bg-white/10 transition-colors text-muted hover:text-primary"
                              title="Rename workspace"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(workspace.id)}
                              className="p-1 rounded hover:bg-red-500/20 transition-colors text-muted hover:text-red-400"
                              title="Delete workspace"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {activeWorkspace && (
                <div className="p-3 border-t border-white/5 bg-white/5">
                  <div className="text-xs text-muted mb-2">Current Workspace</div>
                  <div className="text-sm font-medium text-white">{activeWorkspace.name}</div>
                  <div className="text-xs text-muted mt-1">
                    {tabs.length} tab{tabs.length !== 1 ? 's' : ''} open
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

