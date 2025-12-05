export type PluginManifest = {
    id: string;
    name: string;
    version: string;
    description?: string;
    author?: string;
    permissions?: string[];
    entry?: string;
    ui?: {
        panel?: string;
    };
    settings?: Record<string, unknown>;
    sidePanel?: string;
    toolbarButtons?: {
        id: string;
        label: string;
    }[];
};
export declare function listPlugins(): PluginManifest[];
