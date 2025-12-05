/**
 * Workspace Store - Manages active workspace and workspace state
 */
export interface Workspace {
    id: string;
    name: string;
    createdAt: number;
    updatedAt: number;
    tabs: Array<{
        id: string;
        url: string;
        title?: string;
        position: number;
    }>;
    notes?: Record<string, string>;
    proxyProfileId?: string;
    mode?: string;
    layout?: {
        sidebarWidth?: number;
        rightPanelWidth?: number;
        splitPaneRatio?: number;
    };
}
type WorkspaceState = {
    workspaces: Workspace[];
    activeWorkspaceId: string | null;
    setWorkspaces: (workspaces: Workspace[]) => void;
    setActiveWorkspace: (workspaceId: string | null) => void;
    addWorkspace: (workspace: Workspace) => void;
    removeWorkspace: (workspaceId: string) => void;
    updateWorkspace: (workspaceId: string, updates: Partial<Workspace>) => void;
    loadWorkspaces: () => Promise<void>;
};
export declare const useWorkspaceStore: import("zustand").UseBoundStore<import("zustand").StoreApi<WorkspaceState>>;
export {};
