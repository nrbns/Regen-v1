# Redix Core - Green Intelligence Engine

**Regenerative AI backend for OmniBrowser/Regen**

Redix is the "Green Intelligence Engine" that powers ethical, eco-efficient AI in Regen Browser. It provides:

- **Model Fusion**: Auto-routes queries to best model (GPT/Claude/Mistral/Ollama)
- **Eco Scoring**: Calculates green score based on energy/tokens
- **Consent Ledger**: Tracks user consent for AI operations
- **Real-time Metrics**: System health with eco impact

## Quick Start

```bash
# Start Redix server
npm run dev:redix

# Or with custom port
REDIX_PORT=8001 npm run dev:redix
```

## API Endpoints

### `POST /ask`
Main AI query interface.

**Request:**
```json
{
  "query": "What is quantum computing?",
  "context": {
    "url": "https://example.com",
    "title": "Example Page"
  },
  "options": {
    "provider": "auto",
    "maxTokens": 500,
    "temperature": 0.7
  }
}
```

**Response:**
```json
{
  "text": "Quantum computing is...",
  "provider": "openai",
  "greenScore": 85,
  "latency": 1200,
  "tokensUsed": 150
}
```

### `GET /metrics`
System metrics with eco scoring.

**Response:**
```json
{
  "cpu": 25.5,
  "memory": 512.3,
  "greenScore": 90,
  "timestamp": 1700000000000
}
```

### `GET /health`
Health check endpoint.

## Architecture

- **Gateway** (`redix-core.ts`): Fastify server with CORS
- **Model Router**: Auto-selects best model for query type
- **LLM Adapter**: Unified interface for all providers
- **Eco Scorer**: Calculates green score (energy + tokens)

## Environment Variables

```bash
# Redix server
REDIX_PORT=8001
VITE_REDIX_CORE_URL=http://localhost:8001

# LLM providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
MISTRAL_API_KEY=...
OLLAMA_BASE_URL=http://localhost:11434
```

## Integration

Frontend calls Redix via `fetch`:

```typescript
const response = await fetch('http://localhost:8001/ask', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: 'Your question' }),
});
const data = await response.json();
```

## Roadmap

- [ ] SSE streaming for real-time responses
- [ ] Redis caching for faster responses
- [ ] JWT authentication
- [ ] Consent ledger persistence
- [ ] Model fusion with LangChain
- [ ] Zero-ETL for knowledge graphs

