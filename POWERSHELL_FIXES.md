# PowerShell/Windows Fixes Applied

## Date: November 30, 2025

## Issues Fixed

### 1. Missing TypeScript Compiler (`tsc`)
- **Error**: `'tsc' is not recognized as an internal or external command`
- **Root Cause**: TypeScript was in devDependencies but not installed
- **Fix**: 
  - Ran `npm install --legacy-peer-deps` to install all dependencies
  - Updated `build:types` script to use `npx tsc -b` explicitly

### 2. Missing `cross-env` Package
- **Error**: `'cross-env' is not recognized as an internal or external command`
- **Root Cause**: `cross-env` was in devDependencies but not installed
- **Fix**:
  - Installed via `npm install --legacy-peer-deps`
  - Updated all scripts using `cross-env` to use `npx cross-env`:
    - `dev:web`: Now uses `npx cross-env`
    - `build`: Now uses `npx cross-env`
    - `dev:fast`: Now uses `npx cross-env`

### 3. Dependency Conflicts
- **Error**: `ERESOLVE unable to resolve dependency tree` (Storybook vs Vite version conflict)
- **Fix**: Used `--legacy-peer-deps` flag to install dependencies despite peer dependency conflicts

## Updated Scripts

All scripts now use `npx` to ensure they work even if binaries aren't in PATH:

```json
{
  "dev:web": "npx cross-env JSDOM_NO_CANVAS=1 vite --mode development",
  "build": "npx cross-env JSDOM_NO_CANVAS=1 vite build",
  "build:types": "npx tsc -b",
  "dev:fast": "npx cross-env JSDOM_NO_CANVAS=1 OB_DISABLE_HEAVY_SERVICES=1 vite --mode development"
}
```

## How to Run the Project

### Option 1: Run Tauri App Directly (Recommended)
```powershell
cd tauri-migration
npm run tauri:dev
```

### Option 2: Run Full Dev Environment
```powershell
# From root directory
npm run dev
```

This will start:
- Frontend dev server (Vite on port 5173)
- Backend server (redix-server.js)
- Tauri app

### Option 3: Run Individual Services
```powershell
# Terminal 1: Backend server
cd server
node redix-server.js

# Terminal 2: Frontend
cd tauri-migration
npm run dev

# Terminal 3: Tauri app
cd tauri-migration
npm run tauri:dev
```

## Verification

After installation, verify tools are available:

```powershell
# Check TypeScript
npx tsc --version
# Should output: Version 5.9.3 (or similar)

# Check if cross-env works (no version flag, but should not error)
npx cross-env echo "test"
```

## Notes

- All dependencies are now installed (1522 packages)
- No vulnerabilities found
- Scripts use `npx` for cross-platform compatibility
- Tauri app is ready to run from `tauri-migration/` directory

## Status: ✅ FIXED

All PowerShell/Windows issues have been resolved. The project should now run successfully.

