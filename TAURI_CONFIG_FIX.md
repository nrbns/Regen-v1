# Tauri Configuration Fixes

## Date: November 30, 2025

## Issues Fixed

### 1. Invalid `webSecurity` Property in Tauri 2.0
- **Error**: `Additional properties are not allowed ('webSecurity' was unexpected)`
- **Root Cause**: Tauri 2.0 removed the `webSecurity` property from window configuration
- **Fix**: Removed `webSecurity: false` from window config. Security is now controlled via `security.csp: null` which disables CSP (allowing all websites)

### 2. Missing `tsconfig.electron.json` Reference
- **Error**: `TSConfckParseError: parsing C:/Users/Nrb/Omnibrowser/tsconfig.electron.json failed: Error: ENOENT: no such file or directory`
- **Root Cause**: `tsconfig.json` still referenced the disabled Electron config file
- **Fix**: Removed reference to `tsconfig.electron.json` from `tsconfig.json` references array

## Changes Made

### `tauri-migration/src-tauri/tauri.conf.json`
```json
// BEFORE (Invalid)
"windows": [
  {
    "title": "RegenBrowser",
    ...
    "webSecurity": false  // ❌ Not valid in Tauri 2.0
  }
]

// AFTER (Valid)
"windows": [
  {
    "title": "RegenBrowser",
    ...
    // webSecurity removed - controlled via security.csp instead
  }
],
"security": {
  "csp": null  // ✅ This disables CSP (allows all websites)
}
```

### `tsconfig.json`
```json
// BEFORE
{
  "references": [
    { "path": "./tsconfig.renderer.json" },
    { "path": "./tsconfig.electron.json" }  // ❌ File doesn't exist
  ]
}

// AFTER
{
  "references": [
    { "path": "./tsconfig.renderer.json" }  // ✅ Only valid reference
  ]
}
```

## How Web Security Works in Tauri 2.0

In Tauri 2.0, web security is controlled via:
- **CSP (Content Security Policy)**: Set `security.csp: null` to disable CSP and allow all websites
- **Window configuration**: No `webSecurity` property exists

The current configuration (`csp: null`) achieves the same result as `webSecurity: false` would have - it allows all websites to load without CSP restrictions.

## Status: ✅ FIXED

Both configuration errors have been resolved. The Tauri app should now start successfully.

