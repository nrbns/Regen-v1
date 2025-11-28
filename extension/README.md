# RegenBrowser Chrome Extension

Chrome extension that brings WISPR AI agent to any website.

## Installation

### From Source

1. Open Chrome → Extensions (`chrome://extensions/`)
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the `extension/` folder
5. Done! Press `Ctrl+Space` on any page

### From Chrome Web Store

Coming soon! Extension will be published for one-click install.

## Features

- **WISPR Voice Agent**: Press `Ctrl+Space` on any page
- **Ollama Integration**: Connects to local Ollama instance
- **Voice Commands**: Hindi/English support
- **Floating Orb**: Always accessible AI assistant

## Requirements

- Chrome/Edge 90+
- Ollama installed locally (optional - extension works without it)
- Models: phi3:mini, llava:7b (auto-downloaded by desktop app)

## Usage

1. Install Ollama from [ollama.com](https://ollama.com)
2. Pull models: `ollama pull phi3:mini`
3. Load extension in Chrome
4. Press `Ctrl+Space` on any page
5. Say: "Search Tesla" or "Research AI trends"

## Development

```bash
# Build extension
cd extension
npm install
npm run build

# Load in Chrome
# chrome://extensions → Load unpacked → Select extension/
```

## Permissions

- `activeTab`: To interact with current page
- `storage`: To save settings
- `scripting`: To inject WISPR orb
- `<all_urls>`: To work on any website

## Privacy

- All AI processing happens locally (Ollama)
- No data sent to external servers
- Voice recognition uses browser's built-in API
- Settings stored locally only
