# Redix Universal Browser

Ultra-lightweight browser for universal device compatibility.

## Features

- **< 12KB bundle size** (gzipped)
- **Works on any device** (iPhone 5s, Android 4.4, Raspberry Pi, etc.)
- **DOM pooling** for memory efficiency
- **WASM AI** for offline content processing
- **Device capability detection** for adaptive features
- **AI-rendered content** (no iframes)

## Development

```bash
# Start Redix dev server
npm run dev:redix-universal

# Build Redix universal bundle
npm run build:redix
```

## Usage

```javascript
// Initialize Redix Browser
const browser = window.Redix.init();

// Navigate to a URL
await browser.navigate('https://example.com', document.getElementById('content'));

// Get device capabilities
const caps = browser.getCapabilities();
console.log('WASM support:', caps.hasWASM);
console.log('RAM estimate:', caps.ramEstimate, 'GB');
console.log('Is low-end:', caps.isLowEnd);

// Get pool statistics
const stats = browser.getPoolStats();
console.log('Tabs reused:', stats.tabsReused);
```

## Architecture

- **RedixPool**: DOM element pooling for memory efficiency
- **DeviceDetector**: Capability detection for adaptive features
- **RedixContentRenderer**: AI-rendered content (no iframes)
- **RedixAI**: WASM/cloud AI processing with fallback chain

## Build Output

After building, `dist-redix/` contains:
- `index.html` - Entry point
- `redix.js` - Main bundle (< 12KB target)
- `redix.css` - Styles (uses design tokens)

## Universal Compatibility

- **ES2015 target** (works on 99% of devices)
- **No dependencies** (vanilla JS only)
- **Progressive enhancement** (works without JS, degrades gracefully)
- **Service Worker** (offline support, WASM caching)

