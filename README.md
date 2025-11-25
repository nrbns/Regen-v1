# Regen - The Internet Operating System

> **India's first execution browser: search, automate, trade, all in one.**

Regen combines **5 pillars** that no browser has together:

- 🚀 **Chrome-level browsing** - Fast, stable, familiar
- 🤖 **Atlas/Comet automation** - Built-in, not a plugin
- 🔍 **Perplexity research** - Inside the browser, not external
- 🛡️ **Brave privacy** - India-first, no US tracking
- 🇮🇳 **Made in India** - 12 languages, voice trading, government automation

**This is not a browser. This is the Internet Operating System.**

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

**Status**: 🟢 **Beta Ready (v0.1.0-alpha)** - Core features complete, ready for testing  
**Production Readiness**: 92/100 → Target: 100/100 (Sprint 4 planned)

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
