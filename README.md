# 🌌 Regen — A Real-Time, Presence-Based AI Browser

> **Regen is not a chatbot browser.  
> It is a browser with a mind.**

Regen is an experimental **real-time browser platform** that observes user intent, understands context, and intervenes **only when necessary** — silently, precisely, and ethically.

Unlike traditional AI browsers that rely on chat windows and manual prompts, Regen introduces a **presence-based AI system** that lives alongside the browser as a *sentinel*, not an assistant.

---

## 🧬 What Makes Regen Different

Most browsers today fall into one of two categories:

* **Traditional browsers** → fast but unaware
* **AI browsers** → chat-heavy, interruptive, prompt-driven

Regen creates a **new category**:

> **A calm, observing browser that helps without interrupting.**

### Core Differentiators

* 🧠 **Presence-based AI (not chat-based)**
* 👁️ **Real-time intent & context awareness**
* 🛡️ **Local-first, privacy-respecting design**
* ⚙️ **Event-driven architecture**
* 🧩 **Human-kind AI behavior (silent, precise, loyal)**

---

## 🔥 The Sentinel AI (Regen Core)

At the heart of Regen is **Regen Core** — a sentinel-style AI system inspired by cinematic intelligence systems (e.g., *M3GAN-like control and restraint*), but built with ethical, user-first principles.

### Regen Core does NOT:

* Interrupt you
* Spam suggestions
* Force AI actions
* Behave like a chatbot

### Regen Core DOES:

* Observe browsing patterns
* Detect redundancy, loops, overload, and drift
* Suggest actions *only when useful*
* Return to silence after helping

> Think of it as a **guardian system**, not a helper bot.

---

## 🧭 How Regen Works (High Level)

```
User Action
   ↓
Real-Time Event Bus
   ↓
Context & Pattern Detection
   ↓
Regen Core (Sentinel AI)
   ↓
Optional Suggestion
   ↓
User Consent → Action → Report → Silence
```

Everything is **event-driven**, not request-response.

---

## 🧩 Current Capabilities (v1)

### Browser Core

* Multi-tab browsing
* Intent-first command system
* Workspace-based navigation
* Local session persistence

### AI Capabilities

* Page summarization
* Search intelligence (manual + contextual)
* Structured task execution
* Audit-friendly AI interactions

### System Design

* Local-first architecture
* Offline-ready foundations
* Explicit user consent for AI actions
* Transparent execution logs

> ⚠️ Regen intentionally avoids "always-on automation" without user permission.

---

## 🚧 What "Real-Time" Means in Regen

Real-time in Regen does **not** mean faster chat replies.

It means:

* UI reacts instantly to user behavior
* Context builds continuously in the background
* AI suggestions emerge from patterns, not prompts
* The browser feels *aware*, not reactive

Examples:

* Detecting redundant tabs
* Noticing repeated searches
* Identifying long reading loops
* Offering summaries when attention drops

---

## 🛡️ Privacy & Ethics

Regen is built on the principle that **intelligence must be earned, not assumed**.

* Local-first by default
* No hidden background automation
* No silent data exfiltration
* Every AI action is visible and dismissible
* Users can silence Regen Core anytime

Regen's AI is **observational, not invasive**.

---

## 🧪 Project Status

🚧 **Experimental / Active Development**

* Core browser architecture: ✅
* Intent & command system: ✅
* Presence-based AI (Regen Core): ✅
* Real-time event bus: ✅
* Pattern detection & memory: 🚧 In progress
* Local AI models: ⏳ Planned

This is **not** a finished consumer browser — it is a **platform for next-generation browsing intelligence**.

---

## 🗺️ Roadmap (Simplified)

### Phase 1 — Real-Time Foundation ✅

* Event bus ✅
* Sentinel AI presence ✅
* Context signals ✅

### Phase 2 — Intelligence Layer 🚧

* Pattern detection 🚧
* Session memory 🚧
* Smarter suggestions 🚧

### Phase 3 — Local AI ⏳

* Offline intelligence ⏳
* Model choice (local / remote) ⏳
* User-controlled AI modes ⏳

---

## 🚀 Quick Start

### Prerequisites

* Node.js 18+
* Rust 1.70+ (for Tauri desktop app)
* Ollama (optional, for local AI features)

### Installation

```bash
git clone https://github.com/nrbns/Regen-v1.git
cd Regenbrowser
npm install
```

### Development

```bash
# Start the backend server
npm run dev:backend

# Start the UI (in another terminal)
npm run dev:web

# Start the desktop app (Tauri)
npm run dev:tauri
```

### Setup Local AI (Optional)

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull models (optional)
ollama pull phi3:mini
```

---

## 🧑‍💻 Who Regen Is For

* Builders & developers
* Researchers & power users
* Founders exploring AI-first tools
* Anyone who wants **less noise, more clarity**

---

## 📚 Technical Architecture

### Event-Driven Real-Time System

Regen uses an **event bus architecture** for real-time context awareness:

**Event Types:**
* `NAVIGATE` - Tab navigation events
* `TAB_OPEN` / `TAB_CLOSE` / `TAB_SWITCH` - Tab lifecycle events
* `SCROLL` - Scroll depth tracking
* `SEARCH_SUBMIT` - Search query events
* `TEXT_SELECT` - Text selection events
* `IDLE_TIMEOUT` - User idle detection
* `PAGE_LOAD` / `PAGE_ERROR` - Page lifecycle events
* `CLICK` / `KEYPRESS` - User activity tracking

**Pattern Detection:**
* **Tab Redundancy** - Detects 3+ tabs from same domain
* **Search Loop** - Detects repeated searches (3+ in 60s)
* **Long Scroll** - Detects deep scrolling on articles (80%+ depth)
* **Idle Time** - Detects 22+ minutes of inactivity
* **Page Errors** - Detects failed page loads

**AI Actions (User Permission Required):**
* `close_duplicates` - Close redundant tabs
* `summarize` - Summarize long article
* `refine_search` - Suggest search refinement
* `save_for_later` - Save page for later reading
* `use_cache` - Use cached version on error

### Technical Stack

```
Frontend (React + TypeScript)
    ↕ EventBus (Real-Time Events)
    ↕ Regen Core (Sentinel AI)
    ↕ IPC (Tauri) / Events (Web)
Backend Services
    ├── CommandController (Intent resolution & execution)
    ├── ToolGuard (Security & permissions)
    ├── BackendService (API abstraction)
    ├── WorkspaceStore (Local persistence)
    ├── TaskRunner (Single-run tasks)
    └── EventBus (Real-time event streaming)
```

### Key Files

* `src/lib/command/CommandController.ts` - Single entry point for all commands
* `src/lib/events/EventBus.ts` - Real-time event streaming system
* `src/core/regen-core/` - Sentinel AI presence system (Regen Core)
* `src/core/regen-core/regenCore.hooks.ts` - Pattern detection hooks
* `src/lib/security/ToolGuard.ts` - Tool allowlist and permission system
* `src/lib/backend/BackendService.ts` - Backend API abstraction
* `src/lib/workspace/WorkspaceStore.ts` - Local data persistence

---

## 📖 Documentation

* [API Documentation](./API_DOCUMENTATION.md) - Complete API reference
* [Architecture Audit](./AUDIT.md) - Technical audit and compliance checklist
* [Regen Core Implementation](./REGEN_CORE_IMPLEMENTATION.md) - Sentinel AI system details
* [Real-Time Architecture](./REALTIME_IMPLEMENTATION_COMPLETE.md) - Event-driven system documentation

---

## ⚠️ Disclaimer

Regen is an **experimental research project**.  
Expect breaking changes, refactors, and rapid evolution.

If you're looking for a polished Chrome replacement — this is not it (yet).

If you're interested in **what browsers could become** — welcome.

---

## 📜 License

MIT License (see LICENSE file for details)

---

## 🧠 Final Note

> Regen is not trying to be louder than other browsers.  
> It's trying to be **smarter, quieter, and more respectful**.

---

**Built with ❤️ for the future of browsing**
