/**
 * Agent Capability Controls - Tier 3 Pillar 4
 * Whitelist and permission system for agent actions
 */
export type AgentCapability = 'open_tabs' | 'close_tabs' | 'navigate_tabs' | 'save_workspaces' | 'delete_workspaces' | 'send_network_requests' | 'access_local_files' | 'execute_external_scripts' | 'modify_settings';
export type CapabilityConfig = {
    capability: AgentCapability;
    enabled: boolean;
    description: string;
};
type CapabilityState = {
    capabilities: Record<AgentCapability, boolean>;
    experimentalToolsEnabled: boolean;
    externalPluginsEnabled: boolean;
    setCapability: (capability: AgentCapability, enabled: boolean) => void;
    setExperimentalTools: (enabled: boolean) => void;
    setExternalPlugins: (enabled: boolean) => void;
    checkCapability: (capability: AgentCapability) => boolean;
};
export declare const useCapabilityStore: import("zustand").UseBoundStore<Omit<import("zustand").StoreApi<CapabilityState>, "persist"> & {
    persist: {
        setOptions: (options: Partial<import("zustand/middleware").PersistOptions<CapabilityState, CapabilityState>>) => void;
        clearStorage: () => void;
        rehydrate: () => Promise<void> | void;
        hasHydrated: () => boolean;
        onHydrate: (fn: (state: CapabilityState) => void) => () => void;
        onFinishHydration: (fn: (state: CapabilityState) => void) => () => void;
        getOptions: () => Partial<import("zustand/middleware").PersistOptions<CapabilityState, CapabilityState>>;
    };
}>;
/**
 * Check if a capability is enabled
 */
export declare function hasCapability(capability: AgentCapability): boolean;
/**
 * Get capability descriptions
 */
export declare function getCapabilityDescriptions(): Record<AgentCapability, string>;
/**
 * Capability guard for agent tools
 */
export declare function requireCapability(capability: AgentCapability): void;
export {};
