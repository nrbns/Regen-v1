import manifest from './examples/sample-plugin/manifest.json';
export function listPlugins() {
    // Add id if missing
    const manifestWithId = { ...manifest, id: manifest.id || manifest.name };
    return [manifestWithId];
}
