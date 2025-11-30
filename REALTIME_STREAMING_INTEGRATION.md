# Real-Time Streaming Agent Integration

## Overview

The Regen browser now has **fully integrated real-time streaming** with automatic fallback to mock LLM when Ollama is unavailable.

## Architecture

```
Frontend (React)
    ↓ WebSocket
Tauri WebSocket Server (port 18080)
    ↓
Agent Orchestrator
    ├─→ Ollama (port 11434) [Primary]
    └─→ Mock LLM (port 4000) [Fallback]
```

## Components

### 1. Frontend WebSocket Client

**File:** `src/components/research/StreamingAgentSidebar.tsx`

- Connects to `ws://127.0.0.1:18080/agent_ws`
- Auto-reconnects with exponential backoff
- Falls back to Tauri events if WebSocket unavailable
- Displays real-time streaming events:
  - `agent_start` → Shows loading state
  - `partial_summary` → Appends text as it streams
  - `action_suggestion` → Shows action cards
  - `final_summary` → Complete summary with confidence
  - `agent_end` → Completion notification

### 2. Tauri WebSocket Server

**File:** `tauri-migration/src-tauri/src/websocket.rs`

- Listens on `ws://127.0.0.1:18080/agent_ws`
- Handles multiple concurrent connections
- Routes `start_agent` messages to agent orchestrator
- Broadcasts streaming events to connected clients

### 3. Agent Orchestrator

**File:** `tauri-migration/src-tauri/src/agent.rs`

**Streaming Flow:**

1. Receives `start_agent` request
2. Checks SQLite cache (instant if cached)
3. If not cached:
   - Tries Ollama streaming (primary)
   - Falls back to Mock LLM if Ollama unavailable
4. Streams tokens in real-time (every 5 tokens)
5. Chunks large documents (>4KB) progressively
6. Caches final result for future requests

**Rate Limiting:**

- One active stream per session/URL
- Returns `agent_busy` if duplicate request

### 4. Mock LLM Server

**File:** `server/mock-llm.js`

**Endpoints:**

- `POST /api/mock-llm/stream` - HTTP streaming (Ollama-like format)
- `WS /api/agent/ws` - WebSocket streaming (direct agent format)
- `GET /api/ping` - Health check

**Features:**

- Simulates realistic streaming (30ms per word)
- Returns Ollama-compatible JSON format
- Provides action suggestions
- Auto-starts on port 4000 when `DEV=true`

## Integration Flow

### Real-Time Streaming (Ollama Available)

```
User clicks "Run Agent"
    ↓
Frontend → WebSocket: { type: "start_agent", query: "...", url: "..." }
    ↓
Tauri WebSocket Server receives message
    ↓
Agent checks cache → Not found
    ↓
Agent calls Ollama: POST /api/generate (stream: true)
    ↓
Ollama streams tokens → Agent parses JSON lines
    ↓
Agent emits WebSocket events every 5 tokens:
    - partial_summary (text: "token")
    ↓
Frontend receives events → Updates UI in real-time
    ↓
Final summary → Cache saved → agent_end
```

### Fallback to Mock LLM (Ollama Unavailable)

```
User clicks "Run Agent"
    ↓
Frontend → WebSocket: { type: "start_agent", ... }
    ↓
Tauri WebSocket Server receives message
    ↓
Agent checks cache → Not found
    ↓
Agent tries Ollama → Connection failed
    ↓
Agent falls back to Mock LLM: POST /api/mock-llm/stream
    ↓
Mock LLM streams Ollama-like JSON:
    { "response": "word", "done": false }
    ↓
Agent parses and emits WebSocket events
    ↓
Frontend receives events → Updates UI
    ↓
Final summary → Cache saved → agent_end
```

## Configuration

### Environment Variables

```bash
# Ollama (Primary)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b

# Mock LLM (Fallback)
DEV=true
MOCK_LLM_PORT=4000
```

### Dev Scripts

```bash
# Start everything together
npm run dev:realtime

# Or separately:
npm run dev:mock-llm  # Mock LLM on port 4000
npm run dev:tauri      # Tauri + WebSocket on port 18080
```

## Event Types

### Agent Events (WebSocket Messages)

```typescript
// Start
{ type: "agent_start", payload: { query: string, url?: string } }

// Streaming
{ type: "partial_summary", payload: { text: string, chunk_index?: number, cached?: boolean } }

// Actions
{ type: "action_suggestion", payload: { id: string, action_type: string, label: string, ... } }

// Complete
{ type: "final_summary", payload: { summary: {...}, citations: number, confidence: number } }

// End
{ type: "agent_end", payload: { success: boolean, cached?: boolean } }

// Error
{ type: "error", payload: { message: string } }

// Busy
{ type: "agent_busy", payload: { message: string } }
```

## Performance

- **Latency:** ~300-800ms to first token
- **Streaming Rate:** ~33 words/second (mock), ~50-100 tokens/second (Ollama)
- **Cache Hit:** Instant (<10ms)
- **Chunking:** Automatic for documents >4KB
- **Rate Limiting:** Prevents duplicate requests

## Testing

### Test Real-Time Streaming

1. Start services:

   ```bash
   npm run dev:realtime
   ```

2. Open app and navigate to any webpage

3. Click "AI Agent" button (bottom right)

4. Enter query and click Play

5. Watch text stream in real-time:
   - Tokens appear as they arrive
   - Actions appear incrementally
   - Final summary with confidence

### Test Mock LLM Fallback

1. Stop Ollama (if running)

2. Start mock LLM:

   ```bash
   npm run dev:mock-llm
   ```

3. Run agent - should automatically use mock LLM

4. Verify streaming works identically

## Troubleshooting

### WebSocket Not Connecting

- Check Tauri logs: `[WebSocket] Server listening on ws://127.0.0.1:18080/agent_ws`
- Check browser console for connection errors
- Verify port 18080 is not blocked

### Mock LLM Not Responding

- Check mock LLM is running: `curl http://localhost:4000/api/ping`
- Verify `DEV=true` is set
- Check port 4000 is available

### No Streaming

- Check Ollama is running: `curl http://localhost:11434/api/tags`
- Check Tauri logs for agent errors
- Verify WebSocket connection in browser DevTools

## Next Steps

- [ ] Add OpenAI streaming support
- [ ] Add Anthropic streaming support
- [ ] Implement action execution via WebSocket
- [ ] Add streaming metrics/telemetry
- [ ] Optimize chunking for very large documents
