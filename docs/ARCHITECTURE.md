# 🏗️ Regen Browser - System Architecture

## Overview

Regen is a modern AI-powered browser built with Tauri, React, and Rust, designed for offline-first, multilingual use.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Regen Browser                         │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   UI Layer   │  │  Core Layer  │  │  AI Layer    │ │
│  │  (React)     │  │  (Services)  │  │  (On-Device) │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Browser Mode │  │ Search Mode  │  │ Agent Mode   │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Redix Mode   │  │ Offline RAG  │  │ Multilingual │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                           │
├─────────────────────────────────────────────────────────┤
│                    Runtime Layer                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Tauri      │  │   Electron   │  │    Web       │ │
│  │  (Native)    │  │  (Desktop)   │  │  (Browser)   │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## Component Architecture

### Frontend (React + TypeScript)

```
src/
├── components/          # UI Components
│   ├── search/         # Search UI
│   ├── browser/        # Browser UI
│   ├── agents/         # Agent UI
│   └── settings/       # Settings UI
├── modes/              # Browser Modes
│   ├── research/       # Research Mode
│   ├── trade/          # Trade Mode
│   └── docs/           # Document Mode
├── services/           # Business Logic
│   ├── productionSearch.ts
│   ├── localModelService.ts
│   └── researchAgent.ts
├── lib/                # Utilities
│   ├── hardware-detection.ts
│   ├── model-runner/
│   └── offline-store/
└── routes/             # Pages
    ├── Home.tsx
    ├── Settings.tsx
    └── ...
```

### Backend (Node.js + Fastify)

```
server/
├── api/                # API Endpoints
│   ├── search.ts
│   ├── summarize.ts
│   └── agent/
│       └── research.ts
├── agents/             # Agent System
│   ├── researchAgent.ts
│   ├── advanced-planner.ts
│   └── execution-engine.ts
└── lib/                # Utilities
    ├── cache.ts
    ├── extractors.ts
    └── ranker.ts
```

### Desktop Runtime (Tauri + Rust)

```
tauri-migration/src-tauri/src/
├── main.rs             # Tauri Entry Point
├── llama.rs            # On-Device AI
├── llama-server.rs     # Local Server
└── websocket.rs        # WebSocket Server
```

---

## Data Flow

### Search Flow

```
User Query
    ↓
Query Translation (if needed)
    ↓
Production Search API
    ↓
Multi-Source Retrieval (DDG, Brave, etc.)
    ↓
Content Extraction
    ↓
Ranking & Scoring
    ↓
Results + Summaries
    ↓
UI Display
```

### On-Device AI Flow

```
User Request
    ↓
Hardware Detection
    ↓
Runtime Selection (Native/WebGPU/WASM)
    ↓
Model Loading
    ↓
Inference
    ↓
Result + Fallback (if needed)
```

### Agent Execution Flow

```
User Intent
    ↓
Agent Planner
    ↓
Task Decomposition
    ↓
Step Execution (Parallel)
    ↓
Result Synthesis
    ↓
Report Generation
```

---

## Technology Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Vite** - Build tool
- **React Router** - Navigation
- **Zustand** - State management
- **Dexie** - IndexedDB
- **FlexSearch** - Local search

### Backend
- **Node.js** - Runtime
- **Fastify** - Web framework
- **cheerio** - HTML parsing
- **node-cache** - Caching
- **BullMQ** - Job queue (planned)

### Desktop
- **Tauri** - Desktop framework
- **Rust** - Native code
- **llama.cpp** - On-device AI

### AI/ML
- **llama.cpp** - On-device inference
- **@mlc-ai/web-llm** - Browser inference
- **FlexSearch** - Full-text search
- **Vector embeddings** - Semantic search

---

## Key Features Architecture

### Redix Mode

```
Redix Mode Enabled
    ↓
Hardware Detection
    ↓
Memory Profiling
    ↓
Module Blocklist
    ↓
Tab Eviction
    ↓
Cache Optimization
    ↓
Memory Reduction (<50%)
```

### Offline RAG

```
Document Storage (IndexedDB)
    ↓
Content Extraction
    ↓
Chunking
    ↓
Embedding Generation
    ↓
Vector Storage
    ↓
Hybrid Search (Keyword + Semantic)
    ↓
Context Retrieval
```

### Multilingual Support

```
User Query
    ↓
Language Detection
    ↓
Query Translation (if needed)
    ↓
Search/Process
    ↓
Response Translation (if needed)
    ↓
Display (i18n)
```

---

## Performance Optimizations

1. **Lazy Loading** - Route-based code splitting
2. **Dynamic Imports** - Heavy modules loaded on-demand
3. **Tab Eviction** - Unload inactive tabs
4. **Caching** - API responses, models, embeddings
5. **WebGPU Acceleration** - GPU-accelerated AI inference
6. **Redix Mode** - Low-RAM optimization

---

## Security & Privacy

1. **On-Device AI** - Local processing by default
2. **No Data Collection** - Privacy-first design
3. **Sandboxing** - Agent execution isolation
4. **CSP Headers** - Content Security Policy
5. **Input Sanitization** - XSS protection

---

## Deployment Architecture

### Desktop (Tauri)
- Single binary
- Bundled dependencies
- Auto-update support

### Web (Optional)
- Static hosting (Vercel/Netlify)
- Service workers for offline
- CDN for assets

---

## Future Enhancements

1. **Distributed Agents** - Multi-device coordination
2. **Edge Inference** - Regional AI nodes
3. **Sync** - Cross-device data sync
4. **Extensions** - Plugin system
5. **Mobile Apps** - iOS/Android

---

**Architecture designed for scalability, privacy, and performance.** 🚀


