# AI Bridge Service

Local offline AI inference bridge for Regen Browser.

## Quick Start

1. **Install dependencies:**
```bash
cd server/ai-bridge
npm ci
```

2. **Set up authentication token:**
```bash
echo "LOCAL_DEV_TOKEN" > .bridge_token
```

3. **Start the service:**
```bash
node index.js
```

4. **Verify health:**
```bash
curl http://127.0.0.1:4300/health
```

## Configuration

Set environment variables or create `.env`:

```bash
# Provider: mock, llama_cpp, ollama, openai
LLM_PROVIDER=mock

# Model path (for llama_cpp)
MODEL_PATH=/path/to/model.gguf

# Ollama configuration
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b

# OpenAI configuration (cloud fallback)
OPENAI_API_KEY=sk-...

# Server port
AI_BRIDGE_PORT=4300

# Authentication token (or use .bridge_token file)
AI_BRIDGE_TOKEN=your-token-here
```

## API Endpoints

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "provider": "mock",
  "modelPath": null,
  "version": "0.1.0",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### POST /v1/chat
Chat completion endpoint.

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
```

**Request:**
```json
{
  "messages": [
    { "role": "user", "content": "Hello, how are you?" }
  ],
  "model": "default",
  "temperature": 0.7,
  "max_tokens": 1000
}
```

**Response:**
```json
{
  "choices": [{
    "message": {
      "role": "assistant",
      "content": "Response text here"
    },
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 50,
    "total_tokens": 60
  },
  "model": "default",
  "provider": "mock",
  "latency_ms": 150
}
```

### GET /v1/models
List available models.

**Response:**
```json
{
  "models": [
    {
      "id": "default",
      "name": "Default Model",
      "path": "/path/to/model.gguf",
      "size": null,
      "format": "gguf"
    }
  ]
}
```

## Providers

### Mock Provider
Default provider for testing. Returns mock responses.

```bash
LLM_PROVIDER=mock
```

### Ollama Provider
Uses local Ollama installation.

```bash
LLM_PROVIDER=ollama
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
```

### OpenAI Provider
Cloud fallback using OpenAI API.

```bash
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-3.5-turbo
```

### Llama.cpp Provider
Direct integration with llama.cpp (coming soon).

```bash
LLM_PROVIDER=llama_cpp
MODEL_PATH=/path/to/model.gguf
LLAMA_CPP_DIR=/path/to/llama.cpp
```

## Development

```bash
# Run in watch mode
npm run dev

# Run tests
npm test
```

## Security

- Always use authentication token in production
- Token can be set via `AI_BRIDGE_TOKEN` env var or `.bridge_token` file
- Service binds to `127.0.0.1` by default (localhost only)


