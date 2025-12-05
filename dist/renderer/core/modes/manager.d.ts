export type ModeId = 'Browse' | 'Research' | 'Trade' | 'Games' | 'Docs' | 'Images' | 'Threats' | 'GraphMind';
export interface ModeDefinition {
    id: ModeId;
    name: string;
    icon: string;
    description: string;
    defaultTools?: string[];
    onboarding?: {
        steps?: string[];
        video?: string;
    };
    onActivate?: () => Promise<void> | void;
    onDeactivate?: () => Promise<void> | void;
    privacyDefaults?: {
        ghost?: boolean;
        proxy?: 'tor' | 'vpn' | 'none';
        trackingProtection?: boolean;
    };
    aiContext?: {
        prompt?: string;
        agentId?: string;
    };
}
interface ModeManagerState {
    currentMode: ModeId;
    previousMode: ModeId | null;
    modes: Record<ModeId, ModeDefinition>;
    loading: boolean;
    activateMode: (mode: ModeId) => Promise<void>;
    registerMode: (definition: ModeDefinition) => void;
}
export declare const useModeManager: import("zustand").UseBoundStore<import("zustand").StoreApi<ModeManagerState>>;
export declare const ModeManager: {
    activate: (mode: ModeId) => Promise<void>;
    register: (definition: ModeDefinition) => void;
    getCurrent: () => ModeDefinition;
};
export {};
