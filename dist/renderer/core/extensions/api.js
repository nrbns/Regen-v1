/**
 * Extensions API
 * Provides window.regenExtensions for Chrome-compatible extension registration
 * Preload hook for Chrome compatibility
 */
import { log } from '../../utils/logger';
import { pluginRegistry } from '../plugins/registry';
class ExtensionsAPI {
    extensions = new Map();
    /**
     * Register an extension
     */
    register(extension) {
        if (this.extensions.has(extension.id)) {
            log.warn(`[ExtensionsAPI] Extension ${extension.id} already registered`);
            return;
        }
        this.extensions.set(extension.id, extension);
        // Convert to plugin format and register with plugin registry
        const plugin = {
            id: extension.id,
            name: extension.name || extension.id,
            version: extension.version || '1.0.0',
            description: `Extension: ${extension.name || extension.id}`,
            enabled: true,
            onEnable: extension.activate,
            onDisable: extension.deactivate,
        };
        pluginRegistry.register(plugin);
        log.info(`[ExtensionsAPI] Registered extension: ${extension.id}`);
    }
    /**
     * List all registered extensions
     */
    list() {
        return Array.from(this.extensions.values()).map(ext => ({
            id: ext.id,
            name: ext.name,
            version: ext.version,
        }));
    }
    /**
     * Get extension by ID
     */
    get(id) {
        return this.extensions.get(id);
    }
    /**
     * Activate an extension
     */
    async activate(id) {
        const extension = this.extensions.get(id);
        if (!extension) {
            return false;
        }
        if (extension.activate) {
            try {
                await extension.activate();
                log.info(`[ExtensionsAPI] Activated extension: ${id}`);
                return true;
            }
            catch (error) {
                log.error(`[ExtensionsAPI] Failed to activate extension ${id}:`, error);
                return false;
            }
        }
        return true;
    }
    /**
     * Deactivate an extension
     */
    async deactivate(id) {
        const extension = this.extensions.get(id);
        if (!extension) {
            return false;
        }
        if (extension.deactivate) {
            try {
                await extension.deactivate();
                log.info(`[ExtensionsAPI] Deactivated extension: ${id}`);
                return true;
            }
            catch (error) {
                log.error(`[ExtensionsAPI] Failed to deactivate extension ${id}:`, error);
                return false;
            }
        }
        return true;
    }
}
// Singleton instance
const extensionsAPI = new ExtensionsAPI();
/**
 * Initialize Extensions API on window object
 * Provides Chrome-compatible extension registration
 */
export function initExtensionsAPI() {
    if (typeof window === 'undefined') {
        return;
    }
    // Initialize window.regenExtensions if not already present
    if (!window.regenExtensions) {
        window.regenExtensions = {
            register: (extension) => {
                extensionsAPI.register(extension);
            },
            list: () => {
                return extensionsAPI.list();
            },
        };
    }
    // Preload hook for Chrome compatibility
    // This allows extensions to register before the app fully loads
    if (typeof window.__regenExtensionsPreload === 'function') {
        try {
            window.__regenExtensionsPreload(window.regenExtensions);
        }
        catch (error) {
            log.warn('[ExtensionsAPI] Preload hook failed:', error);
        }
    }
    log.info('[ExtensionsAPI] Initialized window.regenExtensions');
}
/**
 * Preload hook for Chrome compatibility
 * Allows extensions to register early
 */
export function setupPreloadHook() {
    if (typeof window === 'undefined') {
        return;
    }
    // Create preload function that extensions can call
    window.__regenExtensionsPreload = (_api) => {
        log.info('[ExtensionsAPI] Preload hook called');
        // Extensions can use this to register before app initialization
    };
}
