/**
 * Workspace Store - Manages active workspace and workspace state
 */
import { create } from 'zustand';
import { ipc } from '../lib/ipc-typed';
export const useWorkspaceStore = create((set, _get) => ({
    workspaces: [],
    activeWorkspaceId: null,
    setWorkspaces: (workspaces) => set({ workspaces }),
    setActiveWorkspace: (workspaceId) => set({ activeWorkspaceId: workspaceId }),
    addWorkspace: (workspace) => set((state) => ({
        workspaces: [...state.workspaces, workspace],
    })),
    removeWorkspace: (workspaceId) => set((state) => ({
        workspaces: state.workspaces.filter(w => w.id !== workspaceId),
        activeWorkspaceId: state.activeWorkspaceId === workspaceId ? null : state.activeWorkspaceId,
    })),
    updateWorkspace: (workspaceId, updates) => set((state) => ({
        workspaces: state.workspaces.map(w => w.id === workspaceId ? { ...w, ...updates } : w),
    })),
    loadWorkspaces: async () => {
        try {
            const response = await ipc.workspaceV2.list();
            if (response && Array.isArray(response.workspaces)) {
                set({ workspaces: response.workspaces });
            }
        }
        catch (error) {
            console.error('Failed to load workspaces:', error);
        }
    },
}));
