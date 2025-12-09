# AI Bridge Setup Guide

Complete guide for setting up and using the AI Bridge service.

## Quick Start

```bash
# 1. Setup
cd server/ai-bridge
npm ci
echo "LOCAL_DEV_TOKEN" > .bridge_token

# 2. Start
npm run dev:ai-bridge

# 3. Test
npm run test:ai-bridge

# 4. Use with UI
npm run dev:with-ai
# Navigate to: http://localhost:5173/ai-panel
```

## Providers

### Mock (Default)

- Always available
- No configuration needed
- Perfect for testing

### Ollama (Recommended)

```bash
# Install: https://ollama.com
ollama serve
ollama pull llama3.1:8b
export LLM_PROVIDER=ollama
```

### OpenAI

```bash
export LLM_PROVIDER=openai
export OPENAI_API_KEY=sk-...
```

## API Endpoints

- `GET /health` - Health check
- `POST /v1/chat` - Chat completion
- `GET /v1/models` - List models

See `server/ai-bridge/README.md` for full API documentation.
