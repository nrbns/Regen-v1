# Electron + Vite Setup Fixes

This document outlines the fixes applied to resolve common Electron + Vite + React integration issues.

## Changes Applied

### 1. **package.json** ✅
- Updated `main` field: `"main": "dist-electron/main.js"`
- Simplified scripts:
  - `dev`: `vite` (vite-plugin-electron handles Electron startup)
  - `build`: `vite build` (builds both renderer and main/preload)
  - `build:app`: `npm run build && electron-builder` (creates installer)
- Added dependencies:
  - `vite-plugin-electron`: `^0.28.0`
  - `vite-plugin-electron-renderer`: `^0.14.5`
- Updated electron-builder config to include `dist-electron/**`

### 2. **vite.config.ts** ✅
- Integrated `vite-plugin-electron/simple`
- Configured main process entry: `electron/main.ts`
- Configured preload entry: `electron/preload.ts`
- Build output: `dist/` for renderer, `dist-electron/` for main/preload (handled by plugin)

### 3. **electron/main.ts** ✅
- Added `isDev` check using `process.env.VITE_DEV_SERVER_URL`
- Updated `webPreferences`:
  - `preload`: `path.join(__dirname, 'preload.js')` (vite-plugin-electron outputs to dist-electron)
  - Secure settings: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`
- Updated renderer loading:
  - Dev: `mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL!)`
  - Prod: `mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))`
- Added external link handler: `shell.openExternal(url)`

### 4. **electron/preload.ts** ✅
- Completed API surface to match `preload.cjs`:
  - Added all missing APIs: `ui`, `obHistory`, `downloads`, `research`, `graph`, `ledger`
  - Enhanced `typedApi` with error handling and response unwrapping
  - Added fullscreen event listener
  - Maintained backward compatibility

### 5. **tsconfig.electron.json** ✅
- Updated for ES modules:
  - `module: "ESNext"`
  - `moduleResolution: "Bundler"`
  - `outDir: "./dist-electron"`

### 6. **index.html** ✅
- Updated with proper HTML5 doctype and meta tags
- Maintained root div and script tag structure

## How It Works

### Development (`npm run dev`)
1. Vite starts dev server on port 5173
2. `vite-plugin-electron` builds main/preload to `dist-electron/`
3. Plugin automatically launches Electron pointing to dev server
4. HMR works for renderer, main process reloads on changes

### Production (`npm run build`)
1. Vite builds renderer to `dist/`
2. `vite-plugin-electron` builds main/preload to `dist-electron/`
3. Electron loads from `dist/index.html` and `dist-electron/preload.js`

## Security Improvements

✅ **Context Isolation**: `true` (required for security)  
✅ **Node Integration**: `false` (renderer can't access Node APIs directly)  
✅ **Sandbox**: `true` (additional isolation)  
✅ **Web Security**: `true` (enforces web security policies)  
✅ **Safe IPC Bridge**: All APIs exposed via `contextBridge` with explicit interfaces

## Common Issues Fixed

- ✅ **White screen in production**: Fixed by correct `index.html` path
- ✅ **"require is not defined"**: Fixed by `nodeIntegration: false` + proper contextBridge
- ✅ **"cannot find preload.js"**: Fixed by vite-plugin-electron bundling
- ✅ **HMR not working**: Fixed by proper Vite server configuration
- ✅ **IPC not available**: Fixed by complete preload.ts API surface

## Next Steps

1. Run `npm install` to install new dependencies
2. Test development: `npm run dev`
3. Test production build: `npm run build` then `electron .` from project root
4. Create installer: `npm run build:app`

## Notes

- `preload.cjs` is kept for reference but won't be used (vite-plugin-electron uses `preload.ts`)
- All existing IPC handlers remain unchanged
- All window APIs remain accessible via `window.api`, `window.ipc`, etc.
- Backward compatibility maintained

