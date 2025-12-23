# RegenBrowser Documentation

Complete documentation for RegenBrowser - Your Private AI OS.

## 📚 Core Documentation

### Architecture

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Main system architecture, component structure, and technology stack
- **[REDIX_ARCHITECTURE.md](./REDIX_ARCHITECTURE.md)** - Redix Green-Tech Engine details (memory, battery, CO₂ optimization)
- **[UNLIMITED_AGENTS_IMPLEMENTATION.md](./UNLIMITED_AGENTS_IMPLEMENTATION.md)** - Unlimited AI agents with zero lag implementation

### Setup & Development

- **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** - Complete setup guide for development and production

### API Reference

- **[api/API_DOCUMENTATION.md](./api/API_DOCUMENTATION.md)** - Complete Tauri commands and frontend services API
- **[api/API_CONFIG.md](./api/API_CONFIG.md)** - API configuration and endpoints
- **[api/TRADINGVIEW_API.md](./api/TRADINGVIEW_API.md)** - TradingView API integration

## 🏗️ System Architecture Overview

```
Regen Browser OS (Tauri)
│
├── 🧱 STABILITY LAYER (Safe Mode, Memory Guard, Watchdog)
├── 🌐 BROWSER ENGINE (Tab Manager, WebView, Session Management)
├── 💾 OFFLINE STORAGE (SQLite, FTS5 Search, Page Cache)
├── 🤖 AI SYSTEM (Ollama, Intent Detection, Agent Planner)
├── 🕵️ PRIVACY ENGINE (Mode Enforcement, TOR Integration)
└── ⚡ OPTIONAL CLOUD (L2 cold-load only)
```

## 🎯 Key Features

- **Offline-First**: Works without internet
- **Privacy-Enforced**: Ghost/Private/Normal modes
- **AI-Powered**: Unlimited agents with smart queuing
- **Low-Resource**: Optimized for 4-8GB RAM devices
- **Multilingual**: Hindi/English and more
- **Energy-Efficient**: Redix mode for battery/CO₂ savings

## 📖 Quick Links

- **Getting Started**: See [SETUP_GUIDE.md](./SETUP_GUIDE.md)
- **Architecture Details**: See [ARCHITECTURE.md](./ARCHITECTURE.md)
- **API Reference**: See [api/API_DOCUMENTATION.md](./api/API_DOCUMENTATION.md)
- **Redix Mode**: See [REDIX_ARCHITECTURE.md](./REDIX_ARCHITECTURE.md)
- **Unlimited Agents**: See [UNLIMITED_AGENTS_IMPLEMENTATION.md](./UNLIMITED_AGENTS_IMPLEMENTATION.md)

## 🔧 Component Structure

```
src/
├── components/          # UI Components
│   ├── search/         # Search UI
│   ├── browser/        # Browser UI
│   ├── agents/         # Agent UI
│   ├── settings/       # Settings UI
│   └── resource/       # Resource Monitor
├── modes/              # Browser Modes
│   ├── research/       # Research Mode
│   ├── trade/          # Trade Mode
│   └── docs/           # Document Mode
├── core/               # Core Services
│   ├── ai/             # AI & Model Management
│   ├── agents/         # Agent System & Queue
│   └── redix/          # Redix Engine
└── routes/             # Pages
    ├── Home.tsx
    ├── Settings.tsx
    └── ...
```

## 🚀 Development

See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for complete development setup instructions.

## 📝 License

MIT License - See LICENSE file for details.
