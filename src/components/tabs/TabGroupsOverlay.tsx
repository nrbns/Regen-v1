/**
 * Tab Groups Overlay - Chrome-like interface for managing tab groups
 */

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  FolderPlus,
  Edit3,
  Trash2,
  Palette,
  ChevronDown,
  ChevronRight,
  Plus,
  Folder,
} from 'lucide-react';
import { useTabsStore, TAB_GROUP_COLORS, type TabGroup } from '../../state/tabsStore';
import { Portal } from '../common/Portal';

interface TabGroupsOverlayProps {
  open: boolean;
  onClose: () => void;
}

export function TabGroupsOverlay({ open, onClose }: TabGroupsOverlayProps) {
  const {
    tabs,
    tabGroups,
    createGroup,
    updateGroup,
    deleteGroup,
    assignTabToGroup,
    toggleGroupCollapsed,
    setGroupColor,
  } = useTabsStore();

  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);

  // Group tabs by groupId
  const tabsByGroup = useMemo(() => {
    const grouped = new Map<string | undefined, typeof tabs>();
    tabs.forEach(tab => {
      const groupId = tab.groupId || 'ungrouped';
      if (!grouped.has(groupId)) {
        grouped.set(groupId, []);
      }
      grouped.get(groupId)!.push(tab);
    });
    return grouped;
  }, [tabs]);

  const handleCreateGroup = useCallback(() => {
    const group = createGroup({ name: `Group ${tabGroups.length + 1}` });
    setEditingGroupId(group.id);
    setEditingName(group.name);
  }, [createGroup, tabGroups.length]);

  const handleRenameGroup = useCallback(
    (group: TabGroup) => {
      setEditingGroupId(group.id);
      setEditingName(group.name);
    },
    []
  );

  const handleSaveRename = useCallback(
    (groupId: string) => {
      if (editingName.trim()) {
        updateGroup(groupId, { name: editingName.trim() });
      }
      setEditingGroupId(null);
      setEditingName('');
    },
    [editingName, updateGroup]
  );

  const handleCancelRename = useCallback(() => {
    setEditingGroupId(null);
    setEditingName('');
  }, []);

  const handleDeleteGroup = useCallback(
    (groupId: string) => {
      if (window.confirm('Delete this group? Tabs will be ungrouped but not closed.')) {
        deleteGroup(groupId);
      }
    },
    [deleteGroup]
  );

  const handleCycleColor = useCallback(
    (group: TabGroup) => {
      const currentIndex = TAB_GROUP_COLORS.findIndex(c => c === group.color);
      const nextColor = TAB_GROUP_COLORS[(currentIndex + 1) % TAB_GROUP_COLORS.length];
      setGroupColor(group.id, nextColor);
    },
    [setGroupColor]
  );

  const handleDropTab = useCallback(
    (groupId: string | null) => {
      if (draggedTabId) {
        assignTabToGroup(draggedTabId, groupId || null);
        setDraggedTabId(null);
      }
    },
    [draggedTabId, assignTabToGroup]
  );

  const ungroupedTabs = tabsByGroup.get('ungrouped') || [];

  if (!open) return null;

  return (
    <Portal>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl max-h-[80vh] bg-gray-900 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 bg-gray-800/50">
              <div className="flex items-center gap-3">
                <Folder className="w-5 h-5 text-purple-400" />
                <h2 className="text-xl font-semibold text-white">Tab Groups</h2>
                <span className="text-sm text-gray-400">
                  {tabGroups.length} group{tabGroups.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCreateGroup}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                  <FolderPlus size={16} />
                  New Group
                </button>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-gray-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto max-h-[calc(80vh-80px)] p-6">
              {tabGroups.length === 0 && ungroupedTabs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Folder className="w-16 h-16 text-gray-600 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-300 mb-2">No tabs or groups</h3>
                  <p className="text-sm text-gray-500 mb-6">
                    Create a group to organize your tabs
                  </p>
                  <button
                    onClick={handleCreateGroup}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                  >
                    Create Your First Group
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Groups */}
                  {tabGroups.map(group => {
                    const groupTabs = tabsByGroup.get(group.id) || [];
                    const isCollapsed = group.collapsed;

                    return (
                      <motion.div
                        key={group.id}
                        layout
                        className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden"
                        onDragOver={e => {
                          if (draggedTabId) {
                            e.preventDefault();
                            e.stopPropagation();
                          }
                        }}
                        onDrop={e => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDropTab(group.id);
                        }}
                      >
                        {/* Group Header */}
                        <div
                          className="flex items-center gap-3 px-4 py-3 bg-gray-800/70 border-b border-gray-700"
                          style={{
                            borderLeft: `4px solid ${group.color}`,
                          }}
                        >
                          <button
                            onClick={() => toggleGroupCollapsed(group.id)}
                            className="p-1 hover:bg-gray-700 rounded transition-colors text-gray-400 hover:text-white"
                          >
                            {isCollapsed ? (
                              <ChevronRight size={16} />
                            ) : (
                              <ChevronDown size={16} />
                            )}
                          </button>

                          <div
                            className="w-4 h-4 rounded-full border border-white/20 flex-shrink-0"
                            style={{ backgroundColor: group.color }}
                          />

                          {editingGroupId === group.id ? (
                            <input
                              type="text"
                              value={editingName}
                              onChange={e => setEditingName(e.target.value)}
                              onBlur={() => handleSaveRename(group.id)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  handleSaveRename(group.id);
                                } else if (e.key === 'Escape') {
                                  handleCancelRename();
                                }
                              }}
                              className="flex-1 bg-gray-700 text-white px-2 py-1 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                              autoFocus
                            />
                          ) : (
                            <button
                              onClick={() => handleRenameGroup(group)}
                              className="flex-1 text-left text-sm font-semibold text-white hover:text-purple-400 transition-colors"
                            >
                              {group.name}
                            </button>
                          )}

                          <span className="text-xs text-gray-400">
                            {groupTabs.length} tab{groupTabs.length !== 1 ? 's' : ''}
                          </span>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleCycleColor(group)}
                              className="p-1.5 hover:bg-gray-700 rounded transition-colors text-gray-400 hover:text-white"
                              title="Change color"
                            >
                              <Palette size={14} />
                            </button>
                            <button
                              onClick={() => handleRenameGroup(group)}
                              className="p-1.5 hover:bg-gray-700 rounded transition-colors text-gray-400 hover:text-white"
                              title="Rename"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteGroup(group.id)}
                              className="p-1.5 hover:bg-red-500/20 rounded transition-colors text-gray-400 hover:text-red-400"
                              title="Delete group"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Group Tabs */}
                        {!isCollapsed && (
                          <AnimatePresence>
                            <div className="p-3 space-y-2">
                              {groupTabs.length === 0 ? (
                                <div className="text-center py-8 text-gray-500 text-sm">
                                  <p>No tabs in this group</p>
                                  <p className="text-xs mt-1">Drag tabs here to add them</p>
                                </div>
                              ) : (
                                groupTabs.map(tab => (
                                  <motion.div
                                    key={tab.id}
                                    layout
                                    draggable
                                    onDragStart={() => setDraggedTabId(tab.id)}
                                    onDragEnd={() => setDraggedTabId(null)}
                                    className="flex items-center gap-3 px-3 py-2 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors cursor-move"
                                  >
                                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: group.color }} />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm text-white truncate">{tab.title || 'Untitled'}</p>
                                      <p className="text-xs text-gray-400 truncate">{tab.url || 'about:blank'}</p>
                                    </div>
                                    <button
                                      onClick={() => assignTabToGroup(tab.id, null)}
                                      className="p-1 hover:bg-gray-600 rounded transition-colors text-gray-400 hover:text-white"
                                      title="Remove from group"
                                    >
                                      <X size={14} />
                                    </button>
                                  </motion.div>
                                ))
                              )}
                            </div>
                          </AnimatePresence>
                        )}
                      </motion.div>
                    );
                  })}

                  {/* Ungrouped Tabs */}
                  {ungroupedTabs.length > 0 && (
                    <motion.div
                      layout
                      className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden"
                      onDragOver={e => {
                        if (draggedTabId) {
                          e.preventDefault();
                          e.stopPropagation();
                        }
                      }}
                      onDrop={e => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDropTab(null);
                      }}
                    >
                      <div className="flex items-center gap-3 px-4 py-3 bg-gray-800/70 border-b border-gray-700">
                        <Folder className="w-4 h-4 text-gray-400" />
                        <h3 className="text-sm font-semibold text-gray-300">
                          Ungrouped Tabs
                        </h3>
                        <span className="text-xs text-gray-500">
                          {ungroupedTabs.length} tab{ungroupedTabs.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="p-3 space-y-2">
                        {ungroupedTabs.map(tab => (
                          <motion.div
                            key={tab.id}
                            layout
                            draggable
                            onDragStart={() => setDraggedTabId(tab.id)}
                            onDragEnd={() => setDraggedTabId(null)}
                            className="flex items-center gap-3 px-3 py-2 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors cursor-move"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-white truncate">{tab.title || 'Untitled'}</p>
                              <p className="text-xs text-gray-400 truncate">{tab.url || 'about:blank'}</p>
                            </div>
                            <button
                              onClick={() => {
                                if (tabGroups.length > 0) {
                                  assignTabToGroup(tab.id, tabGroups[0].id);
                                } else {
                                  const newGroup = createGroup({});
                                  assignTabToGroup(tab.id, newGroup.id);
                                }
                              }}
                              className="p-1 hover:bg-gray-600 rounded transition-colors text-gray-400 hover:text-purple-400"
                              title="Add to group"
                            >
                              <Plus size={14} />
                            </button>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </Portal>
  );
}

