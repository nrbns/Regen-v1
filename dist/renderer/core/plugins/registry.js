/**
 * Plugin Registry - Tier 3 Pillar 4
 * User-level extensions and plugin management
 */
import { log } from '../../utils/logger';
import { track } from '../../services/analytics';
import { toolRegistryV2 } from '../agent/tools/v2';
class PluginRegistry {
    plugins = new Map();
    panels = new Map();
    /**
     * Register a plugin
     */
    register(plugin) {
        if (this.plugins.has(plugin.id)) {
            log.warn(`[PluginRegistry] Plugin ${plugin.id} already registered, skipping`);
            return;
        }
        this.plugins.set(plugin.id, plugin);
        // Register tools if provided
        if (plugin.registerTools && plugin.enabled) {
            try {
                plugin.registerTools(toolRegistryV2);
                log.info(`[PluginRegistry] Registered tools from plugin: ${plugin.id}`);
            }
            catch (error) {
                log.error(`[PluginRegistry] Failed to register tools from ${plugin.id}:`, error);
            }
        }
        // Register panels if provided
        if (plugin.registerPanels && plugin.enabled) {
            try {
                const panels = plugin.registerPanels();
                panels.forEach(panel => {
                    this.panels.set(panel.id, panel);
                });
                log.info(`[PluginRegistry] Registered ${panels.length} panels from plugin: ${plugin.id}`);
            }
            catch (error) {
                log.error(`[PluginRegistry] Failed to register panels from ${plugin.id}:`, error);
            }
        }
        log.info(`[PluginRegistry] Registered plugin: ${plugin.id} v${plugin.version}`);
        track('plugin_registered', { pluginId: plugin.id, version: plugin.version });
    }
    /**
     * Enable a plugin
     */
    async enable(pluginId) {
        const plugin = this.plugins.get(pluginId);
        if (!plugin) {
            log.warn(`[PluginRegistry] Plugin not found: ${pluginId}`);
            return false;
        }
        if (plugin.enabled) {
            return true;
        }
        try {
            plugin.enabled = true;
            // Register tools
            if (plugin.registerTools) {
                plugin.registerTools(toolRegistryV2);
            }
            // Register panels
            if (plugin.registerPanels) {
                const panels = plugin.registerPanels();
                panels.forEach(panel => {
                    this.panels.set(panel.id, panel);
                });
            }
            // Call onEnable hook
            if (plugin.onEnable) {
                await plugin.onEnable();
            }
            this.persistPluginState();
            log.info(`[PluginRegistry] Enabled plugin: ${pluginId}`);
            track('plugin_enabled', { pluginId });
            return true;
        }
        catch (error) {
            log.error(`[PluginRegistry] Failed to enable plugin ${pluginId}:`, error);
            plugin.enabled = false;
            return false;
        }
    }
    /**
     * Disable a plugin
     */
    async disable(pluginId) {
        const plugin = this.plugins.get(pluginId);
        if (!plugin) {
            log.warn(`[PluginRegistry] Plugin not found: ${pluginId}`);
            return false;
        }
        if (!plugin.enabled) {
            return true;
        }
        try {
            // Call onDisable hook
            if (plugin.onDisable) {
                await plugin.onDisable();
            }
            plugin.enabled = false;
            this.persistPluginState();
            log.info(`[PluginRegistry] Disabled plugin: ${pluginId}`);
            track('plugin_disabled', { pluginId });
            return true;
        }
        catch (error) {
            log.error(`[PluginRegistry] Failed to disable plugin ${pluginId}:`, error);
            return false;
        }
    }
    /**
     * Get all plugins
     */
    getAll() {
        return Array.from(this.plugins.values());
    }
    /**
     * Get enabled plugins
     */
    getEnabled() {
        return Array.from(this.plugins.values()).filter(p => p.enabled);
    }
    /**
     * Get plugin by ID
     */
    get(pluginId) {
        return this.plugins.get(pluginId);
    }
    /**
     * Get panels for a mode
     */
    getPanelsForMode(mode) {
        return Array.from(this.panels.values()).filter(panel => !panel.mode || panel.mode === mode);
    }
    /**
     * Get all panels
     */
    getAllPanels() {
        return Array.from(this.panels.values());
    }
    /**
     * Load plugins from local folder
     */
    async loadFromFolder(folderPath) {
        // TODO: Implement file system access (Electron) or fetch from server
        log.info(`[PluginRegistry] Loading plugins from: ${folderPath}`);
    }
    /**
     * Persist plugin state
     */
    persistPluginState() {
        const state = Array.from(this.plugins.values()).map(p => ({
            id: p.id,
            enabled: p.enabled,
        }));
        localStorage.setItem('regen_plugins_state', JSON.stringify(state));
    }
    /**
     * Restore plugin state
     */
    restorePluginState() {
        try {
            const stored = localStorage.getItem('regen_plugins_state');
            if (!stored)
                return;
            const state = JSON.parse(stored);
            state.forEach(({ id, enabled }) => {
                const plugin = this.plugins.get(id);
                if (plugin) {
                    plugin.enabled = enabled;
                }
            });
        }
        catch (error) {
            log.error('[PluginRegistry] Failed to restore plugin state:', error);
        }
    }
}
// Singleton instance
export const pluginRegistry = new PluginRegistry();
