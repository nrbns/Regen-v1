export interface WorkflowStep {
    id: string;
    title: string;
    description: string;
    tabIds: string[];
    recommendedActions: string[];
    primaryDomain?: string;
    confidence?: number;
}
export interface WorkflowPlan {
    planId: string;
    goal: string;
    summary: string;
    generatedAt: number;
    confidence: number;
    steps: WorkflowStep[];
    sources: Array<{
        domain: string;
        tabIds: string[];
    }>;
}
interface WorkflowWeaverState {
    plan: WorkflowPlan | null;
    loading: boolean;
    error: string | null;
    lastFetchedAt: number | null;
    fetch: (options?: {
        maxSteps?: number;
        force?: boolean;
    }) => Promise<void>;
    setPlan: (plan: WorkflowPlan | null) => void;
}
export declare const useWorkflowWeaverStore: import("zustand").UseBoundStore<import("zustand").StoreApi<WorkflowWeaverState>>;
export {};
