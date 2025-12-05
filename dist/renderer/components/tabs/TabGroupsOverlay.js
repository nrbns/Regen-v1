import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Tab Groups Overlay - Chrome-like interface for managing tab groups
 */
import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FolderPlus, Edit3, Trash2, Palette, ChevronDown, ChevronRight, Plus, Folder, } from 'lucide-react';
import { useTabsStore, TAB_GROUP_COLORS } from '../../state/tabsStore';
import { Portal } from '../common/Portal';
export function TabGroupsOverlay({ open, onClose }) {
    const { tabs, tabGroups, createGroup, updateGroup, deleteGroup, assignTabToGroup, toggleGroupCollapsed, setGroupColor, } = useTabsStore();
    const [editingGroupId, setEditingGroupId] = useState(null);
    const [editingName, setEditingName] = useState('');
    const [draggedTabId, setDraggedTabId] = useState(null);
    // Group tabs by groupId
    const tabsByGroup = useMemo(() => {
        const grouped = new Map();
        tabs.forEach(tab => {
            const groupId = tab.groupId || 'ungrouped';
            if (!grouped.has(groupId)) {
                grouped.set(groupId, []);
            }
            grouped.get(groupId).push(tab);
        });
        return grouped;
    }, [tabs]);
    const handleCreateGroup = useCallback(() => {
        const group = createGroup({ name: `Group ${tabGroups.length + 1}` });
        setEditingGroupId(group.id);
        setEditingName(group.name);
    }, [createGroup, tabGroups.length]);
    const handleRenameGroup = useCallback((group) => {
        setEditingGroupId(group.id);
        setEditingName(group.name);
    }, []);
    const handleSaveRename = useCallback((groupId) => {
        if (editingName.trim()) {
            updateGroup(groupId, { name: editingName.trim() });
        }
        setEditingGroupId(null);
        setEditingName('');
    }, [editingName, updateGroup]);
    const handleCancelRename = useCallback(() => {
        setEditingGroupId(null);
        setEditingName('');
    }, []);
    const handleDeleteGroup = useCallback((groupId) => {
        if (window.confirm('Delete this group? Tabs will be ungrouped but not closed.')) {
            deleteGroup(groupId);
        }
    }, [deleteGroup]);
    const handleCycleColor = useCallback((group) => {
        const currentIndex = TAB_GROUP_COLORS.findIndex(c => c === group.color);
        const nextColor = TAB_GROUP_COLORS[(currentIndex + 1) % TAB_GROUP_COLORS.length];
        setGroupColor(group.id, nextColor);
    }, [setGroupColor]);
    const handleDropTab = useCallback((groupId) => {
        if (draggedTabId) {
            assignTabToGroup(draggedTabId, groupId || null);
            setDraggedTabId(null);
        }
    }, [draggedTabId, assignTabToGroup]);
    const ungroupedTabs = tabsByGroup.get('ungrouped') || [];
    if (!open)
        return null;
    return (_jsx(Portal, { children: _jsx(AnimatePresence, { children: _jsx(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, className: "fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm", onClick: onClose, children: _jsxs(motion.div, { initial: { scale: 0.95, opacity: 0, y: 20 }, animate: { scale: 1, opacity: 1, y: 0 }, exit: { scale: 0.95, opacity: 0, y: 20 }, transition: { type: 'spring', damping: 25, stiffness: 300 }, className: "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl max-h-[80vh] bg-gray-900 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden", onClick: e => e.stopPropagation(), children: [_jsxs("div", { className: "flex items-center justify-between px-6 py-4 border-b border-gray-700 bg-gray-800/50", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(Folder, { className: "w-5 h-5 text-purple-400" }), _jsx("h2", { className: "text-xl font-semibold text-white", children: "Tab Groups" }), _jsxs("span", { className: "text-sm text-gray-400", children: [tabGroups.length, " group", tabGroups.length !== 1 ? 's' : ''] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("button", { onClick: handleCreateGroup, className: "flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors", children: [_jsx(FolderPlus, { size: 16 }), "New Group"] }), _jsx("button", { onClick: onClose, className: "p-2 hover:bg-gray-700 rounded-lg transition-colors text-gray-400 hover:text-white", children: _jsx(X, { size: 20 }) })] })] }), _jsx("div", { className: "overflow-y-auto max-h-[calc(80vh-80px)] p-6", children: tabGroups.length === 0 && ungroupedTabs.length === 0 ? (_jsxs("div", { className: "flex flex-col items-center justify-center py-16 text-center", children: [_jsx(Folder, { className: "w-16 h-16 text-gray-600 mb-4" }), _jsx("h3", { className: "text-lg font-semibold text-gray-300 mb-2", children: "No tabs or groups" }), _jsx("p", { className: "text-sm text-gray-500 mb-6", children: "Create a group to organize your tabs" }), _jsx("button", { onClick: handleCreateGroup, className: "px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors", children: "Create Your First Group" })] })) : (_jsxs("div", { className: "space-y-4", children: [tabGroups.map(group => {
                                        const groupTabs = tabsByGroup.get(group.id) || [];
                                        const isCollapsed = group.collapsed;
                                        return (_jsxs(motion.div, { layout: true, className: "bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden", onDragOver: e => {
                                                if (draggedTabId) {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                }
                                            }, onDrop: e => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleDropTab(group.id);
                                            }, children: [_jsxs("div", { className: "flex items-center gap-3 px-4 py-3 bg-gray-800/70 border-b border-gray-700", style: {
                                                        borderLeft: `4px solid ${group.color}`,
                                                    }, children: [_jsx("button", { onClick: () => toggleGroupCollapsed(group.id), className: "p-1 hover:bg-gray-700 rounded transition-colors text-gray-400 hover:text-white", children: isCollapsed ? (_jsx(ChevronRight, { size: 16 })) : (_jsx(ChevronDown, { size: 16 })) }), _jsx("div", { className: "w-4 h-4 rounded-full border border-white/20 flex-shrink-0", style: { backgroundColor: group.color } }), editingGroupId === group.id ? (_jsx("input", { type: "text", value: editingName, onChange: e => setEditingName(e.target.value), onBlur: () => handleSaveRename(group.id), onKeyDown: e => {
                                                                if (e.key === 'Enter') {
                                                                    handleSaveRename(group.id);
                                                                }
                                                                else if (e.key === 'Escape') {
                                                                    handleCancelRename();
                                                                }
                                                            }, className: "flex-1 bg-gray-700 text-white px-2 py-1 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500", autoFocus: true })) : (_jsx("button", { onClick: () => handleRenameGroup(group), className: "flex-1 text-left text-sm font-semibold text-white hover:text-purple-400 transition-colors", children: group.name })), _jsxs("span", { className: "text-xs text-gray-400", children: [groupTabs.length, " tab", groupTabs.length !== 1 ? 's' : ''] }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx("button", { onClick: () => handleCycleColor(group), className: "p-1.5 hover:bg-gray-700 rounded transition-colors text-gray-400 hover:text-white", title: "Change color", children: _jsx(Palette, { size: 14 }) }), _jsx("button", { onClick: () => handleRenameGroup(group), className: "p-1.5 hover:bg-gray-700 rounded transition-colors text-gray-400 hover:text-white", title: "Rename", children: _jsx(Edit3, { size: 14 }) }), _jsx("button", { onClick: () => handleDeleteGroup(group.id), className: "p-1.5 hover:bg-red-500/20 rounded transition-colors text-gray-400 hover:text-red-400", title: "Delete group", children: _jsx(Trash2, { size: 14 }) })] })] }), !isCollapsed && (_jsx(AnimatePresence, { children: _jsx("div", { className: "p-3 space-y-2", children: groupTabs.length === 0 ? (_jsxs("div", { className: "text-center py-8 text-gray-500 text-sm", children: [_jsx("p", { children: "No tabs in this group" }), _jsx("p", { className: "text-xs mt-1", children: "Drag tabs here to add them" })] })) : (groupTabs.map(tab => (_jsxs(motion.div, { layout: true, draggable: true, onDragStart: () => setDraggedTabId(tab.id), onDragEnd: () => setDraggedTabId(null), className: "flex items-center gap-3 px-3 py-2 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors cursor-move", children: [_jsx("div", { className: "w-2 h-2 rounded-full flex-shrink-0", style: { backgroundColor: group.color } }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "text-sm text-white truncate", children: tab.title || 'Untitled' }), _jsx("p", { className: "text-xs text-gray-400 truncate", children: tab.url || 'about:blank' })] }), _jsx("button", { onClick: () => assignTabToGroup(tab.id, null), className: "p-1 hover:bg-gray-600 rounded transition-colors text-gray-400 hover:text-white", title: "Remove from group", children: _jsx(X, { size: 14 }) })] }, tab.id)))) }) }))] }, group.id));
                                    }), ungroupedTabs.length > 0 && (_jsxs(motion.div, { layout: true, className: "bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden", onDragOver: e => {
                                            if (draggedTabId) {
                                                e.preventDefault();
                                                e.stopPropagation();
                                            }
                                        }, onDrop: e => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleDropTab(null);
                                        }, children: [_jsxs("div", { className: "flex items-center gap-3 px-4 py-3 bg-gray-800/70 border-b border-gray-700", children: [_jsx(Folder, { className: "w-4 h-4 text-gray-400" }), _jsx("h3", { className: "text-sm font-semibold text-gray-300", children: "Ungrouped Tabs" }), _jsxs("span", { className: "text-xs text-gray-500", children: [ungroupedTabs.length, " tab", ungroupedTabs.length !== 1 ? 's' : ''] })] }), _jsx("div", { className: "p-3 space-y-2", children: ungroupedTabs.map(tab => (_jsxs(motion.div, { layout: true, draggable: true, onDragStart: () => setDraggedTabId(tab.id), onDragEnd: () => setDraggedTabId(null), className: "flex items-center gap-3 px-3 py-2 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors cursor-move", children: [_jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "text-sm text-white truncate", children: tab.title || 'Untitled' }), _jsx("p", { className: "text-xs text-gray-400 truncate", children: tab.url || 'about:blank' })] }), _jsx("button", { onClick: () => {
                                                                if (tabGroups.length > 0) {
                                                                    assignTabToGroup(tab.id, tabGroups[0].id);
                                                                }
                                                                else {
                                                                    const newGroup = createGroup({});
                                                                    assignTabToGroup(tab.id, newGroup.id);
                                                                }
                                                            }, className: "p-1 hover:bg-gray-600 rounded transition-colors text-gray-400 hover:text-purple-400", title: "Add to group", children: _jsx(Plus, { size: 14 }) })] }, tab.id))) })] }))] })) })] }) }) }) }));
}
