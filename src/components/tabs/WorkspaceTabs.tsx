/**
 * WorkspaceTabs - Day 3: SigmaOS-style nesting/workspaces
 * Supports infinite nesting and workspace organization
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Folder, FolderOpen, Plus, Lock } from 'lucide-react';
import { useTabsStore } from '../../state/tabsStore';
import { toast } from '../../utils/toast';

interface Workspace {
  id: string;
  name: string;
  tabs: string[]; // Tab IDs
  nested?: Workspace[];
  locked?: boolean;
}

interface WorkspaceTabsProps {
  nestLevel?: number;
  maxNestLevel?: number;
}

export function WorkspaceTabs({ nestLevel = 0, maxNestLevel = Infinity }: WorkspaceTabsProps) {
  const { tabs, activeId, setActive } = useTabsStore();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [expandedWorkspaces, setExpandedWorkspaces] = useState<Set<string>>(new Set());

  const toggleWorkspace = (workspaceId: string) => {
    setExpandedWorkspaces(prev => {
      const next = new Set(prev);
      if (next.has(workspaceId)) {
        next.delete(workspaceId);
      } else {
        next.add(workspaceId);
      }
      return next;
    });
  };

  const createWorkspace = () => {
    const newWorkspace: Workspace = {
      id: `workspace-${Date.now()}`,
      name: `Workspace ${workspaces.length + 1}`,
      tabs: [],
      nested: [],
    };
    setWorkspaces(prev => [...prev, newWorkspace]);
    toast.info('New workspace created');
  };

  const _addTabToWorkspace = (workspaceId: string, tabId: string) => {
    setWorkspaces(prev =>
      prev.map(ws => (ws.id === workspaceId ? { ...ws, tabs: [...ws.tabs, tabId] } : ws))
    );
  };

  const lockWorkspace = (workspaceId: string) => {
    setWorkspaces(prev =>
      prev.map(ws => (ws.id === workspaceId ? { ...ws, locked: !ws.locked } : ws))
    );
    toast.info('Workspace locked');
  };

  return (
    <div className="space-y-2">
      {/* Workspace Header */}
      <div className="flex items-center justify-between px-2 py-1">
        <span className="text-xs font-medium text-slate-400">Workspaces</span>
        <button
          onClick={createWorkspace}
          className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
          title="New Workspace"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Workspaces List */}
      {workspaces.map(workspace => {
        const isExpanded = expandedWorkspaces.has(workspace.id);
        const workspaceTabs = tabs.filter(t => workspace.tabs.includes(t.id));

        return (
          <motion.div
            key={workspace.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-1"
          >
            {/* Workspace Header */}
            <div
              className="group flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-slate-800/50"
              onClick={() => toggleWorkspace(workspace.id)}
            >
              {isExpanded ? (
                <FolderOpen className="h-4 w-4 text-purple-400" />
              ) : (
                <Folder className="h-4 w-4 text-slate-400" />
              )}
              <span className="flex-1 text-sm text-slate-300">{workspace.name}</span>
              {workspace.locked && <Lock className="h-3 w-3 text-amber-400" />}
              <button
                onClick={e => {
                  e.stopPropagation();
                  lockWorkspace(workspace.id);
                }}
                className="rounded p-1 opacity-0 transition-opacity hover:bg-slate-700 group-hover:opacity-100"
                title={workspace.locked ? 'Unlock' : 'Lock'}
              >
                <Lock
                  className={`h-3 w-3 ${workspace.locked ? 'text-amber-400' : 'text-slate-500'}`}
                />
              </button>
            </div>

            {/* Nested Workspaces */}
            {isExpanded && nestLevel < maxNestLevel && workspace.nested && (
              <div className="ml-4 border-l border-slate-800 pl-2">
                <WorkspaceTabs nestLevel={nestLevel + 1} maxNestLevel={maxNestLevel} />
              </div>
            )}

            {/* Workspace Tabs */}
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="ml-4 space-y-1"
              >
                {workspaceTabs.map(tab => (
                  <div
                    key={tab.id}
                    onClick={() => setActive(tab.id)}
                    className={`cursor-pointer rounded px-2 py-1 text-sm transition-colors ${
                      activeId === tab.id
                        ? 'bg-purple-600/20 text-white'
                        : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                    }`}
                  >
                    {tab.title || tab.url}
                  </div>
                ))}
                {workspaceTabs.length === 0 && (
                  <div className="px-2 py-1 text-xs text-slate-500">Drag tabs here to organize</div>
                )}
              </motion.div>
            )}
          </motion.div>
        );
      })}

      {workspaces.length === 0 && (
        <div className="px-2 py-4 text-center text-xs text-slate-500">
          <p>No workspaces yet</p>
          <button onClick={createWorkspace} className="mt-2 text-purple-400 hover:text-purple-300">
            Create Workspace
          </button>
        </div>
      )}
    </div>
  );
}
