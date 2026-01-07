# API Documentation - RegenBrowser

Complete API reference for RegenBrowser Tauri commands and frontend services.

## Tauri Commands

### Research

#### `research_stream(query: string)`

Stream research results for a query.

**Parameters:**

- `query` (string): Research query

**Events Emitted:**

- `research-start`: Research started
- `research-token`: Partial result token
- `research-metrics`: Citations and hallucination metrics
- `research-end`: Research completed

**Example:**

```typescript
import { invoke } from '@tauri-apps/api/core';
await invoke('research_stream', { query: 'Bitcoin price analysis' });
```

#### `research_api(query: string)`

Get research results synchronously.

**Returns:**

```typescript
{
  answer: string;
  summary: string;
  sources: Array<{ title: string; url: string }>;
  citations: number;
  hallucination: 'low' | 'medium' | 'high';
  query: string;
}
```

### Trade

#### `trade_stream(symbol: string)`

Stream live trading data and AI signals.

**Parameters:**

- `symbol` (string): Trading symbol (e.g., "NIFTY", "BANKNIFTY")

**Events Emitted:**

- `trade-price`: Price update
- `trade-stream-start`: Stream started
- `trade-token`: AI signal token
- `trade-stream-end`: Stream ended

#### `trade_api(symbol: string)`

Get current trading data.

**Returns:**

```typescript
{
  chart: {
    result: [{
      meta: {
        regularMarketPrice: number;
        regularMarketChangePercent: number;
      }
    }]
  }
}
```

### Search

#### `search_proxy(query: string)`

Proxy search query to DuckDuckGo (bypasses CORS).

**Returns:**

```typescript
{
  AbstractText: string;
  RelatedTopics: Array<{ Text: string; FirstURL: string }>;
}
```

### Agent

#### `research_agent(request: ResearchAgentRequest)`

Execute research agent.

**Parameters:**

```typescript
{
  query: string;
  url?: string;
  context?: string;
  mode?: 'local' | 'remote' | 'hybrid';
}
```

**Returns:**

```typescript
{
  agent_version: string;
  summary: {
    short: string;
    bullets: string[];
    keywords: string[];
  };
  actions: Array<{
    id: string;
    type: string;
    label: string;
    payload: any;
  }>;
  confidence: number;
  explainability: string;
  citations: number;
  hallucination: 'low' | 'medium' | 'high';
}
```

#### `execute_agent(request: ExecuteRequest)`

Execute agent actions.

**Parameters:**

```typescript
{
  actions: Array<{
    id: string;
    type: string;
    label: string;
    payload: any;
  }>;
  session_id?: string;
  user_id?: string;
}
```

### WebSocket API

#### Agent WebSocket (`ws://127.0.0.1:18080/agent_ws`)

**Message Format:**

```typescript
{
  type: 'start_agent' | 'ping';
  query?: string;
  url?: string;
  context?: string;
  mode?: string;
  session_id?: string;
}
```

**Response Events:**

- `connected`: Connection confirmed
- `agent_start`: Agent started
- `partial_summary`: Partial summary token
- `action_suggestion`: Action suggested
- `final_summary`: Final summary
- `agent_end`: Agent completed
- `error`: Error occurred
- `pong`: Ping response

## Frontend Services

### Search Services

#### `multiSourceSearch(query: string, options?)`

Multi-source search with fallback.

**Parameters:**

```typescript
{
  query: string;
  options?: {
    limit?: number;
    language?: string;
  };
}
```

**Returns:**

```typescript
Array<{
  title: string;
  url: string;
  snippet: string;
  source: string;
  score: number;
  domain: string;
}>;
```

#### `performLiveWebSearch(query: string, options?)`

Live web search using Bing/DuckDuckGo.

**Parameters:**

```typescript
{
  query: string;
  options?: {
    count?: number;
    language?: string;
    preferBing?: boolean;
  };
}
```

### Agent Client

#### `researchAgent(request: ResearchAgentRequest)`

Call research agent via Tauri.

#### `executeAgent(request: ExecuteRequest)`

Execute agent actions.

#### `researchAgentStream(request: ResearchAgentRequest)`

Start streaming agent research.

#### `onAgentEventStream(callback)`

Listen for agent events.

## IPC Typed Interface

All Tauri commands are available via the typed IPC interface:

```typescript
import { ipc } from './lib/ipc-typed';

// Research
await ipc.research.stream(query);
const result = await ipc.research.api(query);

// Trade
await ipc.trade.stream(symbol);
const quote = await ipc.trade.api(symbol);

// Search
const results = await ipc.search.proxy(query);

// Agent
const agentResult = await ipc.agent.research(request);
await ipc.agent.execute(request);
```

## Error Handling

All commands return promises that reject on error:

```typescript
try {
  const result = await ipc.research.api(query);
} catch (error) {
  console.error('Research failed:', error);
  // Handle error
}
```

## Events

Listen for Tauri window events:

```typescript
import { listen } from '@tauri-apps/api/event';

const unlisten = await listen('research-token', event => {
  console.log('Token:', event.payload);
});

// Cleanup
unlisten();
```

## Security

- All IPC commands are validated
- CSP is enforced in `tauri.conf.json`
- WebSocket connections are localhost-only
- API keys are stored securely (OS keychain)

## Rate Limiting

- Search: 10 requests/minute (DuckDuckGo)
- Trade: 1 request/second (Yahoo Finance)
- Agent: 5 concurrent requests max

## See Also

- `docs/API_CONFIG.md` - API key configuration
- `docs/TRADINGVIEW_API.md` - TradingView integration
- `src/lib/ipc-typed.ts` - Full TypeScript definitions
