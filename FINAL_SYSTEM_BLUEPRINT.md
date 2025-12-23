# 🧩 FINAL SYSTEM BLUEPRINT - Regen Browser OS v1.0

**Complete Architecture** - No gaps, production-ready blueprint

---

## 🧠 MASTER RULE

> **JS shows things. Rust decides things.  
> Offline is default. Online is optional.  
> Privacy is enforced, not promised.**

---

## SYSTEM ARCHITECTURE

```
Regen Browser OS (Tauri)
│
├── 🧱 STABILITY LAYER
│   ├── Safe Mode (crash recovery after 3 crashes)
│   ├── Memory Guard (tab freezing, RAM management)
│   └── Watchdog (auto-recovery, WebView monitoring)
│
├── 🌐 BROWSER ENGINE
│   ├── Tab Manager (Rust-owned, per-tab state)
│   ├── WebView (native: WebView2/WKWebView/WebKitGTK)
│   ├── Session Management (Normal/Private/Ghost)
│   └── Memory Management (freeze/unload idle tabs)
│
├── 💾 OFFLINE STORAGE
│   ├── SQLite Database (pages, history, bookmarks, notes)
│   ├── FTS5 Full-Text Search (fast offline search)
│   └── Page Cache (auto-save visited pages)
│
├── 🤖 AI SYSTEM
│   ├── Offline AI (llama.cpp / Ollama)
│   ├── Intent Detection (offline-first)
│   ├── Agent Planner (decides: offline/online, steps)
│   ├── Tool System (browser/search/notes/files)
│   └── Streaming Results (real-time updates)
│
├── 🕵️ PRIVACY ENGINE
│   ├── Mode Enforcement (Normal/Private/Ghost)
│   ├── TOR Integration (per-tab routing)
│   ├── DNS/Fingerprint Hardening
│   └── Violation Detection (auto-disable on breach)
│
└── ⚡ OPTIONAL CLOUD (L2 cold-load only)
    └── Gateway Enhancements (optional, not required)
```

---

## DATA FLOW

### Tab Creation

```
User Action (UI)
  → invoke('tabs:create', { url, privacy_mode, app_mode })
  → Rust: TabManager.create_tab()
  → Rust: WebView created (native)
  → Rust: Tab state stored
  → IPC: Return tab ID
  → Frontend: Render tab UI
```

### AI Agent Flow

```
User Command (UI)
  → invoke('ai:detect_intent', { query })
  → Rust: AIService.detect_intent()
  → Rust: Agent.plan()
  → Rust: Agent.execute_step() (tools)
  → Rust: Stream results
  → IPC: Partial results → Final result
  → Frontend: Real-time UI updates
```

### Privacy Enforcement

```
Action Attempt (UI/System)
  → Rust: PrivacyEnforcer.check()
  → If Ghost Mode:
      → Block action
      → Log violation
      → Auto-disable Ghost Mode (if critical)
  → Else:
      → Allow action
```

---

## STATE OWNERSHIP

| State            | Owner                    | Storage          | Access                       |
| ---------------- | ------------------------ | ---------------- | ---------------------------- |
| **Tabs**         | Rust (`TabManager`)      | Memory (HashMap) | IPC: `tabs:*`                |
| **Language**     | Rust (`AppState`)        | Memory           | IPC: `settings:get_language` |
| **Privacy Mode** | Rust (`PrivacyEnforcer`) | Memory           | IPC: `privacy:get_mode`      |
| **Pages**        | Rust (`Database`)        | SQLite           | IPC: `db:save_page`          |
| **History**      | Rust (`Database`)        | SQLite           | IPC: `db:add_history`        |
| **Settings**     | Rust (`AppState`)        | Memory           | IPC: `settings:*`            |

**Frontend (Zustand):** UI cache only, synced from Rust via IPC.

---

## PRIVACY MODES (ENFORCED)

| Mode        | Disk | Cache | History | AI      | Network | TOR |
| ----------- | ---- | ----- | ------- | ------- | ------- | --- |
| **Normal**  | ✅   | ✅    | ✅      | All     | Direct  | ❌  |
| **Private** | ❌   | Temp  | ❌      | Offline | Direct  | ❌  |
| **Ghost**   | ❌   | ❌    | ❌      | Offline | TOR     | ✅  |

**Enforcement:** All checks in Rust (`privacy.rs`), UI cannot override.

---

## RESILIENCE GUARANTEES

| Scenario          | Result                         |
| ----------------- | ------------------------------ |
| Internet dies     | ✅ Regen works (offline-first) |
| AI APIs shut down | ✅ Regen works (offline AI)    |
| Cloud blocked     | ✅ Regen works (local only)    |
| WebView crashes   | ✅ Tab auto-reloads (watchdog) |
| App crashes 3x    | ✅ Safe Mode activates         |
| Chrome disappears | ✅ Regen works (independent)   |

---

## PERFORMANCE TARGETS

| Metric             | Target               | Status              |
| ------------------ | -------------------- | ------------------- |
| **RAM Usage**      | < Chrome (same tabs) | 🚧 In progress      |
| **Startup Time**   | < 2 seconds          | ✅ Achieved (Tauri) |
| **Tab Freeze**     | Background > 30s     | ✅ Implemented      |
| **Offline Search** | < 100ms (FTS5)       | ✅ Implemented      |
| **AI Response**    | < 500ms (offline)    | 🚧 Depends on model |

---

## SECURITY MODEL

### Sandboxing

- **Rust backend:** Full system access (necessary)
- **WebView:** Isolated per tab
- **AI Agent:** Sandboxed (can't access filesystem without permission)
- **Frontend (JS):** No direct system access, IPC only

### Privacy Guarantees

- **Ghost Mode:** All disk writes blocked (Rust-enforced)
- **Private Mode:** Session-only storage
- **TOR:** Per-tab routing (not whole app)
- **Violation Detection:** Auto-disable + warning

---

## DEPLOYMENT MODEL

### Core (Always Available)

- Browser engine
- Tab management
- Offline storage
- Offline AI
- Privacy engine

### Optional (L2 Cold-Load)

- Cloud gateway (enhancements)
- Real-time sync (if online)
- External APIs (optional)

**Result:** Works offline, enhanced when online.

---

## LAUNCH STRATEGY

### Phase 1: Internal Use (NOW)

- Daily usage by you
- Fix pain points immediately
- Stability testing

### Phase 2: Closed Beta (50-100 users)

- Target: Students, researchers, privacy users
- Metrics: Crashes, RAM, offline usefulness
- Feedback: UI clarity, confusion points

### Phase 3: Public Beta

- After stability proven
- Limited marketing
- Organic growth

### Phase 4: Production

- Full feature set
- Marketing
- Scaling

---

## SUCCESS METRICS

### Technical

- ✅ < 0.1% crash rate
- ✅ RAM usage < Chrome
- ✅ Offline functionality 100%
- ✅ Privacy guarantees verified

### User

- ✅ Daily active usage
- ✅ Offline usefulness (works without internet)
- ✅ Privacy trust (Ghost mode tested)
- ✅ Multilingual adoption

---

**END OF BLUEPRINT**
