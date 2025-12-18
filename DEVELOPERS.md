# 👨‍💻 Developer Guide - Regen Architecture

Welcome to Regen's internals. This guide is for engineers who want to understand or contribute to the codebase.

---

## 🏗️ Architecture Overview

Regen is built as a **three-layer AI browser**:

```
┌─────────────────────────────────────────┐
│ 🎨 UI Layer (React 18)                  │
│ - Modes (WISPR, Research, Trade, Docs)  │
│ - Components (JobTimeline, ActionLogs)  │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ 🧠 AI Runtime (LangChain + LLM)         │
│ - Agentic workflows (ReAct pattern)     │
│ - Streaming callbacks                   │
│ - Memory & context management           │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ 🔧 Browser Shell (Electron + Tauri)    │
│ - Tabs, history, storage                │
│ - IPC bridges                           │
│ - Offline fallback                      │
└─────────────────────────────────────────┘
```

---

## 📁 Folder Structure

```
/src                       # Frontend React app
  /components             # Reusable UI components
  /hooks                  # React hooks (useJobProgress, useSessionRestore)
  /services              # API clients (redixClient, socketClient)
  /state                 # Zustand state stores
  /modes                 # UI for each mode (WISPR, Research, Trade)

/server                   # Backend Node.js / Fastify
  /agents               # LangChain agent workflows
  /langchain-agents.ts  # Agent pipeline (research, code, ethics)
  /agentStreamingBridge.ts  # Socket.IO integration for streaming
  /realtime.ts          # Redis + Socket.IO setup
  /streamingWorker.ts   # Job execution with streaming

/apps
  /desktop             # Electron wrapper
  /web                 # Web version

/tests                 # Test suites
  /e2e                # Playwright smoke tests
  /unit               # Jest unit tests
  /integration        # Socket.IO + realtime tests
```

---

## 🧠 How AI Works (Critical Path)

### 1. User speaks voice command
```
WISPR hotkey (Ctrl+Space) → Voice recognition → Parse intent
```

### 2. Agent workflow starts
```
getAgenticWorkflowEngine()
  ↓
researchWorkflow() or multiAgentWorkflow()
  ↓
LangChain ReAct loop:
  - THINK: Plan next action
  - ACT: Execute tool (search, code, etc)
  - OBSERVE: Get result
  - REPEAT until done
```

### 3. Streaming to UI (Token-by-Token)
```
Agent streaming callback
  ↓
createAgentStreamCallback() (server/agentStreamingBridge.ts)
  ↓
Socket.IO emit: 'model:chunk', 'job:progress', 'job:completed'
  ↓
JobTimelinePanel listens → Shows tokens + step progress
```

---

## 🔑 Key Components You'll Touch

### Frontend

**`src/components/realtime/JobTimelinePanel.tsx`**
- Shows running AI jobs
- Displays tokens as they stream in
- Shows step progress (Thinking → Searching → Writing)

**`src/hooks/useJobProgress.ts`**
- Listens to Socket.IO `job:progress` events
- Updates UI with streaming state
- Auto-saves progress to sessionStorage

**`src/hooks/useSessionRestore.tsx`**
- Survives page reload
- Persists job state + last sequence
- 1-hour session timeout

**`src/services/realtime/streamingBridge.ts`**
- Standardizes token-by-token streaming
- Exported helpers: `createStreamingHandler()`, `emitStreamChunk()`
- Used by AIResponsePane, EnhancedAIPanel, ResearchPane

### Backend

**`server/langchain-agents.ts`**
- Main agent orchestration
- Workflows: `researchWorkflow()`, `multiAgentWorkflow()`, `ragWorkflow()`
- Each workflow accepts `streamCallback?: StreamCallback`

**`server/agentStreamingBridge.ts`**
- Converts LangChain callbacks → Socket.IO events
- Maps agent steps (thinking/searching/writing) to progress
- Publishes to Redis for multi-server scaling

**`server/redix-core.ts`**
- API endpoint: `POST /api/agent/query`
- Calls `getAgenticWorkflowEngine().runWorkflow()`
- Wires streaming callback if Socket.IO present

---

## 🚀 Quick Development Setup

```bash
# 1. Clone
git clone https://github.com/nrbns/Regenbrowser.git
cd Regenbrowser

# 2. Install
npm install

# 3. Set up environment
cp example.env .env.local
# Add your API keys (OpenAI, etc)

# 4. Start dev server
npm run dev

# 5. Start Electron app
npm run dev:desktop

# 6. Run tests
npm run test:unit
npm run test:e2e
npm run test:realtime
```

---

## ✅ Critical Path Tests (What We Test)

We don't test everything. We test **critical paths**:

- ✅ Memory persistence (survives reload)
- ✅ AI request lifecycle (start → stream → complete)
- ✅ Mode switching (WISPR → Research → Trade)
- ✅ Offline fallback (agent works without internet)
- ✅ Session restore (recover job after crash)

See `tests/` for implementation.

---

## 🔗 Domain Boundaries (Interfaces)

All communication happens through **interfaces**:

```typescript
// Agent interface
interface IAgent {
  invoke(input: string): Promise<{ output: string; steps: Step[] }>;
}

// Memory store interface
interface IMemoryStore {
  save(jobId: string, data: any): Promise<void>;
  load(jobId: string): Promise<any>;
}

// Search provider interface
interface ISearchProvider {
  search(query: string): Promise<SearchResult[]>;
}
```

**Why?** Swapping implementations is trivial. You can:
- Use different LLMs (Ollama → OpenAI → Anthropic)
- Use different memory stores (sessionStorage → IndexedDB → cloud)
- Use different search (DuckDuckGo → Google → Bing)

---

## 🐛 Debugging Tips

### See AI thinking in real-time
```bash
# In browser console
useJobProgressStore.getState()  # See current job + step

# In terminal
tail -f server.log | grep "Agent"  # Agent logs
```

### Check streaming events
```typescript
// Add to JobTimelinePanel.tsx
socket.on('model:chunk', (event) => {
  console.log('[STREAM]', event.chunk.slice(0, 100));
});

socket.on('job:progress', (event) => {
  console.log('[STEP]', event.step);
});
```

### Test agent locally
```bash
# Direct invoke (no Socket.IO)
const engine = getAgenticWorkflowEngine();
const result = await engine.researchWorkflow('Test query', '', {});
console.log(result);
```

---

## 🎯 Adding a New Feature

### Example: Add new agent workflow

1. **Create workflow** in `server/langchain-agents.ts`:
```typescript
async myNewWorkflow(query: string, streamCallback?: StreamCallback) {
  if (streamCallback) {
    streamCallback({ type: 'step', content: 'thinking', ... });
  }
  
  // Do work
  
  if (streamCallback) {
    streamCallback({ type: 'token', content: result });
  }
}
```

2. **Wire streaming** in `server/redix-core.ts`:
```typescript
const callback = createAgentStreamCallback({ jobId, userId, io, redis });
const result = await engine.myNewWorkflow(query, callback);
```

3. **UI component** listens automatically (JobTimelinePanel already subscribed)

Done! Your workflow now streams step-by-step to the UI.

---

## 📚 Learning Resources

- **LangChain**: [js.langchain.com](https://js.langchain.com) (agents, tools, memory)
- **Socket.IO**: [socket.io](https://socket.io) (realtime events)
- **React Hooks**: [react.dev](https://react.dev) (custom hooks, state management)
- **Fastify**: [fastify.io](https://fastify.io) (HTTP server)

---

## 🤝 Good First Issues

Look for `good-first-issue` label in GitHub Issues. Examples:

- Add new AI tool (calculator, weather, stocks)
- Improve error messages
- Add unit test for critical path
- Fix UI alignment issue

---

## 📞 Questions?

- Check existing issues for similar questions
- Open a discussion if confused
- Pull requests get quick feedback

Thanks for contributing to Regen! 🙏

