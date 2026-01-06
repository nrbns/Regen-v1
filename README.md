Regen — A Local-First AI Execution Environment (Browser-First)

Built in India 🇮🇳
Designed for low-resource devices
Early Access / Technical Preview

Regen is a **local-first AI execution environment** that helps users work with information, documents, and the web — while **staying lightweight, private, and stable**.

Regen runs **locally by default**, works **offline after setup**, and is designed for **long sessions without crashes or resource spikes**.

---

## Why Regen?

Regen focuses on **trust, efficiency, and reliability** — not hype.

• Local-first by default
• Works offline after initial setup
• No hidden telemetry
• Designed for low-RAM systems
• Automatic recovery from failures
• Open-source and auditable

Regen is **not a chat app** and **not a cloud AI wrapper**.
It is an execution environment where AI operates **under system control**, not the other way around.

---

## Core Principles

### 1. Local-First
All processing runs on your device by default.
Network access is explicit and optional.

### 2. Resource Discipline
AI execution is governed by system limits:
- Memory
- CPU
- Battery state

### 3. Stability Over Features
Regen prioritizes long-running stability, predictable behavior, and graceful recovery.

### 4. Transparency
System state (memory, agent activity, recovery events) is visible to the user.

---

## Key Capabilities (v1)

### AI-Assisted Research
- Page summarization
- Document analysis (PDF, text)
- Offline embeddings & search
- Optional online sources (explicit)

### Document Assistance
- Text refinement
- Structure & clarity suggestions
- Offline processing supported

### Voice Input (Experimental)
- Manual trigger only
- Treated as text input
- No background listening
- Fully optional and disable-able

### Performance Focus
- Idle memory target: <200MB (validated on low-tab usage)
- Automatic tab hibernation
- Battery-aware throttling
- Fast startup on low-end systems

---

## Privacy & Trust

- Local-first by default
- No hidden telemetry
- No ads
- No background data collection
- Offline operation supported after setup

Regen’s privacy comes from **architecture**, not promises.

---

## What Regen Is Not (v1)

- Not a VPN
- Not a Chrome replacement
- Not a cloud AI service
- Not an autonomous agent platform
- Not feature-complete

---

## System Requirements

**Minimum**
- OS: Windows 10+, Linux, macOS
- RAM: 4GB
- Disk: ~3GB (local models)
- CPU: Dual-core

**Recommended**
- RAM: 8GB+
- Disk: 5GB+
- Quad-core CPU

---

## Installation (Developer Preview)

```bash
git clone https://github.com/nrbns/Regen-v1.git
cd Regen-v1
npm install
npm run dev
```

Offline AI requires a local model runtime (e.g., Ollama).

## Project Status

Version: v1 (Early Access)
Status: Core systems implemented, actively stabilizing
Audience: Builders, researchers, early technical users

## License

MIT License
Open-source and auditable.

Made with ❤️ in India 🇮🇳

---
# Regen — A Local-First AI Execution Environment (Browser-First)

Early Access / Technical Preview — Designed for low-resource devices.

Regen focuses on local-first AI assistance that runs in the browser or the Tauri desktop shell. This repository contains the web UI, optional desktop glue, and developer tooling used during early access.

Why this README changed
- Tone down broad claims and keep v1 expectations focused and verifiable.
- Remove experimental features from core messaging (they belong in ROADMAP.md).

Key principles (v1)
- Local-first by default; network use is explicit.
- Privacy-preserving: no telemetry enabled by default; opt-in diagnostics only.
- Resource-aware: designed to be usable on low-RAM devices.
- Incremental: experimental integrations are documented separately in ROADMAP.md.

Quick start (summary)
- No account required for local usage.
- Developer: see `DEVELOPERS.md` for full setup and architecture.

WISPR (Voice) — Experimental
- Manual trigger only; no background listening.
- Treated as an optional text-input pathway and can be disabled.

Research assistance (v1)
- Page summarization and local document analysis (PDF/text).
- Local embeddings & offline search when models are available.
- Optional online sources used only with explicit consent and configuration.

Trade/Financial integrations
- Trading and automated execution are not part of the v1 README or core claims.
- Experimental integrations (if any) are listed under `ROADMAP.md` and guarded behind explicit opt-ins.

Telemetry and privacy
- No telemetry by default. Any diagnostic or usage collection is opt-in and documented.

Developer setup (short)
- Node.js 18+ (20+ recommended)
- Rust + Tauri CLI only required for desktop builds
- See `DEVELOPERS.md` for detailed instructions and optional AI backend setup

Project status
- Version: Early Access / Technical Preview
- Core systems implemented for local-first prototypes; actively stabilizing.

How to contribute
- See `CONTRIBUTING.md` and `DEVELOPERS.md` for development, testing, and PR guidance.

Where to find more
- ROADMAP and experimental features: `ROADMAP.md`
- Developer docs: `DEVELOPERS.md`
- Contributor guide: `CONTRIBUTING.md`

License
- MIT

Made with care in India — aimed at being practical, measurable, and safe for early adopters.

## 🛠️ Developer Setup

### Prerequisites

- Node.js 20+
- Rust 1.70+
- Tauri CLI: `cargo install tauri-cli`

### Installation

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
```

### Development

```bash
# Start all services
npm run dev

# Or start components separately
npm run dev:web       # Vite dev server (port 5173)
npm run dev:tauri     # Tauri app
npm run dev:server    # Backend server (port 4000)
```

### Build

```bash
# Type check
npm run build:types

# Lint
npm run lint

# Build production
npm run build
# Build desktop app (Tauri)
npm run build:app
```

## 📊 System Requirements

### Minimum (MVP Optimized)

- **OS**: Windows 10+, Linux (Ubuntu 20+), macOS 12+
- **RAM**: 4GB (3-tab limit enforced automatically)
- **Disk**: 3GB free (Ollama + models)
- **CPU**: Dual-core 2GHz+
- **Network**: Initial download only (offline after setup)

### Recommended

- **RAM**: 8GB+ (5-10 tabs comfortable)
- **Disk**: 5GB+ (additional models)
- **CPU**: Quad-core 2.5GHz+
- **Battery**: Power Saving Mode auto-activates on laptops

### MVP Performance Targets (Week 2 Validated)

- ✅ Cold-start: <3s (actual: ~2.5s)
- ✅ Tab-switch: <500ms (actual: ~150ms)
- ✅ Idle memory: <200MB (actual: ~160MB with 3 tabs)
- ✅ Bundle size: <2MB (actual: 0.8MB gzipped)

## 🎯 Use Cases

### For Traders

- Voice trade execution: "Nifty kharido 50 SL 24700"
- Chart analysis with AI
- Real-time market signals

### For Students

- Research mode: "Tesla Q4 earnings research kar"
- Auto-summarize articles
- Document analysis with OCR

### For Developers

- Code explanation: "Yeh React code kya kar raha hai?"
- Screenshot → AI analysis
- Offline AI assistant

## 🏗️ Architecture

**Tech Stack:**

- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Fastify
- **Desktop**: Tauri (Rust + WebView)
- **AI**: Ollama (offline) + OpenAI/Anthropic (optional)
- **State**: Zustand for centralized management
- **Vector Search**: HNSW for fast semantic search

**Key Components:**

- `src/components/` - UI components
- `src/modes/` - Trade, Research, Docs modes
- `src/services/` - API clients, search, voice
- `src/core/` - AI engine, agents, memory
- `src-tauri/` - Tauri desktop shell

## 📈 Project Status

**Current Version**: 0.3.0 (MVP Week 2)  
**Status**: 🟢 **Beta-Ready (9.2/10)** - Week 2 75% complete, launch-ready Dec 2025  
**Last Updated**: December 13, 2025

### ✅ Recent Achievements (Week 1-2 MVP)

- **Week 1 Complete** - 8/8 MVP features implemented, 79 tests passing
- **Week 2 Phase 1-3 Complete** - Settings UI, Telemetry, Performance baseline (97 tests)
- **Performance optimized** - Tab hibernation, Low-RAM mode, Battery-aware power
- **Settings UI shipped** - Feature toggles, device status, localStorage persistence
- **Telemetry integrated** - Anonymous usage tracking, opt-out supported
- **Architecture validated** - All targets met/exceeded (cold-start <3s, memory <200MB)
- **Hindi-first UX** - 22 Indian languages supported, 85% Hindi detection

### 📊 Testing Status

| Test Type      | Status     | Details                       |
| -------------- | ---------- | ----------------------------- |
| Unit Tests     | ✅ Passing | 97 tests (up from 79)         |
| MVP Features   | ✅ PASSED  | 8/8 features validated        |
| Settings UI    | ✅ PASSED  | Feature toggles working       |
| Performance    | ✅ PASSED  | Cold-start <3s, memory <200MB |
| Integration    | ✅ PASSED  | 3/3 flows working             |
| Desktop Manual | ⏳ Pending | Week 2 Phase 4                |
| Cross-Platform | 📋 Ready   | Checklists prepared           |
| Load (k6)      | ⏳ Pending | k6 installation required      |

**Week 1 Progress**: ✅ 100% (8/8 features complete)  
**Week 2 Progress**: ⏳ 75% (Phases 1-3 complete, 4-5 remaining)

### 🚀 Launch Timeline

- **Week 1** (Dec 9-12): ✅ MVP features implemented (8/8 complete)
- **Week 2** (Dec 13-15): ⏳ Settings UI + Telemetry (75% complete)
  - ✅ Phase 1: Performance baseline
  - ✅ Phase 2: Settings UI with toggles
  - ✅ Phase 3: Telemetry service
  - ⏳ Phase 4: Desktop validation (pending)
  - ⏳ Phase 5: Launch prep (pending)
- **Week 3** (Dec 16-20): Beta user recruitment (10-20 users)
- **Week 4** (Dec 21-27): Final polish + beta launch prep

**Target**: December 21-23, 2025 Beta Launch (pending Week 2 Phase 4-5 validation)

### 📚 Documentation

---

## 📖 Three-Layer Documentation

### 🟢 For Users → [README.md](README.md) (You are here)

- What is Regen?
- How to install and use
- Key features walkthrough
- Troubleshooting

### 🟡 For Developers → [DEVELOPERS.md](DEVELOPERS.md)

- Architecture overview (3-layer AI browser)
- Folder structure explained
- How AI works (LangChain + Socket.IO streaming)
- Quick development setup
- Debugging tips
- Adding new features (examples)

### 🔵 For Contributors → [CONTRIBUTING.md](CONTRIBUTING.md)

- How to contribute
- Code style guidelines
- Testing requirements
- Pull request checklist
- Good first issues

---

**Choose your path:**

- I want to **use** Regen → You're in the right place ✅
- I want to **understand how it works** → [DEVELOPERS.md](DEVELOPERS.md)
- I want to **build a feature** → [CONTRIBUTING.md](CONTRIBUTING.md)

---

**More Documentation:**

**MVP Week 1-2 Docs:**

- **[Week 1-2 Documentation Index](WEEK1_DOCUMENTATION_INDEX.md)** - Master navigation
- **[Week 2 Sprint Plan](WEEK2_SPRINT_PLAN.md)** - 5-phase plan & timeline
- **[MVP Quick Reference](MVP_QUICK_REFERENCE.md)** - Features, shortcuts, usage
- **[Performance Baseline](docs/WEEK2_PERFORMANCE_BASELINE_REPORT.md)** - Architecture analysis
- **[Feature Flags Guide](docs/MVP_FEATURE_FLAGS.md)** - Configuration API
- **[Week 1 Executive Summary](WEEK1_EXECUTIVE_SUMMARY.md)** - Launch readiness

**Project Docs:**

- **[Project Status](docs/PROJECT_STATUS_DEC2025.md)** - Comprehensive project overview
- **[Testing Guide](README_TESTING.md)** - Complete testing documentation
- **[Launch Checklist](docs/LAUNCH_PREPARATION_CHECKLIST.md)** - Pre-launch tasks
- **[Accomplishments](docs/ACCOMPLISHMENTS_SUMMARY.md)** - What we've built

---

## 🤝 Contributing

We're building in public! Join us:

- **GitHub Issues**: Bug reports, feature requests
- **Pull Requests**: Welcome! See [CONTRIBUTING.md](CONTRIBUTING.md)
- **Discord**: Coming soon

## 📄 License

MIT License - Free for personal and commercial use

---

**Made with ❤️ in India 🇮🇳 | 100% Offline AI | Zero Tracking**

[Download](https://github.com/nrbns/Regenbrowser/releases) | [Documentation](./docs/) | [Issues](https://github.com/nrbns/Regenbrowser/issues)
