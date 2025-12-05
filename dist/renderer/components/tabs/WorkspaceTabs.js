import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * WorkspaceTabs - Day 3: SigmaOS-style nesting/workspaces
 * Supports infinite nesting and workspace organization
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Folder, FolderOpen, Plus, Lock } from 'lucide-react';
import { useTabsStore } from '../../state/tabsStore';
import { toast } from '../../utils/toast';
export function WorkspaceTabs({ nestLevel = 0, maxNestLevel = Infinity }) {
    const { tabs, activeId, setActive } = useTabsStore();
    const [workspaces, setWorkspaces] = useState([]);
    const [expandedWorkspaces, setExpandedWorkspaces] = useState(new Set());
    const toggleWorkspace = (workspaceId) => {
        setExpandedWorkspaces(prev => {
            const next = new Set(prev);
            if (next.has(workspaceId)) {
                next.delete(workspaceId);
            }
            else {
                next.add(workspaceId);
            }
            return next;
        });
    };
    const createWorkspace = () => {
        const newWorkspace = {
            id: `workspace-${Date.now()}`,
            name: `Workspace ${workspaces.length + 1}`,
            tabs: [],
            nested: [],
        };
        setWorkspaces(prev => [...prev, newWorkspace]);
        toast.info('New workspace created');
    };
    const _addTabToWorkspace = (workspaceId, tabId) => {
        setWorkspaces(prev => prev.map(ws => (ws.id === workspaceId ? { ...ws, tabs: [...ws.tabs, tabId] } : ws)));
    };
    const lockWorkspace = (workspaceId) => {
        setWorkspaces(prev => prev.map(ws => (ws.id === workspaceId ? { ...ws, locked: !ws.locked } : ws)));
        toast.info('Workspace locked');
    };
    return (_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between px-2 py-1", children: [_jsx("span", { className: "text-xs font-medium text-slate-400", children: "Workspaces" }), _jsx("button", { onClick: createWorkspace, className: "p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors", title: "New Workspace", children: _jsx(Plus, { className: "w-4 h-4" }) })] }), workspaces.map(workspace => {
                const isExpanded = expandedWorkspaces.has(workspace.id);
                const workspaceTabs = tabs.filter(t => workspace.tabs.includes(t.id));
                return (_jsxs(motion.div, { initial: { opacity: 0, y: -10 }, animate: { opacity: 1, y: 0 }, className: "space-y-1", children: [_jsxs("div", { className: "flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-800/50 cursor-pointer group", onClick: () => toggleWorkspace(workspace.id), children: [isExpanded ? (_jsx(FolderOpen, { className: "w-4 h-4 text-purple-400" })) : (_jsx(Folder, { className: "w-4 h-4 text-slate-400" })), _jsx("span", { className: "flex-1 text-sm text-slate-300", children: workspace.name }), workspace.locked && _jsx(Lock, { className: "w-3 h-3 text-amber-400" }), _jsx("button", { onClick: e => {
                                        e.stopPropagation();
                                        lockWorkspace(workspace.id);
                                    }, className: "opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-700 transition-opacity", title: workspace.locked ? 'Unlock' : 'Lock', children: _jsx(Lock, { className: `w-3 h-3 ${workspace.locked ? 'text-amber-400' : 'text-slate-500'}` }) })] }), isExpanded && nestLevel < maxNestLevel && workspace.nested && (_jsx("div", { className: "ml-4 border-l border-slate-800 pl-2", children: _jsx(WorkspaceTabs, { nestLevel: nestLevel + 1, maxNestLevel: maxNestLevel }) })), isExpanded && (_jsxs(motion.div, { initial: { height: 0, opacity: 0 }, animate: { height: 'auto', opacity: 1 }, exit: { height: 0, opacity: 0 }, className: "ml-4 space-y-1", children: [workspaceTabs.map(tab => (_jsx("div", { onClick: () => setActive(tab.id), className: `px-2 py-1 rounded text-sm cursor-pointer transition-colors ${activeId === tab.id
                                        ? 'bg-purple-600/20 text-white'
                                        : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`, children: tab.title || tab.url }, tab.id))), workspaceTabs.length === 0 && (_jsx("div", { className: "px-2 py-1 text-xs text-slate-500", children: "Drag tabs here to organize" }))] }))] }, workspace.id));
            }), workspaces.length === 0 && (_jsxs("div", { className: "px-2 py-4 text-center text-xs text-slate-500", children: [_jsx("p", { children: "No workspaces yet" }), _jsx("button", { onClick: createWorkspace, className: "mt-2 text-purple-400 hover:text-purple-300", children: "Create Workspace" })] }))] }));
}
