# Developer Quickstart - Realtime Streaming

This guide shows how to run the realtime message bus and streaming agents for development.

## Prerequisites

- Node.js 18+
- Python 3.8+ (for agents)
- Ollama (optional, for local LLM)

## Quick Start (5 minutes)

### 1. Start the Realtime Bus

```bash
# Terminal 1: Start the message bus
node tools/realtime-bus/server.js
```

The bus will start on `ws://localhost:4002`. Check health:
```bash
curl http://localhost:4002/health
```

### 2. Start a Streaming Agent

```bash
# Terminal 2: Start the summarizer agent
node tools/agent/summarizer.js
```

This agent:
- Subscribes to `agent.requests`
- Streams summaries to `agent.summaries.<id>`

### 3. Start the Frontend

```bash
# Terminal 3: Start Vite dev server
npm run dev:web
```

### 4. Test Streaming

1. Open the Research Panel in the UI
2. Enter a query: "Summarize quantum computing"
3. Watch real-time streaming chunks appear!

## Architecture

```
┌─────────────┐
│   Browser   │──┐
│     UI      │  │
└─────────────┘  │
                 │ WebSocket
┌─────────────┐  │
│ Realtime    │◄─┘
│    Bus      │
│ (port 4002) │
└─────────────┘
       │
       ├─► Summarizer Agent
       ├─► Voice Agent
       ├─► Market Agent
       └─► Assistant/Orchestrator
```

## Message Channels

### Request Channels
- `agent.requests` - Research/summarize requests
- `voice.frames` - Audio frames for transcription
- `market.subscribe` - Market data subscriptions

### Response Channels
- `agent.summaries.<id>` - Streaming summaries
- `voice.transcripts.<id>` - Voice transcripts
- `market.updates.<symbol>` - Market price updates

## Adding a New Agent

1. Create `tools/agent/your-agent.js`:

```javascript
const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:4002');

ws.on('open', () => {
  // Subscribe to input channel
  ws.send(JSON.stringify({
    type: 'subscribe',
    channel: 'your.input.channel',
  }));
});

ws.on('message', (data) => {
  const msg = JSON.parse(data);
  if (msg.type === 'message') {
    // Process and publish response
    ws.send(JSON.stringify({
      type: 'publish',
      channel: 'your.output.channel',
      data: { /* your response */ },
    }));
  }
});
```

2. Start it: `node tools/agent/your-agent.js`

## Content Script Injection

The `src/content-scripts/extractor.js` script is injected into web pages to extract content.

### Manual Injection (Dev)

```javascript
// In browser console on any page:
const script = document.createElement('script');
script.src = chrome.runtime.getURL('extractor.js');
document.documentElement.appendChild(script);
```

### Tauri Integration

The Tauri bridge listens for `regen:extract` messages and publishes to the bus:

```rust
// In tauri-migration/src-tauri/src/main.rs
window.listen("regen:extract", |event| {
    // Publish to bus
    bus.publish("agent.requests", event.payload);
});
```

## Testing

### Test Bus Connection

```bash
# Using wscat (install: npm install -g wscat)
wscat -c ws://localhost:4002

# Then send:
{"type":"subscribe","channel":"test"}
{"type":"publish","channel":"test","data":{"message":"hello"}}
```

### Test Agent

```bash
# Publish a test request
node -e "
const ws = require('ws');
const client = new ws('ws://localhost:4002');
client.on('open', () => {
  client.send(JSON.stringify({
    type: 'publish',
    channel: 'agent.requests',
    data: { id: 'test-1', query: 'Test query', content: 'Test content' }
  }));
});
"
```

## Environment Variables

```bash
# Bus configuration
BUS_PORT=4002
BUS_HOST=0.0.0.0

# Agent configuration
BUS_URL=ws://localhost:4002

# Frontend configuration
VITE_BUS_URL=ws://localhost:4002
```

## Troubleshooting

### Bus not starting
- Check port 4002 is free: `lsof -i :4002`
- Check Node.js version: `node --version` (need 18+)

### Agent not connecting
- Verify bus is running: `curl http://localhost:4002/health`
- Check BUS_URL matches bus port

### No streaming in UI
- Check browser console for WebSocket errors
- Verify VITE_BUS_URL in `.env`
- Check bus metrics: `curl http://localhost:4002/metrics`

## Next Steps

1. **Add more agents**: Voice, market data, vision
2. **Complete CEF integration**: Native content extraction
3. **Add orchestrator**: Request routing and tool access
4. **Production hardening**: Auth, rate limiting, persistence

## Resources

- [WebSocket API Docs](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Realtime Bus Protocol](./BUS_PROTOCOL.md)
- [Agent Development Guide](./AGENT_DEVELOPMENT.md)

