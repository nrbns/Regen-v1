# RegenBrowser Execution Plan - Battle-Ready Playbook

**Goal:** Build the only browser+AI OS that becomes both a daily productivity hub and an automation platform.

---

## 🎯 Core Differentiators (Battle Standards)

1. **Realtime agent layer** - Agent watches tabs, offers actions, executes macros
2. **Hybrid offline-first AI** - Local LLM/Whisper for privacy & latency, cloud fallback
3. **Automation-first UX** - One-click "create macro from voice or demo" + marketplace
4. **Integrated Office + Research** - Open/edit PDF/DOCX/XLSX inside browser with AI
5. **Trade Mode with safety** - Automated risk-managed trading with paper-trade default
6. **Redix (memory & RAM reduction)** - Aggressive tab suspension, WebView pooling
7. **Extensible platform** - Plugins & marketplace for agents, trading strategies, automation

---

## 📋 Product Priorities (Order of Impact)

1. **Core browser + Tab lifecycle + persistence** - Must be rock solid
2. **Realtime Agent (LLM Router + Whisper + Action Executor)** - VISIBLE magic
3. **Automation macros & marketplace MVP** - Users can automate repetitive web tasks
4. **Office + Research Mode with vector search** - Daily value for knowledge workers
5. **Trade Mode (paper-first → live with KYC/keys)** - High retention / monetization
6. **Offline-first local LLM/Whisper support** - Privacy/latency moat
7. **Performance engineering + Redix** - Small memory footprint, mobile-first
8. **Cross-platform builds & CI** - Distribution to users quickly

**Ship the first 3 together as the MVP.**

---

## 🚀 30/60/90-Day Execution Plan

### Day 0 (Right Now) ✅

- [x] Create public README, clear dev quick-start
- [x] CI to run builds
- [x] Open repo to contributors

### 30-Day (MVP)

- [ ] Browser foundation (tabs, session, bookmarks, suspend/resume)
- [ ] LLM Router (cloud + dev stub for local)
- [ ] Whisper bridge (record→transcribe via server or local `whisper.cpp`)
- [ ] Simple Realtime Agent: can parse intent like "save this page", "create macro"
- [ ] Macro recording: record DOM actions → replay
- [ ] Paper-trade adapter for one exchange (mock)
- [ ] Integrate PDF viewer (pdf.js)

**Deliverable:** Usable app that demonstrates agent automation and macro marketplace flow.

### 60-Day (Expand)

- [ ] Local embeddings + vector store (FAISS service)
- [ ] Save & search notes → SuperMe memory basics
- [ ] Trade Engine: risk rules, stop-loss automation, websocket price feed
- [ ] Basic marketplace (upload/download macros/agents)
- [ ] Start alpha user program (100 early power-users)

### 90-Day (Scale + Polish)

- [ ] Local LLM inference integration (wasm or small quantized model)
- [ ] Redix memory optimizations: WebView pooling, aggressive suspension
- [ ] Cross-OS builds, onboarding & analytics
- [ ] Security review + throttles for trading
- [ ] Launch public beta + PR + developer docs + onboarding flows

---

## 🔧 Concrete PRs to Implement (Priority Order)

### PR 001: Dev Quickstart & CI ✅ IN PROGRESS

- [x] Update README with 6-step dev quickstart
- [x] Add architecture section
- [ ] Ensure package.json scripts are consistent
- [ ] Add GitHub Actions CI

### PR 002: TabManager Lifecycle + Suspend/Resume

- [ ] Implement tab lifecycle: `active`, `idle`, `suspended`
- [ ] On suspend: unmount heavy listeners, store snapshot in IndexedDB
- [ ] Use `requestIdleCallback` + `visibilitychange`
- [ ] Code-splitting with React.lazy for heavy modes

### PR 003: Tauri IPC Commands

- [ ] Add `llm_query` command
- [ ] Add `start_whisper_stream` / `stop_whisper_stream`
- [ ] Add `place_order_stub` (paper-trade)
- [ ] Add `open_file` / `save_file` / `export_pdf`

### PR 004: SQLite Init + Migrations

- [ ] Create schema: tabs, sessions, bookmarks, trade_logs, agent_memory
- [ ] Add migrations helper
- [ ] Use `rusqlite` in Rust side

### PR 005: Whisper Bridge

- [ ] Rust: spawn `whisper.cpp` subprocess
- [ ] Stream events via WebSocket/IPC
- [ ] Frontend: record audio and stream to backend

### PR 006: Trade Adapter (Binance Mock)

- [ ] WebSocket subscription for market data
- [ ] Mock `placeOrder` for testing
- [ ] Risk manager stub

### PR 007: PDF Viewer Integration

- [ ] Integrate `pdfjs-dist`
- [ ] Show "Open PDF in tab" option
- [ ] Basic annotation support

---

## 🛠️ Tech Stack

- **UI:** React + Vite + TypeScript ✅
- **Desktop shell:** Tauri (Rust) ✅
- **Native worker:** Rust (whisper spawn, IPC, sqlite)
- **Local DB:** SQLite (rusqlite / tauri-plugin-store)
- **Vector DB:** FAISS or vearch as small local service
- **LLMs:** Cloud (OpenAI) + local via `ggml/gguf` models + `whisper.cpp` for STT
- **Trading:** Adapters per exchange (Binance/Zerodha) via WebSocket + signed REST
- **Embeddings:** sentence-transformers or cloud text-embedding-3 fallback
- **Build/CI:** GitHub Actions (matrix for mac/windows/linux)
- **Storage:** Encrypted local key store (Tauri keyring / OS keychain)

---

## 📊 KPIs to Track

- DAU / WAU ratio
- Macro creation rate (macros per 100 users)
- Agent acceptance rate (suggestions accepted %)
- Memory usage per active tab (MB)
- Crash-free sessions %
- Trade executions (paper → live conversions)
- Time to first automation (minutes) — aim < 5m

---

## 🔒 Security & Compliance (Must-Have)

- [ ] Encrypt API keys at rest (use OS keychain)
- [ ] KYC/legal notice before live trading; store consents
- [ ] Rate limit order placement; circuit breaker for runaways
- [ ] Secure IPC and validate inputs for native commands
- [ ] GDPR/Privacy policy + local India compliance

---

## 💰 Monetization Model

1. **Freemium:** Core browser + agent suggestions free
2. **Paid:** Premium automations, pro agent orchestration, advanced trade automations, cloud LLM credits
3. **Marketplace fee:** Sell macros, agents, strategy templates (30% rev share)
4. **Enterprise licensing & white-label**

---

## ⚡ Quick Wins (48-72 Hours)

1. Tab lifecycle + suspend/resume (visible speed improvement)
2. Macro recorder basic (record + replay) — people love automation
3. PDF viewer + "summarize this page" using cloud LLM — immediate UX wow
4. Paper-trade mock with websocket ticks — demo for traders

---

**Status:** Execution plan created. Starting with PR 001.
