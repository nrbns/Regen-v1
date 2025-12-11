# Redix Integration Guide

## Overview

Redix is the **Green Intelligence Engine** for Regen Browser - providing eco-scoring, model fusion, consent ledger, and optimization features. It's now fully integrated across both desktop and mobile platforms.

## What is Redix?

Redix is a regenerative AI system that provides:

1. **Eco-Scoring**: Calculate green scores for AI operations based on energy consumption
2. **Model Routing**: Intelligent provider selection (OpenAI, Anthropic, Ollama, Mistral)
3. **Streaming Queries**: Real-time AI responses via WebSocket or Server-Sent Events
4. **Memory Optimization**: Tab eviction, memory management, power modes
5. **Low-RAM Mode**: Aggressive optimization for resource-constrained devices

## Desktop Integration

### Components

- **Redix Mode Detection**: `src/lib/redix-mode.ts`
  - Checks localStorage, URL params, and environment variables
  - Provides configuration for Redix vs Full mode

- **WebSocket Client**: `src/services/redixWs.ts`
  - Real-time streaming queries
  - Automatic fallback to HTTP if WebSocket unavailable

- **Core Runtime**: `src/core/redix/runtime.ts`
  - Event log and state management
  - Memory pool and optimization

- **Hooks**:
  - `src/hooks/useEnhancedRedix.ts` - Enhanced Redix stats
  - `src/hooks/useRedixTabEviction.ts` - Tab management

- **Components**: `src/components/redix/`
  - BatteryIndicator, MemoryMonitor, PowerModeSelector, etc.

### Usage Example (Desktop)

```typescript
import { getRedixWS } from '../services/redixWs';

const redixWS = getRedixWS();

// Stream a query
const { cancel } = redixWS.request(
  'What is the weather today?',
  'session-id',
  { stream: true },
  message => {
    if (message.type === 'partial_result') {
      console.log('Token:', message.payload.text);
    } else if (message.type === 'final_result') {
      console.log('Complete:', message.payload);
    }
  }
);
```

## Mobile Integration

### Components

- **Mobile Client**: `src/mobile/utils/redixClient.ts`
  - HTTP and SSE streaming support
  - Mobile-optimized error handling
  - Fallback to main AI endpoint

- **React Hooks**: `src/mobile/hooks/useRedix.ts`
  - `useRedixQuery` - Simple query hook
  - `useRedixStream` - Streaming query hook
  - `useEcoScore` - Eco-score calculation

- **API Integration**: Redix endpoints in `src/mobile/utils/apiClient.ts`

### Usage Example (Mobile)

```typescript
import { useRedixQuery, useRedixStream } from '../../mobile';

// Simple query
function MyComponent() {
  const { data, loading, error, query } = useRedixQuery();

  const handleQuery = async () => {
    await query({
      query: 'Explain quantum computing',
      options: { provider: 'openai', maxTokens: 500 }
    });
  };

  return (
    <div>
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error.message}</p>}
      {data && <p>{data.text}</p>}
      <button onClick={handleQuery}>Ask Redix</button>
    </div>
  );
}

// Streaming query
function StreamingComponent() {
  const { stream, streamingText, loading } = useRedixStream();

  const handleStream = () => {
    stream(
      { query: 'Tell me a story' },
      (response) => console.log('Complete:', response)
    );
  };

  return (
    <div>
      {streamingText && <p>{streamingText}</p>}
      <button onClick={handleStream} disabled={loading}>
        Stream Query
      </button>
    </div>
  );
}
```

## Backend Integration

### API Endpoints

Redix is available via the FastAPI backend (`apps/api/main.py`):

- **POST `/api/redix/ask`** - Streaming AI query endpoint
- **POST `/api/redix/query`** - Non-streaming query
- **GET `/api/redix/health`** - Health check
- **POST `/api/redix/eco/score`** - Calculate eco score

### Standalone Server

Redix can also run as a standalone server:

```bash
npm run dev:redix  # Runs server/redix-core.ts on port 8001
```

### Configuration

Environment variables:

- `VITE_REDIX_MODE=true` - Enable Redix mode at build time
- `VITE_REDIX_HTTP_URL=http://localhost:8001/api` - Redix HTTP endpoint
- `VITE_REDIX_WS_URL=ws://localhost:8001/ws` - Redix WebSocket endpoint
- `VITE_DISABLE_REDIX=true` - Disable Redix completely

## Features

### 1. Eco-Scoring

Calculate green scores for AI operations:

```typescript
import { mobileRedix } from '../mobile';

const score = await mobileRedix.getEcoScore({
  provider: 'openai',
  tokens: 1000,
});

console.log(`Eco Score: ${score.score}/100`);
console.log(`Energy: ${score.energyWh} Wh`);
```

### 2. Provider Routing

Intelligent model selection:

- **Auto**: Automatically selects best available provider
- **OpenAI**: GPT models (code, general tasks)
- **Anthropic**: Claude models (research, analysis)
- **Ollama**: Local models (offline, privacy)
- **Mistral**: Alternative models

### 3. Streaming Support

Both desktop and mobile support streaming:

- **Desktop**: WebSocket for real-time streaming
- **Mobile**: Server-Sent Events (SSE) for streaming
- **Fallback**: HTTP POST if streaming unavailable

### 4. Memory Optimization

Redix mode provides aggressive memory management:

- Tab eviction (max 5 tabs in Redix mode)
- Memory pool management
- Power mode selection (Performance, Balanced, Eco)
- Battery-aware optimizations

## Testing

### Desktop

1. Start backend: `npm run dev:api`
2. Start frontend: `npm run dev`
3. Enable Redix mode: Set `localStorage.setItem('REDIX_MODE', 'true')` or add `?redix=true` to URL

### Mobile

1. Start backend: `npm run dev:api`
2. Test in mobile browser or PWA
3. Redix is automatically available via mobile client

## Troubleshooting

### Redix Not Connecting

1. Check if backend is running: `npm run dev:api`
2. Verify Redix routes are registered in `apps/api/main.py`
3. Check browser console for connection errors
4. Verify CORS settings allow mobile origin

### Mobile Not Working

1. Ensure API base URL is correct (defaults to `http://127.0.0.1:8000`)
2. For physical devices, use your computer's IP address instead of `127.0.0.1`
3. Check that mobile client falls back to main AI endpoint if Redix unavailable

### Streaming Not Working

1. WebSocket may not be available in some mobile browsers
2. Mobile client automatically falls back to SSE (Server-Sent Events)
3. If SSE unavailable, falls back to HTTP POST

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Frontend (Desktop)                │
│  ┌──────────────┐  ┌──────────────┐                │
│  │ Redix Mode   │  │ RedixWS      │                │
│  │ Detection    │  │ (WebSocket)  │                │
│  └──────────────┘  └──────────────┘                │
└─────────────────────────────────────────────────────┘
                       │ WebSocket
                       │ or HTTP
                       ▼
┌─────────────────────────────────────────────────────┐
│              FastAPI Backend (port 8000)            │
│  ┌──────────────────────────────────────────────┐  │
│  │ /api/redix/ask    - Streaming endpoint      │  │
│  │ /api/redix/query  - Query endpoint          │  │
│  │ /api/redix/eco/*  - Eco scoring             │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│            Redix Core (server/redix-core.ts)        │
│  ┌──────────────┐  ┌──────────────┐                │
│  │ Model Router │  │ Eco Scorer   │                │
│  │ LLM Adapter  │  │ Consent      │                │
│  └──────────────┘  └──────────────┘                │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                   Frontend (Mobile)                 │
│  ┌──────────────┐  ┌──────────────┐                │
│  │ Mobile Redix │  │ useRedix     │                │
│  │ Client       │  │ Hooks        │                │
│  └──────────────┘  └──────────────┘                │
└─────────────────────────────────────────────────────┘
                       │ HTTP/SSE
                       ▼
                   (Same Backend)
```

## Next Steps

1. ✅ Redix integrated on desktop
2. ✅ Redix integrated on mobile
3. ✅ API endpoints accessible
4. ⏳ Test on real mobile devices
5. ⏳ Add Redix settings UI for mobile
6. ⏳ Performance optimization for mobile

## Documentation

- Redix Mode: `src/lib/redix-mode.ts`
- Desktop Client: `src/services/redixWs.ts`
- Mobile Client: `src/mobile/utils/redixClient.ts`
- Mobile Hooks: `src/mobile/hooks/useRedix.ts`
- Backend: `server/redix-core.ts` and `apps/api/routes/redix.py`
