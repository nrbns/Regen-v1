import type { NexusPluginEntry } from '../types/extensionNexus';
interface ExtensionNexusState {
    loading: boolean;
    error: string | null;
    plugins: NexusPluginEntry[];
    peers: string[];
    lastSyncedAt: number | null;
    fetch: () => Promise<void>;
    publish: (metadata: {
        pluginId: string;
        name: string;
        version: string;
        description: string;
        author: string;
        sourcePeer: string;
        carbonScore?: number;
        tags?: string[];
    }) => Promise<void>;
    toggleTrust: (pluginId: string, trusted: boolean) => Promise<void>;
}
export declare const useExtensionNexusStore: import("zustand").UseBoundStore<import("zustand").StoreApi<ExtensionNexusState>>;
export {};
