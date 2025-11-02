import manifest from './examples/sample-plugin/manifest.json';

export type PluginManifest = {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  permissions?: string[];
  entry?: string;
  ui?: { panel?: string };
  settings?: Record<string, unknown>;
  sidePanel?: string;
  toolbarButtons?: { id: string; label: string }[];
};

export function listPlugins(): PluginManifest[] {
  // Add id if missing
  const manifestWithId = { ...manifest, id: manifest.id || manifest.name } as PluginManifest;
  return [manifestWithId];
}


