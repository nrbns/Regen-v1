/**
 * Plugin Registry - Tier 3 Pillar 4
 * User-level extensions and plugin management
 */
import { toolRegistryV2 } from '../agent/tools/v2';
export type PanelDefinition = {
    id: string;
    name: string;
    component: React.ComponentType;
    mode?: string;
    position?: 'left' | 'right' | 'bottom';
};
export type OmniPlugin = {
    id: string;
    name: string;
    version: string;
    description?: string;
    author?: string;
    enabled: boolean;
    registerTools?: (registry: typeof toolRegistryV2) => void;
    registerPanels?: () => PanelDefinition[];
    onEnable?: () => void | Promise<void>;
    onDisable?: () => void | Promise<void>;
};
declare class PluginRegistry {
    private plugins;
    private panels;
    /**
     * Register a plugin
     */
    register(plugin: OmniPlugin): void;
    /**
     * Enable a plugin
     */
    enable(pluginId: string): Promise<boolean>;
    /**
     * Disable a plugin
     */
    disable(pluginId: string): Promise<boolean>;
    /**
     * Get all plugins
     */
    getAll(): OmniPlugin[];
    /**
     * Get enabled plugins
     */
    getEnabled(): OmniPlugin[];
    /**
     * Get plugin by ID
     */
    get(pluginId: string): OmniPlugin | undefined;
    /**
     * Get panels for a mode
     */
    getPanelsForMode(mode: string): PanelDefinition[];
    /**
     * Get all panels
     */
    getAllPanels(): PanelDefinition[];
    /**
     * Load plugins from local folder
     */
    loadFromFolder(folderPath: string): Promise<void>;
    /**
     * Persist plugin state
     */
    private persistPluginState;
    /**
     * Restore plugin state
     */
    restorePluginState(): void;
}
export declare const pluginRegistry: PluginRegistry;
export {};
