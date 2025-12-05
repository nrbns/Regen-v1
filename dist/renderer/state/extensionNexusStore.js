import { create } from 'zustand';
import { ipc } from '../lib/ipc-typed';
export const useExtensionNexusStore = create((set, get) => ({
    loading: false,
    error: null,
    plugins: [],
    peers: [],
    lastSyncedAt: null,
    fetch: async () => {
        try {
            set({ loading: true, error: null });
            const response = await ipc.extensionNexus.list();
            set({
                plugins: response.plugins,
                peers: response.peers,
                lastSyncedAt: Date.now(),
                loading: false,
            });
        }
        catch (error) {
            set({ loading: false, error: error instanceof Error ? error.message : String(error) });
        }
    },
    publish: async (metadata) => {
        try {
            set({ loading: true, error: null });
            await ipc.extensionNexus.publish(metadata);
            await get().fetch();
        }
        catch (error) {
            set({ loading: false, error: error instanceof Error ? error.message : String(error) });
        }
    },
    toggleTrust: async (pluginId, trusted) => {
        try {
            await ipc.extensionNexus.trust(pluginId, trusted);
            const plugins = get().plugins.map((plugin) => plugin.pluginId === pluginId ? { ...plugin, trusted } : plugin);
            set({ plugins });
        }
        catch (error) {
            set({ error: error instanceof Error ? error.message : String(error) });
        }
    },
}));
