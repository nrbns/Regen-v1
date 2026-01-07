# ReGen Extensions

This directory hosts the future ReGen browser extension platform. For Sprint 1 we ship a skeleton so the Electron preload and renderer can reference upcoming APIs without crashing.

## Layout

```
extensions/
├─ README.md              // this file
├─ manifest.schema.json   // JSON schema for future extension manifests
├─ examples/              // stub extension projects (coming soon)
```

## Why now?

- DX teams can start planning integrations without full runtime support.
- Renderer exposes a `window.regenExtensions` bridge so future extension bundles can register capabilities.
- Electron main/preload layers can whitelist future IPC entrypoints guarded by feature flags.

## Next Steps

1. Finalize the manifest schema (permissions, entrypoints, assets).
2. Implement a loader that scans `extensions/` on startup, validates against the schema, and hot reloads in dev mode.
3. Provide a CLI (`npm run extensions:new`) that scaffolds an extension boilerplate.

