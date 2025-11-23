# Omni Engine

Core AI, workflow, and command execution service. Can be used by Electron, Brave fork, or any client.

## Architecture

Omni Engine is a **platform-agnostic service** that:

- Processes natural language commands via AI
- Plans execution sequences
- Manages workflows
- Exposes HTTP/WebSocket API

Clients (Electron, Brave, mobile) call the engine via API, keeping all AI logic centralized.

## API Endpoints

### POST `/api/command`

Process a natural language command.

**Request:**

```json
{
  "command": "Search for best laptops under 50K and open top 3",
  "context": {
    "url": "https://example.com",
    "title": "Example Page",
    "tabId": "tab-123"
  },
  "mode": "research",
  "language": "en"
}
```

**Response:**

```json
{
  "success": true,
  "plan": {
    "steps": [
      {
        "action": "search",
        "params": { "query": "best laptops under 50K" },
        "description": "Search for: best laptops under 50K"
      },
      {
        "action": "openTabs",
        "params": { "count": 3 },
        "description": "Open top 3 results"
      }
    ]
  },
  "result": {
    "type": "openTabs",
    "urls": ["https://...", "https://...", "https://..."],
    "count": 3
  }
}
```

### GET `/api/workflows`

List all workflows.

### GET `/api/workflows/:id`

Get a specific workflow.

### POST `/api/workflows/:id/run`

Run a workflow.

## WebSocket

Connect to `ws://localhost:3030/ws` for real-time updates.

**Send:**

```json
{
  "type": "command",
  "payload": {
    "command": "Scroll down",
    "context": { "tabId": "tab-123" }
  }
}
```

**Receive:**

```json
{
  "type": "result",
  "data": {
    "success": true,
    "plan": { ... }
  }
}
```

## Usage

### Start Engine

```bash
cd packages/omni-engine
npm install
npm run dev  # Development
npm start    # Production
```

Engine runs on `http://localhost:3030` by default.

### From Electron/Brave

```typescript
const response = await fetch('http://localhost:3030/api/command', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    command: 'Search for laptops',
    context: { url: window.location.href },
  }),
});

const result = await response.json();
// Execute plan.steps in browser
```

## Migration Strategy

1. **Phase 0**: Extract engine (this package)
2. **Phase 1**: Update Electron to use engine API
3. **Phase 2**: Build Brave fork that uses same engine
4. **Result**: All AI logic centralized, clients just execute plans
