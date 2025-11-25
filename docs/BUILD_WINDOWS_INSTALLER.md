# Building Windows Installer for RegenBrowser

This guide explains how to build a Windows MSI installer for RegenBrowser.

## Prerequisites

1. **Node.js 20+** - [Download](https://nodejs.org/)
2. **Rust** - [Install Rust](https://www.rust-lang.org/tools/install)
   ```bash
   # Install Rust (if not already installed)
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```
3. **Microsoft Visual C++ Build Tools** (Windows only)
   - Download from [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022)
   - Install "Desktop development with C++" workload

4. **WiX Toolset** (for MSI installer generation)
   - Download from [WiX Toolset](https://wixtoolset.org/releases/)
   - Or install via Chocolatey: `choco install wix`

## Quick Build

```bash
# One command to build Windows installer
npm run build:windows:installer
```

This will:

1. Build the frontend (React + Vite) → `dist/`
2. Build the Tauri app → `tauri-migration/src-tauri/target/release/`
3. Generate MSI installer → `tauri-migration/src-tauri/target/release/bundle/msi/`

## Build Steps

### Step 1: Build Frontend

```bash
npm run build
```

This compiles the React app and outputs to `dist/`.

### Step 2: Build Tauri App

```bash
cd tauri-migration
npm run tauri:build
```

This will:

- Compile the Rust backend
- Bundle the frontend with Tauri
- Generate platform-specific installers

**First build may take 10-15 minutes** (Rust compilation). Subsequent builds are faster (~2-3 minutes).

## Output Location

After a successful build, the installer will be at:

```
tauri-migration/src-tauri/target/release/bundle/msi/Regen_0.1.0-alpha_x64_en-US.msi
```

The file size should be approximately **20-30 MB** (depending on included assets).

## Troubleshooting

### Error: "cargo not found"

Install Rust:

```bash
# Windows (PowerShell)
Invoke-WebRequest https://win.rustup.rs/x86_64 -OutFile rustup-init.exe
.\rustup-init.exe
```

### Error: "link.exe not found"

Install Visual Studio Build Tools:

- Download from [Microsoft](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022)
- Install "Desktop development with C++" workload

### Error: "WiX not found"

Install WiX Toolset:

```bash
# Using Chocolatey
choco install wix

# Or download from https://wixtoolset.org/releases/
```

### Build fails with "out of memory"

Increase Node.js memory limit:

```bash
$env:NODE_OPTIONS="--max-old-space-size=4096"
npm run build:windows:installer
```

### Build is slow

- First build: 10-15 minutes (Rust compilation)
- Subsequent builds: 2-3 minutes (incremental compilation)
- Use `cargo build --release` for faster development builds (no installer)

## Customization

### Change Installer Name

Edit `tauri-migration/src-tauri/tauri.conf.json`:

```json
{
  "productName": "Regen",
  "version": "0.1.0-alpha"
}
```

### Change Installer Icon

Replace `tauri-migration/src-tauri/icons/icon.ico` with your icon.

### Change Installer Description

Edit `tauri-migration/src-tauri/tauri.conf.json`:

```json
{
  "bundle": {
    "shortDescription": "RegenBrowser - Multilingual AI Browser",
    "longDescription": "Your custom description here..."
  }
}
```

## Distribution

The generated MSI installer can be:

1. **Distributed directly** - Users can double-click to install
2. **Signed** (optional) - For trusted distribution, sign with a code signing certificate
3. **Uploaded** - To GitHub Releases, website, or app stores

## Code Signing (Optional)

To sign the installer for trusted distribution:

1. Obtain a code signing certificate (e.g., from DigiCert, Sectigo)
2. Add to `tauri.conf.json`:

```json
{
  "bundle": {
    "windows": {
      "certificateThumbprint": "YOUR_CERT_THUMBPRINT"
    }
  }
}
```

## Next Steps

- [Production Readiness Plan](../docs/PRODUCTION_READINESS_PLAN.md)
- [Beta Release Checklist](../docs/BETA_RELEASE_CHECKLIST.md)
