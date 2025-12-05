export interface WorkspaceEvent {
    id: string;
    workspaceId?: string | null;
    type: string;
    message?: string;
    payload?: unknown;
    timestamp: number;
}
interface WorkspaceEventsState {
    events: WorkspaceEvent[];
    pushEvent: (event: Omit<WorkspaceEvent, 'id' | 'timestamp'> & {
        id?: string;
        timestamp?: number;
    }) => void;
    clear: (workspaceId?: string | null) => void;
}
export declare const useWorkspaceEventsStore: import("zustand").UseBoundStore<import("zustand").StoreApi<WorkspaceEventsState>>;
export {};
