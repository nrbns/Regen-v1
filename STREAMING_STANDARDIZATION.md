# Streaming Standardization Implementation

## Overview

All AI agent outputs (research, code generation, analysis, etc.) should emit `MODEL_CHUNK` events **token-by-token** instead of dumping full text responses at once.

This ensures:
- ✅ Users see **live output** (proves system is working)
- ✅ **Responsive UI** (tokens arrive as they're generated, not all at once)
- ✅ **Cancellable streams** (can stop processing mid-stream)
- ✅ **Resume-safe** (checkpoint at each token for page reload recovery)

## Architecture

```
AI Backend (Ollama/OpenAI)
    ↓ streams tokens
Socket.IO Server (realtime.ts)
    ↓ emits MODEL_CHUNK event per token
Web Client (socketClient.ts)
    ↓ receives model:chunk events
React Component (AIResponsePane, etc.)
    ↓ accumulates into streamingText
JobTimelinePanel + GlobalAIStatusBar
    ↓ displays live output
User sees token-by-token streaming
```

## Integration Checklist

### Frontend Components

Each AI output component should use `createStreamingHandler` or `wrapFetchStream`:

```tsx
// ❌ OLD (text dump):
const response = await aiEngine.ask(prompt);
setResponse(response);  // All at once

// ✅ NEW (token-by-token):
import { createStreamingHandler } from '@/services/realtime/streamingBridge';

const stream = createStreamingHandler(jobId);
const response = await aiEngine.ask(prompt, {
  onChunk: stream.onChunk,
  onComplete: stream.onComplete,
});
```

### Current Components to Update

1. **AIResponsePane** (`src/components/ai/AIResponsePane.tsx`)
   - Already streams from Redix, needs to emit MODEL_CHUNK events
   - Status: `readyToUpdate`

2. **EnhancedAIPanel** (`src/components/ai/EnhancedAIPanel.tsx`)
   - Needs streaming integration
   - Status: `readyToUpdate`

3. **AIDockPanel** (`src/components/ai/AIDockPanel.tsx`)
   - Needs streaming support
   - Status: `readyToUpdate`

4. **ResearchPane** (`src/components/research/ResearchPane.tsx`)
   - Uses `runResearchAgent` - needs streaming hooks
   - Status: `readyToUpdate`

5. **Backend Agent Handler** (`server/langchain-agents.ts`)
   - Multi-agent workflow needs streaming support
   - Status: `readyToUpdate`

## Usage Examples

### Example 1: Stream fetch response

```tsx
import { wrapFetchStream } from '@/services/realtime/streamingBridge';

const text = await wrapFetchStream(
  fetch(`/api/research?q=${query}`),
  jobId,
  (chunk) => setResponse(prev => prev + chunk)
);
```

### Example 2: Use streaming handler in component

```tsx
import { createStreamingHandler } from '@/services/realtime/streamingBridge';

function MyComponent() {
  const [output, setOutput] = useState('');
  const jobId = useRef(`job-${Date.now()}`);
  const stream = useRef(createStreamingHandler(jobId.current));

  const handleAsk = async () => {
    stream.current.reset();
    const response = await aiEngine.ask(prompt, {
      onChunk: async (chunk) => {
        stream.current.onChunk(chunk);
        setOutput(stream.current.getText());
      },
      onComplete: stream.current.onComplete,
    });
  };

  return (
    <div>
      <div>{output}</div>
      <button onClick={handleAsk}>Ask</button>
    </div>
  );
}
```

### Example 3: Stream from AsyncGenerator

```tsx
import { streamText } from '@/services/realtime/streamingBridge';

async function displayStream() {
  for await (const { chunk, index, isComplete } of streamText(promise, {
    jobId: 'job-123'
  })) {
    console.log(`Chunk ${index}: ${chunk}`);
    setOutput(prev => prev + chunk);
    
    if (isComplete) {
      console.log('Stream complete');
    }
  }
}
```

## Backend Integration (Node.js)

The realtime server (`server/realtime.ts`) already broadcasts MODEL_CHUNK events:

```ts
// When AI backend produces output
const chunk = 'hello world';
io.to(`job:${jobId}`).emit('model:chunk', {
  jobId,
  chunk,
  sequence: ++chunkIndex,
  timestamp: Date.now(),
});
```

Agents should emit chunks via Redis or direct Socket.IO:

```ts
// In langchain-agents.ts
async function streamingAgentWorkflow(..., onChunk) {
  // ...agent work...
  
  // Emit each chunk
  onChunk({ type: 'token', content: token });
}
```

## Socket Events

### Realtime event schema (packages/shared/events.ts):

```ts
// Emitted by server when AI generates tokens
socket.on('model:chunk', (data: {
  jobId: string;
  chunk: string;        // Single token/chunk
  sequence: number;     // For deduplication after reconnect
  timestamp: number;
  metadata?: {
    step?: 'thinking' | 'searching' | 'writing';
    model?: string;
    tokens_per_sec?: number;
  };
}));

// Complement events:
socket.on('job:progress', (data: {
  jobId: string;
  progress: number;     // 0-100
  step?: string;        // Current step
  metadata?: any;
}));

socket.on('job:completed', (data: {
  jobId: string;
  result?: any;
}));
```

## Measurement & Performance

Use `streamingTracker` to measure streaming performance:

```ts
import { streamingTracker } from '@/services/realtime/streamingBridge';

// Start tracking
streamingTracker.start(jobId);

// During streaming...
for (const chunk of chunks) {
  streamingTracker.addChunk(jobId, chunk);
}

// Get metrics
const result = streamingTracker.complete(jobId);
console.log(`Streamed at ${result.tokensPerSec.toFixed(1)} tokens/sec`);
```

Expected performance:
- **Local (Ollama)**: 10-50 tokens/sec
- **Remote (OpenAI)**: 30-100 tokens/sec
- **UI overhead**: <50ms per 10 chunks

## Rollout Plan

### Phase 1: Streaming Infrastructure (DONE)
- ✅ StreamingBridge module created
- ✅ Socket events defined
- ✅ Global AI Status Bar shows streaming state
- ✅ Job Timeline Panel shows chunks accumulating

### Phase 2: Component Updates (NEXT)
- [ ] Update AIResponsePane to use streamingBridge
- [ ] Update EnhancedAIPanel to emit chunks
- [ ] Update ResearchPane with streaming
- [ ] Test end-to-end: token → Socket → UI

### Phase 3: Backend Standardization (NEXT)
- [ ] Wrap langchain-agents with streaming
- [ ] Make Ollama/OpenAI streaming the default
- [ ] Add streaming to all agent types

### Phase 4: Optimization (FUTURE)
- [ ] Smart batching (send 5 tokens per event)
- [ ] Compression (gzip chunks for network efficiency)
- [ ] Prioritization (user-visible streams first)

## Testing

```bash
# Start realtime server
npm run dev:realtime

# Start web dev server
npm run dev:web

# In browser:
# 1. Open Network tab → WebSocket
# 2. Ask AI a question
# 3. Watch model:chunk events arrive per-token
# 4. Verify GlobalAIStatusBar shows streaming
# 5. Check JobTimelinePanel accumulates output
```

## Troubleshooting

**Issue**: No chunks appearing in JobTimelinePanel
- Check: Is socket connected? (GlobalAIStatusBar shows "streaming"?)
- Fix: Verify `VITE_SOCKET_URL` env points to realtime server

**Issue**: Chunks arriving all at once
- Check: Is backend batching chunks?
- Fix: Reduce batch size in AI bridge, emit per-token

**Issue**: Page reload loses streaming output
- Check: Are chunks saved to sessionStorage?
- Fix: Resume from `lastSequence` checkpoint

