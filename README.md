# Regen Browser

A real-time, local-first browser with optional AI assistance.

Regen is a **desktop browser** built with a **real-time architecture** where the backend owns all state and logic, and the UI is a pure reflection layer. AI assistance is optional and never interrupts your browsing.

**This is v1 (Early Access)** - a fully functional browser with real-time IPC, tab management, navigation, downloads, and AI integration.

---

## Architecture Overview

Regen uses a **clean separation** between UI and backend:

```
Frontend (React + TypeScript)
    ↕ IPC (Tauri)
Backend (Rust + Node.js)
    ├── TabManager (WebView lifecycle)
    ├── NavigationController (URL handling)
    ├── DownloadManager (File downloads)
    └── AIController (Optional AI service)
```

**Key Principle:** UI never controls logic. UI only sends events and displays state.

---

## Quick Start

### Prerequisites
- Node.js 18+
- Rust 1.70+ (for Tauri desktop app)
- Ollama (optional, for local AI)

### Installation

```bash
git clone https://github.com/nrbns/Regen-v1.git
cd Regen-v1
npm install
```

### Development

```bash
# Start the backend server (handles all logic)
npm run dev:backend

# Start the UI (in another terminal)
npm run dev:web

# Start the desktop app (in another terminal)
npm run dev:tauri
```

### Setup Local AI (Optional)

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull models
ollama pull phi3:mini
ollama pull llava:7b
```

---

## Core Features

### Real Browser
- ✅ **Multi-tab browsing** - Each tab is a real WebView instance
- ✅ **Navigation** - Back, forward, reload via IPC
- ✅ **Downloads** - Save files to local Downloads folder
- ✅ **Session persistence** - Tabs restore on restart

### Optional AI
- ✅ **Local-first** - Runs on your machine via Ollama
- ✅ **Contextual triggers** - Text selection or right-click
- ✅ **Intent routing** - Smart detection of questions vs URLs
- ✅ **Failure isolation** - Browser works even if AI fails

### Real-time Architecture
- ✅ **IPC communication** - UI ↔ Backend via Tauri
- ✅ **State ownership** - Backend manages all state
- ✅ **Event-driven** - No polling, instant updates
- ✅ **Error handling** - Graceful degradation

---

## How It Works

### 1. Tab Management
```typescript
// UI sends event
IPCHandler.newTab("https://example.com");

// Backend creates WebView, updates state
// UI automatically reflects new state
```

### 2. Navigation
```typescript
// UI sends event
IPCHandler.navigate(tabId, "https://google.com");

// Backend calls WebView.navigate()
// Backend updates state with new URL
// UI shows updated address bar
```

### 3. AI Integration
```typescript
// User selects text, clicks "Ask Regen"
// UI sends event
IPCHandler.runAI("Analyze this text: ...");

// Backend routes via IntentRouter
// Calls Ollama for local AI processing
// Returns result to UI
```

### 4. Downloads
```typescript
// User clicks download link
// Backend handles via DownloadManager
// Saves to ~/Downloads/Regen/
// Shows toast notification
```

---

## Development Architecture

### Backend Structure
```
backend/
├── state/SystemState.ts    # Single source of truth
├── browser/
│   ├── TabManager.ts       # WebView lifecycle
│   ├── NavigationController.ts # URL handling
│   └── DownloadManager.ts  # File downloads
├── ai/
│   ├── AIController.ts     # Ollama integration
│   └── IntentRouter.ts     # Smart routing
└── ipc/events.ts          # IPC definitions
```

### IPC Events
```typescript
// Navigation
NAVIGATE, BACK, FORWARD, RELOAD

// Tabs
NEW_TAB, CLOSE_TAB, SWITCH_TAB

// AI
RUN_AI

// Downloads
DOWNLOAD
```

### UI Components
- **Dumb UI Pattern** - Components only display state and send events
- **Real-time updates** - Subscribe to backend state changes
- **No direct logic** - All business logic in backend

---

## Testing & Validation

### Run Tests
```bash
npm run test:all
```

### Manual Testing Checklist
- [ ] Create 10+ tabs without crash
- [ ] Navigation works (back/forward/reload)
- [ ] Downloads save to correct folder
- [ ] AI responds to text selection
- [ ] Right-click menu works
- [ ] Session restores on restart
- [ ] Browser works when AI is unavailable

---

## Philosophy

> **"A browser should feel boring when it works — and invisible when it helps."**

Regen is built for **reliability first**. The real-time architecture ensures:
- No UI freezes
- No state inconsistencies
- No fake loading indicators
- No surprise behaviors

AI is a **helpful assistant**, not an intrusive companion.

---

## Status & Roadmap

**Current:** v1 (Early Access) - Real browser with real-time architecture
**Stability:** All core systems implemented and tested
**AI Integration:** Working with Ollama, optional and isolated

### Future (v2+)
- Resource governance (Redix)
- Advanced AI lifecycle management
- Self-healing capabilities
- Enhanced offline modes

**No feature shipped before it's real.**

---

## License

MIT - Built with care, built for users, built to last.

---

**Regen turns the browser into a real-time system where intelligence lives in the backend, not the UI.**

---

## Quick Start

```bash
# Clone and install
git clone https://github.com/nrbns/Regenbrowser.git
cd Regenbrowser
npm install

# Start development server
npm run dev:web
```

Visit `http://localhost:5181` to use Regen.

---

## System Requirements

**Minimum**
- OS: Windows 10+, Linux, macOS
- RAM: 4GB
- CPU: Dual-core

**Recommended**
- RAM: 8GB+
- CPU: Quad-core
