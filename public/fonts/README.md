# Inter Font Files

This directory should contain the Inter font files for local hosting.

## Required Files

1. **Inter-Variable.woff2** - Main variable font file
2. **Inter-Variable-Italic.woff2** - Italic variable font file (optional)

## How to Get the Font Files

### Option 1: Download from GitHub (Recommended)

1. Visit: https://github.com/rsms/inter/releases
2. Download the latest release
3. Extract the ZIP file
4. Copy `Inter-Variable.woff2` and `Inter-Variable-Italic.woff2` from the `fonts/` directory to this `public/fonts/` directory

### Option 2: Use npm package

```bash
npm install @rsms/inter
```

Then copy the font files from `node_modules/@rsms/inter/fonts/` to `public/fonts/`

### Option 3: Download directly

```bash
# Windows PowerShell
Invoke-WebRequest -Uri "https://github.com/rsms/inter/raw/master/docs/font-files/Inter-Variable.woff2" -OutFile "public/fonts/Inter-Variable.woff2"
Invoke-WebRequest -Uri "https://github.com/rsms/inter/raw/master/docs/font-files/Inter-Variable-Italic.woff2" -OutFile "public/fonts/Inter-Variable-Italic.woff2"
```

## Fallback

If the local font files are not available, the app will automatically fall back to loading from `https://rsms.me/inter/inter.css`.
