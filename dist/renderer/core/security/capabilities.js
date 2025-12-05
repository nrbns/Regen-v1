/**
 * Agent Capability Controls - Tier 3 Pillar 4
 * Whitelist and permission system for agent actions
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { log } from '../../utils/logger';
const DEFAULT_CAPABILITIES = {
    open_tabs: true,
    close_tabs: false, // Disabled by default for safety
    navigate_tabs: true,
    save_workspaces: true,
    delete_workspaces: false, // Disabled by default
    send_network_requests: true,
    access_local_files: false, // Disabled by default
    execute_external_scripts: false, // Disabled by default
    modify_settings: false, // Disabled by default
};
export const useCapabilityStore = create()(persist((set, get) => ({
    capabilities: DEFAULT_CAPABILITIES,
    experimentalToolsEnabled: false,
    externalPluginsEnabled: false,
    setCapability: (capability, enabled) => {
        set(state => ({
            capabilities: {
                ...state.capabilities,
                [capability]: enabled,
            },
        }));
        log.info(`[Capabilities] ${capability} ${enabled ? 'enabled' : 'disabled'}`);
    },
    setExperimentalTools: enabled => {
        set({ experimentalToolsEnabled: enabled });
        log.info(`[Capabilities] Experimental tools ${enabled ? 'enabled' : 'disabled'}`);
    },
    setExternalPlugins: enabled => {
        set({ externalPluginsEnabled: enabled });
        log.info(`[Capabilities] External plugins ${enabled ? 'enabled' : 'disabled'}`);
    },
    checkCapability: capability => {
        return get().capabilities[capability] ?? false;
    },
}), {
    name: 'regen_capabilities_v1',
}));
/**
 * Check if a capability is enabled
 */
export function hasCapability(capability) {
    return useCapabilityStore.getState().checkCapability(capability);
}
/**
 * Get capability descriptions
 */
export function getCapabilityDescriptions() {
    return {
        open_tabs: 'Allow agent to open new tabs',
        close_tabs: 'Allow agent to close tabs',
        navigate_tabs: 'Allow agent to navigate between tabs',
        save_workspaces: 'Allow agent to save workspaces',
        delete_workspaces: 'Allow agent to delete workspaces',
        send_network_requests: 'Allow agent to make network requests to external sites',
        access_local_files: 'Allow agent to access local filesystem',
        execute_external_scripts: 'Allow agent to execute external scripts',
        modify_settings: 'Allow agent to modify application settings',
    };
}
/**
 * Capability guard for agent tools
 */
export function requireCapability(capability) {
    if (!hasCapability(capability)) {
        throw new Error(`Capability required: ${capability}. Enable it in Settings > Safety.`);
    }
}
