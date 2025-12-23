# 📁 FINAL FOLDER STRUCTURE - Regen Browser OS

**Status:** LOCKED - This structure is final and must be adhered to.

---

## ROOT STRUCTURE

```
regen/
├── src/                      # React UI (frontend only, no state ownership)
│   ├── components/           # React components (UI rendering only)
│   ├── hooks/                # React hooks (IPC calls to Rust)
│   ├── state/                # Zustand stores (UI cache/sync layer, NOT source of truth)
│   ├── lib/                  # TypeScript utilities, IPC client
│   ├── modes/                # Mode-specific UI (Browse, Research, Trade)
│   └── ...
│
├── src-tauri/                # Rust backend (source of truth)
│   ├── src/
│   │   ├── main.rs           # Tauri app entry point
│   │   ├── lib.rs            # Library root (re-export modules)
│   │   ├── state.rs          # Application state (language, settings, active tabs list)
│   │   ├── browser.rs        # Tab manager + WebView lifecycle
│   │   ├── db.rs             # SQLite + FTS5 database
│   │   ├── search.rs         # Offline search (uses db.rs)
│   │   ├── ai.rs             # llama.cpp / Ollama integration
│   │   ├── agent.rs          # Intent detection + planner + tools
│   │   ├── privacy.rs        # Privacy mode enforcement (Normal/Private/Ghost)
│   │   ├── tor.rs            # TOR lifecycle (optional, per-tab)
│   │   ├── commands.rs       # Tauri IPC commands (exposed to frontend)
│   │   ├── handlers.rs       # Event handlers
│   │   ├── ipc.rs            # IPC utilities
│   │   └── services/
│   │       ├── global_shortcut_service.rs  # Global shortcuts
│   │       └── ollama_service.rs           # Ollama process spawner (if used)
│   │
│   ├── Cargo.toml            # Rust dependencies
│   └── tauri.conf.json       # Tauri configuration
│
├── models/                   # AI model files (optional, for bundled models)
│   └── README.md             # Instructions for model downloads
│
├── bin/                      # Binary assets (if any)
│   └── README.md
│
├── locales/                  # i18n JSON files
│   ├── en.json
│   ├── hi.json
│   └── ...
│
├── server/                   # Node.js L2/L3 services (cold-loaded only)
│   ├── agent-engine/         # L2: Agent orchestrator (keep)
│   └── jobs/                 # L3: Job recovery system (keep)
│
└── docs/                     # Documentation
    ├── ARCHITECTURE.md
    ├── TIERED_ARCHITECTURE.md
    └── ...
```

---

## FILE-BY-FILE EXPLANATION

### `src-tauri/src/state.rs`

**Purpose:** Application-wide state owned by Rust  
**Contains:**

- Language setting (`String` language code)
- Active tabs list (references to `browser.rs` TabManager)
- Privacy mode (Normal/Private/Ghost)
- App settings (startup behavior, telemetry opt-in, etc.)
- Mode state (Browse/Research/Trade)

**Why:** Frontend cannot modify this directly. All changes go through IPC commands.

---

### `src-tauri/src/browser.rs`

**Purpose:** Tab management + WebView lifecycle  
**Contains:**

- `TabManager` struct (owns all tab instances)
- `Tab` struct (id, url, title, privacy_mode, webview_handle)
- WebView creation/destruction (Tauri WebView API)
- Tab freeze/unload logic
- Crash recovery (safe mode after repeated crashes)

**Why:** Tabs are core browser functionality. Must be in Rust for performance and isolation.

---

### `src-tauri/src/db.rs`

**Purpose:** SQLite database + FTS5 full-text search  
**Contains:**

- Database initialization
- Schema (pages, history, bookmarks, notes)
- FTS5 virtual table setup
- Page cache operations (save, retrieve, delete)
- Migration system

**Why:** Offline-first requires local database. FTS5 enables fast offline search.

---

### `src-tauri/src/search.rs`

**Purpose:** Offline search functionality  
**Contains:**

- Search queries (calls `db.rs` FTS5)
- Search result ranking
- Multilingual search support
- Search history

**Why:** Search must work offline. Calls `db.rs` for actual queries.

---

### `src-tauri/src/ai.rs`

**Purpose:** Offline AI integration  
**Contains:**

- llama.cpp integration (or Ollama process spawner)
- Model loading/unloading
- Inference calls
- Token streaming (for real-time responses)

**Why:** AI must work offline. Rust owns model lifecycle.

---

### `src-tauri/src/agent.rs`

**Purpose:** Intent detection + planner + tool system  
**Contains:**

- Intent detection (offline)
- Planner (search/summarize/compare/act)
- Tool system (browser actions, notes, search)
- Offline-first decision logic

**Why:** Agent must act on tabs/files/pages, not just chat. Offline-first.

---

### `src-tauri/src/privacy.rs`

**Purpose:** Privacy mode enforcement  
**Contains:**

- Privacy mode enum (Normal/Private/Ghost)
- Ghost mode: Disk write blocking
- Private mode: Session-only storage
- TOR routing (per-tab, calls `tor.rs`)
- Fingerprint hardening

**Why:** Privacy must be enforced in Rust. UI cannot override enforcement.

---

### `src-tauri/src/tor.rs`

**Purpose:** TOR lifecycle management  
**Contains:**

- TOR process spawner (optional, per-tab)
- SOCKS5 proxy configuration
- Circuit establishment tracking
- TOR status monitoring

**Why:** Optional feature. Must be isolated and controllable per-tab.

---

### `src-tauri/src/commands.rs`

**Purpose:** Tauri IPC commands (frontend → Rust)  
**Contains:**

- `tabs:*` commands (create, delete, update, list, get_active)
- `settings:*` commands (get_language, set_language, etc.)
- `privacy:*` commands (get_mode, set_mode, get_tab_mode)
- `db:*` commands (init, search, save_page, get_page)
- `search:*` commands (query, history)
- `ai:*` commands (detect_intent, plan, execute_tool)
- `webview:*` commands (create, destroy, navigate)

**Why:** Frontend can only interact with Rust via IPC commands.

---

### `src/state/tabsStore.ts` (REFACTORED)

**Purpose:** UI cache/sync layer (NOT source of truth)  
**Contains:**

- Zustand store that caches tab list from Rust
- `useTabs()` hook that calls `invoke('tabs:list')` and caches
- Actions (`add`, `remove`, `update`) call Rust commands first, then update cache

**Why:** Zustand remains for UI reactivity, but Rust owns state.

---

### `src/state/settingsStore.ts` (REFACTORED)

**Purpose:** UI cache/sync layer (NOT source of truth)  
**Contains:**

- Zustand store that caches settings from Rust
- `useSettings()` hook that calls `invoke('settings:get_all')` and caches
- Actions call Rust commands first

**Why:** Settings UI needs reactivity, but Rust owns actual values.

---

## DEPENDENCIES

### `src-tauri/Cargo.toml`

```toml
[dependencies]
tauri = { version = "2", features = ["webview-all"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
tauri-plugin-shell = "2"
tauri-plugin-global-shortcut = "2"
tokio = { version = "1", features = ["macros", "rt-multi-thread"] }
which = "5"

# Database
rusqlite = { version = "0.31", features = ["bundled", "fts5"] }

# Optional: TOR (if implementing)
# arti-client = "0.7"

# Optional: llama.cpp Rust bindings (if not using Ollama binary)
# llama-cpp-rs = "0.1"
```

---

## RULES

1. **Rust owns ALL state** - Language, tabs, privacy, settings
2. **JS/React is UI only** - No state ownership, only IPC calls
3. **Zustand is cache layer** - Syncs from Rust, doesn't own
4. **Offline-first** - SQLite, no cloud dependency for core
5. **Privacy enforced in Rust** - UI cannot override
6. **WebView is native** - Tauri WebView, not iframes

---

**END OF FOLDER STRUCTURE**
