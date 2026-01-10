# Regen Browser

A unique, intent-first, disciplined AI browser built on real-time architecture.

**Version:** v1 (Early Access)  
**Status:** ✅ Core systems implemented | ⚠️ Some features in preview

---

## What is Regen?

Regen is a browser that puts **intent resolution first** and **backend ownership of state**. Unlike browsers that promise AI magic, Regen is built on a **disciplined architecture** where:

- **Every user action** flows through a single entry point (`CommandController`)
- **Intent is explicitly resolved** before any AI is invoked
- **Navigation is backend-owned** - UI only reflects backend state
- **AI is opt-in only** - no automatic processing, no background embeddings
- **Security is built-in** - tool allowlist, permission prompts, audit logging

> **Core Philosophy:** "A browser should feel boring when it works — and invisible when it helps."

---

## ✅ What Actually Works (v1)

### Core Browser Features
- ✅ **Multi-tab browsing** - Tabs with WebView instances
- ✅ **Navigation** - Backend-controlled navigation lifecycle
- ✅ **Session restore** - Tabs persist across restarts
- ✅ **Tab management** - Add, close, switch tabs

### Intent-First Command System
- ✅ **Single entry point** - All actions route through `CommandController`
- ✅ **Intent resolution** - Explicit classification (NAVIGATE, SEARCH, SUMMARIZE, etc.)
- ✅ **Security guard** - Tool allowlist with permission prompts
- ✅ **Audit logging** - All actions logged for transparency

### AI Features (Opt-In Only)
- ✅ **Search & Summarize** - Explicit intent triggers AI summarization
- ✅ **Research Mode** - In-depth web research with source attribution
- ✅ **Text Analysis** - Analyze selected text (user-triggered only)
- ✅ **No automatic AI** - AI only runs on explicit user intent

### Workspace
- ✅ **Local storage** - AI outputs, notes, research results saved to localStorage
- ✅ **Persistent across restarts** - Data survives browser restarts
- ✅ **Manual save** - Explicit save actions, no auto-sync

### Task Runner (Preview)
- ⚠️ **Single-run tasks only** - No background automation, no loops
- ⚠️ **User-triggered** - Tasks run only when explicitly requested
- ⚠️ **Strict schema** - Tasks are predefined and validated
- ⚠️ **Labeled as Preview** - Not for production automation

---

## ⚠️ What's Preview/Experimental

### Memory System
- ⚠️ **Opt-in only** - Disabled by default, requires explicit user consent
- ⚠️ **No automatic memory** - Memory is not retrieved automatically
- ⚠️ **Local-only** - No sync, no cloud storage

### RAG (Retrieval-Augmented Generation)
- ⚠️ **Opt-in only** - Indexing disabled by default
- ⚠️ **Explicit triggers** - RAG only for RESEARCH intent
- ⚠️ **Source attribution** - Always shows sources used

### Offline Mode
- ⚠️ **Partial support** - Browser works offline, AI features require connection
- ⚠️ **Limited offline AI** - Some models can run locally via Ollama

---

## 🚫 What's NOT in v1 (But Might Be Later)

- ❌ **Autonomous agents** - No background automation, no self-triggering tasks
- ❌ **Cloud sync** - No workspace sync, no account system
- ❌ **Collaboration** - No shared workspaces, no real-time collaboration
- ❌ **Full offline AI** - Limited local model support
- ❌ **Browser extensions** - Not supported in v1
- ❌ **Mobile apps** - Desktop only (Tauri)

---

## Architecture

### Core Principles

1. **Single Execution Entry** - `CommandController` is the only entry point
2. **Backend-Owned State** - UI only renders backend state, never controls logic
3. **Intent-First** - Explicit intent resolution before AI invocation
4. **Opt-In AI** - No automatic processing, no background operations
5. **Security by Default** - Tool allowlist, permission prompts, audit logs

### Technical Stack

```
Frontend (React + TypeScript)
    ↕ IPC (Tauri) / Events (Web)
Backend Services
    ├── CommandController (Intent resolution & execution)
    ├── ToolGuard (Security & permissions)
    ├── BackendService (API abstraction)
    ├── WorkspaceStore (Local persistence)
    └── TaskRunner (Single-run tasks)
```

### Key Files

- `src/lib/command/CommandController.ts` - Single entry point for all commands
- `src/lib/security/ToolGuard.ts` - Tool allowlist and permission system
- `src/lib/backend/BackendService.ts` - Backend API abstraction
- `src/lib/workspace/WorkspaceStore.ts` - Local data persistence
- `src/lib/tasks/TaskRunner.ts` - Task execution (single-run only)

---

## Quick Start

### Prerequisites
- Node.js 18+
- Rust 1.70+ (for Tauri desktop app)
- Ollama (optional, for local AI features)

### Installation

```bash
git clone https://github.com/nrbns/Regenbrowser.git
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

## How to Use

### Basic Navigation
```
# In command bar:
google.com              # Navigate to URL
go to example.com       # Navigate to URL
navigate to github.com  # Navigate to URL
```

### Search & Summarize
```
# In command bar:
search TypeScript best practices
summarize              # Summarize current page
analyze                # Analyze selected text
```

### Research
```
# In command bar:
research quantum computing
investigate Rust memory safety
```

### AI Queries
```
# In command bar:
ai What is the difference between React and Vue?
ask ai Explain async/await in JavaScript
```

### Tasks (Preview)
```
# In command bar:
task summarize-page
run extract-links
```

---

## Security & Privacy

### Tool Allowlist
- Only registered tools can execute
- Dangerous operations (filesystem, exec) require explicit consent
- All tool executions are logged in audit trail

### Privacy-First
- **Memory is opt-in** - Disabled by default
- **RAG is opt-in** - No automatic indexing
- **No tracking** - Local-first, no telemetry
- **Explicit consent** - Permission prompts for sensitive operations

### Audit Log
- All actions logged with timestamp, tool name, and decision
- Audit log available in ToolGuard
- (TODO: Persistent file storage)

---

## Testing

### Run Tests
```bash
npm run test
```

### Manual Testing Checklist
- [ ] Create multiple tabs without crash
- [ ] Navigation works (back/forward/reload)
- [ ] Command bar processes intents correctly
- [ ] Security guard blocks unauthorized tools
- [ ] Workspace saves and restores data
- [ ] Tasks run only when explicitly triggered
- [ ] Browser works when AI backend is unavailable
- [ ] Memory/RAG features are opt-in only

---

## Current Status & Scores

Based on comprehensive audit (see `AUDIT.md`):

| Area | Score | Status |
|------|-------|--------|
| Execution Spine | 5.0/5 | ✅ Perfect |
| UI Trust Boundary | 4.75/5 | ✅ Excellent |
| Browser Core | 4.5/5 | ✅ Excellent |
| AI & RAG | 5.0/5 | ✅ Perfect |
| Workspace | 4.5/5 | ✅ Excellent |
| Task Runner | 5.0/5 | ✅ Perfect |
| Security | 5.0/5 | ✅ Perfect |
| Docs & Claims | 5.0/5 | ✅ Perfect |
| Performance | 5.0/5 | ✅ Perfect |

**Overall: 4.75/5** - ✅ **Ready for Launch** 🚀

---

## Roadmap

### v1.1 (Next)
- [ ] Persistent audit log storage
- [ ] Improved workspace UI
- [ ] Better error recovery
- [ ] Performance optimizations

### v1.2 (Future)
- [ ] Enhanced offline support
- [ ] More task templates
- [ ] Better RAG source attribution UI
- [x] Workspace export/import ✅ **COMPLETED**

### v2+ (Later)
- [ ] Resource governance (Redix)
- [ ] Advanced AI lifecycle management
- [ ] Self-healing capabilities
- [ ] Cloud sync (opt-in)
- [ ] Mobile apps

**No feature shipped before it's real.**

---

## Documentation

### Core Documentation
- **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)** - Complete API reference for all client-side libraries
- **[AUDIT.md](./AUDIT.md)** - Comprehensive technical audit and architecture details
- **[LEGACY_COMPONENTS.md](./LEGACY_COMPONENTS.md)** - Documentation of legacy components
- **[VALIDATION_CHECKLIST.md](./VALIDATION_CHECKLIST.md)** - Pre-launch validation checklist

### Architecture
- **[FINAL_IMPROVEMENTS_SUMMARY.md](./FINAL_IMPROVEMENTS_SUMMARY.md)** - Summary of all improvements made
- **[IMPROVEMENTS_COMPLETE.md](./IMPROVEMENTS_COMPLETE.md)** - Detailed improvements log

### Quick Start
- See `BUILD_AND_RUN.md` for setup instructions
- See `API_DOCUMENTATION.md` for developer API reference

---

## Contributing

We welcome contributions! Please read `CONTRIBUTING.md` first.

Key principles:
- **Discipline over magic** - Prefer explicit over implicit
- **Backend owns state** - UI is dumb, backend is smart
- **Intent-first** - Always resolve intent before executing
- **Opt-in AI** - Never assume user wants AI help
- **Security by default** - Allowlist tools, prompt for permissions

---

## License

MIT - Built with care, built for users, built to last.

---

## Credits

Built with:
- [React](https://react.dev/) - UI framework
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Tauri](https://tauri.app/) - Desktop app framework
- [Zustand](https://zustand-demo.pmnd.rs/) - State management
- [Vitest](https://vitest.dev/) - Testing

---

**Regen: A browser that respects your intent, protects your privacy, and doesn't pretend to be smarter than it is.**
