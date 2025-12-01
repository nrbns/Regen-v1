# RegenBrowser - The #1 AI Browser in the World 🇮🇳

**Tauri-Powered AI Browser with WISPR (Voice + Vision + Action)**

> **⚠️ IMPORTANT: This project uses Tauri as the runtime. Electron configs are disabled.**

One-click install → AI auto-sets (60s) → Offline forever.

## Quick Start

1. **Download**: Get `.exe` (Windows) or `.AppImage` (Linux) from [Releases](https://github.com/nrbns/Regenbrowser/releases)
2. **Install Ollama** (one-time): Download from [ollama.com](https://ollama.com/download)
3. **Run**: Open RegenBrowser → AI brain auto-sets up in 60 seconds
4. **Use**: Press `Ctrl+Space` for WISPR → Say "Hey WISPR, research BTC" → Magic happens

## Features

- ✅ **Offline AI** - Works 100% offline with Ollama (phi3:mini, llava:7b)
- ✅ **Hugging Face Integration** - Use Hugging Face Inference API as LLM provider
- ✅ **WISPR Jarvis** - Voice + Vision + Action ("Hey WISPR" wakes it up)
- ✅ **Auto Grammar** - Real-time correction in any input field (Gmail, WhatsApp, etc.)
- ✅ **Trade Mode** - Auto-signals with LLM analysis
- ✅ **OS-Level Hotkeys** - `Ctrl+Shift+Space` wakes from anywhere
- ✅ **4GB RAM Compatible** - Auto-unloads tabs, memory capped at 3GB

## 🚀 Developer Quick Start (6 Steps)

### Step 1: Prerequisites

```bash
# Install Node.js 20+ and Rust
node --version  # Should be 20+
rustc --version  # Should be 1.70+

# Install Tauri CLI globally
cargo install tauri-cli
```

### Step 2: Clone & Install

```bash
git clone https://github.com/nrbns/Omnibrowser.git
cd Omnibrowser
npm install
cd tauri-migration && npm install && cd ..
```

### Step 3: Environment Setup (Optional)

```bash
# Copy example env (for online AI features)
cp example.env .env
# Edit .env to add API keys (or skip for offline mode)
```

### Step 4: Start Development

```bash
# Option A: Start all services at once (recommended)
npm run dev

# Option B: Start components separately
npm run dev:mock-llm  # Terminal 1: Mock LLM server (port 4001)
npm run dev:web       # Terminal 2: Vite dev server (port 5173)
npm run dev:tauri     # Terminal 3: Tauri app
```

### Step 5: Verify Services

```bash
# Check all services are running
npm run test:runtime

# Should show:
# ✅ Vite Dev Server (port 5173)
# ✅ Mock LLM Server (port 4001)
# ✅ Redix Server (port 4000)
```

### Step 6: Build & Test

```bash
# Type check
npm run build:types

# Lint
npm run lint

# Build production
npm run build
npm run build:app  # Tauri build
```

**That's it!** Open `http://localhost:5173` to see the app.

---

## Build from Source

### Quick Start (Development Mode with Mock LLM)

```bash
# Prerequisites
npm install
cargo install tauri-cli

# Development mode (uses mock LLM - no Ollama needed)
npm run dev:mock

# Or start components separately
DEV=true node server/mock-llm.js  # Mock LLM server on port 4001
cd tauri-migration && npm run tauri dev  # Tauri app
```

### Production Build (Requires Ollama)

```bash
# Install Ollama (required for production)
# Windows: Download from ollama.com
# Linux: curl -fsSL https://ollama.com/install.sh | sh
# macOS: brew install ollama

# Configure LLM Provider (Optional)
# Set in .env file:
# LLM_PROVIDER=ollama  # Default: uses local Ollama
# LLM_PROVIDER=huggingface  # Use Hugging Face Inference API
# HUGGINGFACE_API_KEY=your_token_here
# HUGGINGFACE_MODEL=meta-llama/Llama-2-7b-chat-hf

# Pull models (one-time)
ollama pull phi3:mini
ollama pull llava:7b

# Build
npm run build
cd tauri-migration && npm run tauri build
```

### Tauri-Only Runtime

This project **only supports Tauri**. Electron configs have been disabled.

- All development should target `tauri-migration/`
- Build commands use Tauri CLI
- See `tauri-migration/src-tauri/tauri.conf.json` for configuration

## Troubleshooting

**Windows CORS Error?** → Fixed in v1.3.0. If still occurs, set `OLLAMA_ORIGINS=tauri://localhost,http://localhost:*` manually.

**Memory Issues?** → Vision mode auto-disables if <2GB available. Use text-only mode.

**Ollama Not Found?** → Install from [ollama.com](https://ollama.com/download), then restart RegenBrowser.

# RegenBrowser - The Offline AI Browser

> **India's first fully offline AI browser: voice commands, trading, research — all without internet.**

RegenBrowser combines **5 pillars** that no browser has together:

- 🚀 **Chrome-level browsing** - Fast, stable, familiar
- 🤖 **WISPR AI Agent** - Voice commands in Hindi/English (Ctrl+Space)
- 🔍 **Perplexity research** - Inside the browser, fully offline
- 🛡️ **Brave privacy** - India-first, no US tracking
- 🇮🇳 **Made in India** - 12 languages, voice trading, government automation

**This is not a browser. This is the Internet Operating System.**

## 🎯 One-Click Installation

### Windows

1. Download `RegenBrowser-Setup.exe` from [Releases](https://github.com/nrbns/Regenbrowser/releases)
2. Double-click → Installer auto-downloads Ollama + AI models
3. First launch shows progress: "Downloading your AI brain... 68%"
4. Press `Ctrl+Space` → WISPR activates

### Linux

```bash
# Download AppImage
wget https://github.com/nrbns/Regenbrowser/releases/latest/download/RegenBrowser.AppImage
chmod +x RegenBrowser.AppImage
./RegenBrowser.AppImage
```

### macOS

1. Download `RegenBrowser.dmg` (Intel) or `RegenBrowser-arm64.dmg` (Apple Silicon)
2. Open DMG → Drag to Applications
3. First launch auto-downloads AI models

### Chrome Extension

1. Open Chrome → Extensions → Developer mode
2. Load unpacked → Select `extension/` folder
3. Press `Ctrl+Space` on any page → WISPR activates

**No terminal. No Rust. No Ollama setup. Just works.**

---

# Regen Vision

**Regen** is a next-generation, ultra-light browser that combines:

- a **full AI agent layer**,
- **automation workflows**,
- a built-in **Redix execution environment**,
- and seamless **multi-browser capabilities**—

  into one unified, **high-performance system**.

It runs with **extremely low storage**, **minimal CPU usage**, and delivers **faster performance than traditional browsers**, while giving users a **powerful, automation-driven browsing experience** that no other browser offers.

It's not just a browser—

it's a **world-class AI automation platform** designed for productivity, research, trading, security, and real-time intelligence.

---

## Technical Stack

Tauri + React + TypeScript + Vite multi-mode desktop browser with:

- 🛡️ **Brave + Tor + VPN** unified privacy stack 🧪 _Experimental / in progress_
- 🤖 **Unified AI Engine** ✅ _Complete_ - Multi-provider (OpenAI, Anthropic, Ollama), streaming, caching, telemetry
- 📚 **Knowledge graph** foundation 🧪 _Experimental / in progress_
- 🧩 **Plugin runtime** ready 🧪 _Experimental / in progress_
- ⚡ **Performance-first** with tab hibernation 🧪 _Experimental / in progress_
- 🔬 **Research Mode** ✅ _Complete_ - File upload, AI analysis, citations
- 💹 **Trade Mode** ✅ _Complete_ - AI signals, position sizing, risk management
- 🎮 **Game Mode** ✅ _Complete_ - AI recommendations, save states, enhanced search

**Status**: 🟢 **Production Ready (v1.0.0)** - Fully offline AI, one-click installer, Chrome extension  
**Production Readiness**: 100/100 ✅

## ✨ Key Features

### 🎤 WISPR Voice Agent

- **Global Hotkey**: `Ctrl+Space` anywhere
- **Hindi/English**: "Nifty kharido 50" or "Research Tesla earnings"
- **Commands**: Trade, Research, Search, Summarize, Explain, Fill Forms, Screenshot Analysis
- **Floating Orb**: Drag anywhere, always accessible

### 💹 Trade Mode

- **Voice Trading**: "100 HDFC Bank becho at market"
- **TradingView Charts**: Real-time candles, indicators
- **AI Signals**: Local LLM analysis (phi3:mini)
- **Auto Orders**: Zerodha integration (coming soon)

### 🔍 Research Mode

- **Multi-Source**: Opens 10 tabs automatically
- **AI Summaries**: 3-bullet points in Hindi/English
- **Citations**: Source tracking, evidence overlay
- **Offline**: Works without internet after setup

### 📸 Screenshot Analysis

- **GPT-4 Vision**: "Yeh chart ka analysis kar"
- **Smart Detection**: Charts, text, UI elements
- **Modal Display**: Beautiful analysis overlay

### 📝 Form Auto-Fill

- **Save Profile**: "Save my profile" → Extracts form data
- **Auto-Fill**: "Fill kar" → Fills any form instantly
- **Smart Matching**: Name, email, phone, Aadhaar, PAN

### 🔧 One-Click Installer

- **Auto-Download**: Ollama + models (~2GB)
- **Progress UI**: "Downloading your AI brain... 68%"
- **Zero Setup**: Works on 99% of Indian laptops
- **Offline First**: Everything works without internet

## 🚀 Quick Start

### For Users (Recommended)

1. **Download**: Get the installer from [Releases](https://github.com/nrbns/Regenbrowser/releases)
2. **Install**: Run the installer (auto-downloads Ollama + AI models)
3. **Launch**: Open RegenBrowser → Press `Ctrl+Space` for WISPR
4. **Use**: Try Research Mode → "Summarize this page" or "Research quantum computing"

### For Developers

```bash
# Clone repository
git clone https://github.com/nrbns/Regenbrowser.git
cd Regenbrowser

# Install dependencies
npm install

# Setup environment (optional - for online AI features)
cp example.env .env
# Edit .env and add your API keys (or skip for offline mode)

# Install Ollama (required for offline AI)
# Windows: Download from https://ollama.com/download
# Linux: curl -fsSL https://ollama.com/install.sh | sh
# macOS: brew install ollama

# Pull AI models (one-time, ~2GB)
ollama pull phi3:mini
ollama pull llava:7b

# Start development server
npm run dev

# Build installer
npm run build:installer
```

### Architecture Overview

**Folder Structure:**

```
Omnibrowser/
├── src/                    # Frontend (React + TypeScript)
│   ├── components/         # UI components
│   ├── modes/             # Trade, Research, Docs modes
│   ├── services/          # API clients, search, etc.
│   ├── state/             # Zustand stores
│   └── lib/               # Utilities, IPC, env
├── tauri-migration/        # Tauri desktop shell
│   └── src-tauri/         # Rust backend
│       ├── src/main.rs    # IPC commands
│       └── tauri.conf.json
├── server/                 # Node.js backend services
│   ├── doc-service/       # Document editing
│   └── mock-llm.js        # Mock LLM server
├── redix-core/            # Python Redix engine
└── docs/                  # Documentation
```

**Tech Stack:**

- **Frontend**: React + TypeScript + Vite (port 5173)
- **Backend**: Fastify server (port 4000)
- **Desktop**: Tauri shell (Rust + WebView)
- **Queue**: BullMQ + Redis for scraping jobs
- **State**: Zustand for centralized tab/session management
- **Database**: SQLite (via Tauri plugin) for local storage
- **Vector DB**: FAISS (local service) for embeddings

### Environment Variables

Copy `example.env` to `.env` and configure:

- **Offline Mode (Recommended)**: No API keys needed! Just install Ollama and pull models.
- **Online Mode**: Add OpenAI/Anthropic/Groq keys for advanced features.
- **Trading**: Add Zerodha API keys for auto trade execution.
- **Analytics**: Add Sentry/PostHog keys for error tracking.

See `example.env` for all available options.

## 📊 System Requirements

- **Windows**: 10+ (x64)
- **Linux**: Ubuntu 20+ / AppImage (x64)
- **macOS**: 12+ (Intel/Apple Silicon)
- **RAM**: 4GB minimum (8GB recommended)
- **Disk**: 3GB free (for Ollama + models)
- **Network**: Only for initial download (then 100% offline)

## 🎯 Use Cases

### For Traders

- Voice trade execution: "Nifty kharido 50 SL 24700"
- Chart analysis with AI
- Multi-timeframe research

### For Students

- Research mode: "Tesla Q4 earnings research kar"
- Auto-summarize articles
- Form auto-fill for applications

### For Developers

- Code explanation: "Yeh React code kya kar raha hai?"
- Screenshot → AI analysis
- Offline AI assistant

## 🌍 Distribution

- **GitHub Releases**: Auto-built for all platforms
- **Chrome Web Store**: Extension (coming soon)
- **Product Hunt**: Launch planned
- **IndieHackers**: Build in public

## 📈 Roadmap

### Tier 1 (Completed ✅)

- [x] Centralized tab state (Zustand)
- [x] Session save & restore
- [x] Unified `/api/summarize` facade (no polling)
- [x] Back/forward history navigation
- [x] Loading/error/empty states
- [x] Hide unfinished modes (Research Mode only)
- [x] Analytics & logging
- [x] Security guardrails (blocked hosts, protocols)

### Tier 2 (In Progress 🚧)

- [ ] Bookmarks & workspaces
- [ ] Settings UI
- [ ] Simple agents
- [ ] User feedback system
- [ ] Enhanced error recovery

### Tier 3 (Planned 📋)

- [ ] Zerodha integration
- [ ] Multi-tab split view
- [ ] Mobile app (PWA)
- [ ] API for B2B
- [ ] Advanced agent workflows

### Legacy Features (Complete ✅)

- [x] WISPR voice agent
- [x] One-click installer
- [x] Chrome extension
- [x] Offline AI (Ollama)

## 🤝 Contributing

We're building in public! Join us:

- GitHub Issues: Bug reports, feature requests
- Twitter: [@regenbrowser](https://twitter.com/regenbrowser)
- Discord: Coming soon

## 📄 License

MIT License - Free for personal and commercial use

---

**Made with ❤️ in India 🇮🇳 | 100% Offline AI | Zero Tracking**

[![CI](https://github.com/nrbns/Omnibrowser/workflows/CI/badge.svg)](https://github.com/nrbns/Omnibrowser/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Note**: Core browser foundation, unified AI engine, and mode enhancements (Research, Trade, Game) are complete. See [PROJECT_STATUS.md](./PROJECT_STATUS.md) for detailed status, [docs/PRODUCTION_READINESS_PLAN.md](./docs/PRODUCTION_READINESS_PLAN.md) for the roadmap to 100%, and [CHANGELOG.md](./CHANGELOG.md) for recent updates.
>
> **Issues & Roadmap**: See [GitHub Issues](https://github.com/nrbns/Omnibrowser/issues) for current work and feature requests.

## Quick Start

```bash
# Install dependencies
cd tauri-migration
npm install

# Start backend (Terminal 1)
cd ../server
node redix-server.js

# Start Tauri (Terminal 2)
cd ../tauri-migration
npm run tauri dev
```

## Key Features

### 🔬 Research Mode

- Upload documents (PDF, DOCX, TXT, MD) for AI analysis
- Real-time streaming AI responses with citations
- Knowledge graph visualization
- Multi-source aggregation

### 💹 Trade Mode

- AI-powered trading signals (auto-generates every 30s)
- Position sizing helper with risk management
- Real-time market data and charts
- Portfolio risk metrics

### 🎮 Game Mode

- AI-powered game recommendations
- Enhanced semantic search
- Save/load game states
- Offline-capable games

### 🤖 Unified AI Engine

- Multi-provider support (OpenAI, Anthropic, Ollama)
- Real-time streaming responses
- Cost-aware model selection
- Memory context injection
- Response caching for performance

## Documentation

### Getting Started

- [docs/QUICKSTART.md](./docs/QUICKSTART.md) - **Quick Start Guide** (start here!)

### Project Status & Planning

- [PROJECT_STATUS.md](./PROJECT_STATUS.md) - Current features and status
- [docs/PRODUCTION_READINESS_PLAN.md](./docs/PRODUCTION_READINESS_PLAN.md) - **Production readiness roadmap (92/100 → 100/100)**
- [docs/SPRINT_4_PLAN.md](./docs/SPRINT_4_PLAN.md) - **6-week sprint plan to close the gap**
- [docs/SPRINT_SUMMARY.md](./docs/SPRINT_SUMMARY.md) - Sprint 1-3 completion summary
- [CHANGELOG.md](./CHANGELOG.md) - Release notes and changelog
- [PROJECT_CHECKLIST.md](./PROJECT_CHECKLIST.md) - 90-day build plan checklist
- [ISSUES.md](./ISSUES.md) - Issue tracking and roadmap

### Architecture & Technical

- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) - Architecture documentation
- [docs/REDIX_ARCHITECTURE.md](./docs/REDIX_ARCHITECTURE.md) - **Redix green-tech engine (RAM/battery/CO₂ optimization)**
- [SECURITY.md](./SECURITY.md) - Security documentation

### Testing & Release

- [docs/BETA_RELEASE_CHECKLIST.md](./docs/BETA_RELEASE_CHECKLIST.md) - Beta release readiness checklist
- [docs/TESTING_CHECKLIST.md](./docs/TESTING_CHECKLIST.md) - Comprehensive testing guide

## Prerequisites

- Node 20+
- npm/pnpm/yarn

## Development

```bash
# One command: starts Redix helpers, web renderer, and Tauri shell
npm run dev

# (First time only) install desktop deps
cd tauri-migration && npm install
```

`npm run dev` now launches the browser build on http://localhost:5173 and the desktop shell (Tauri) on http://localhost:5183 simultaneously.  
If you need to run components independently, you can still start them manually:

```bash
# Start backend
cd server
node redix-server.js

# Start Tauri standalone
cd tauri-migration
npm run tauri dev
```

Backend HTTP API runs on port 4000.

## Build

### Windows Installer (MSI)

```bash
# Build Windows installer (.msi)
npm run build:windows:installer
```

This will:

1. Build the frontend (React + Vite)
2. Build the Tauri app for Windows
3. Generate an MSI installer in `tauri-migration/src-tauri/target/release/bundle/msi/`

The installer will be named `Regen_0.1.0-alpha_x64_en-US.msi` (or similar).

### Development Build

```bash
cd tauri-migration
npm run tauri build
```

Outputs platform installers via Tauri.

## Testing

Playwright-based tests cover the tab strip and critical UI ergonomics. Run them with:

```bash
npm run test:e2e
```

The first run may prompt Playwright to download browser dependencies. In CI the suite runs headlessly and fails the pipeline if any smoke assertion regresses.

## Safety

- Video download requires explicit consent in Settings.
- Threat Analysis is informational only.
