# Setup Guide - RegenBrowser

Complete setup guide for RegenBrowser development and production deployment.

## Prerequisites

### Required
- **Node.js** 20.x or higher
- **Rust** 1.70+ (for Tauri backend)
- **npm** or **yarn**

### Optional (for full features)
- **Ollama** - For offline AI (download from [ollama.com](https://ollama.com))
- **MeiliSearch** - For local search indexing
- **Python 3.9+** - For API server (optional)

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/nrbns/Omnibrowser.git
cd Omnibrowser
npm install
```

### 2. Development Setup

```bash
# Start development server (frontend + backend)
npm run dev

# Or start Tauri app directly
npm run dev:tauri
```

### 3. Build for Production

```bash
# Build frontend
npm run build

# Build Tauri app for your platform
npm run build:app

# Build Windows installer
npm run build:windows:installer

# Build macOS DMG
cd tauri-migration && npm run tauri build -- --bundles dmg

# Build Linux AppImage
cd tauri-migration && npm run tauri build -- --bundles appimage
```

## Environment Variables

Create a `.env` file in the root directory:

```env
# Sentry (optional - for crash reporting)
VITE_SENTRY_DSN=your-sentry-dsn-here

# API Keys (optional)
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
BING_API_KEY=your-bing-key

# TradingView (optional - for trade mode)
TRADINGVIEW_API_BASE_URL=https://your-api-url
TRADINGVIEW_ACCESS_TOKEN=your-token
TRADINGVIEW_ACCOUNT_ID=your-account-id
```

## Platform-Specific Setup

### Windows

1. Install Visual Studio Build Tools (for Rust compilation)
2. Install Rust: `winget install Rustlang.Rustup`
3. Run `npm run dev:tauri`

### macOS

1. Install Xcode Command Line Tools: `xcode-select --install`
2. Install Rust: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
3. Run `npm run dev:tauri`

### Linux

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y libwebkit2gtk-4.0-dev libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Run
npm run dev:tauri
```

## Features Setup

### Offline AI (Ollama)

1. Download Ollama from [ollama.com](https://ollama.com/download)
2. Install and start Ollama
3. Pull required models:
   ```bash
   ollama pull llama3.2:3b
   ollama pull phi3:mini
   ollama pull llava:7b
   ```

### Search Services

Search is automatically initialized on app startup. The app uses:
- DuckDuckGo (default, no API key needed)
- Bing (if API key provided)
- Local MeiliSearch (if running)

### Voice Recognition (Whisper)

Voice recognition uses the browser's built-in Speech Recognition API:
- **Chrome/Edge**: Full support
- **Firefox**: Limited support
- **Safari**: Limited support

For offline Whisper, configure OpenAI API key in `.env`.

## Troubleshooting

### WebView Issues

If WebView is not stable:
1. Check browser console for errors
2. Verify CSP settings in `tauri.conf.json`
3. Clear app cache and restart

### Agents Not Connecting

1. Check WebSocket server is running (port 18080)
2. Verify backend is ready: Check console for "backend-ready" event
3. Check firewall settings

### Search Not Working

1. Verify internet connection
2. Check API keys if using Bing
3. Verify MeiliSearch is running (if using local search)

### Build Failures

1. Ensure Rust is installed: `rustc --version`
2. Check Tauri CLI: `cd tauri-migration && npm list @tauri-apps/cli`
3. Clear build cache: `cd tauri-migration && npm run tauri clean`

## Development Tips

- Use `npm run dev:fast` for faster development (disables heavy services)
- Check `PRIORITY_FIXES.md` for known issues and fixes
- Use `npm run lint` before committing
- Run `npm run test:unit` for unit tests

## Production Deployment

See `.github/workflows/build.yml` for automated build pipeline.

For manual deployment:
1. Build for target platform
2. Sign binaries (macOS/Windows)
3. Create installer/package
4. Test on clean system
5. Upload to release

## Support

- GitHub Issues: [github.com/nrbns/Omnibrowser/issues](https://github.com/nrbns/Omnibrowser/issues)
- Documentation: See `docs/` folder
- API Docs: See `docs/API_CONFIG.md`

