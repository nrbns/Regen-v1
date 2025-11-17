# Redix Green Intelligence Engine

Regenerative AI backend for OmniBrowser with eco-scoring, model fusion, and ethical consent tracking.

## Architecture

Redix follows a **Sense-Optimize-Regenerate** loop:

1. **Sense**: Collect device metrics (CPU, RAM, battery) and user context
2. **Optimize**: Route to best model (local Ollama for efficiency, cloud for complex tasks)
3. **Regenerate**: Generate output with eco-scoring and ethical checks

## Features

- ✅ Multi-model fusion (GPT, Claude, Ollama)
- ✅ Eco-scoring (green score 0-100)
- ✅ Consent ledger for ethical tracking
- ✅ Local-first with Ollama fallback
- ✅ WebSocket metrics streaming
- ✅ FastAPI with CORS support

## Setup

### 1. Install Dependencies

```bash
cd redix-core
pip install -r requirements.txt
```

### 2. Configure Environment

Create `.env` file:

```bash
OPENAI_API_KEY=your-key
ANTHROPIC_API_KEY=your-key
OLLAMA_BASE_URL=http://localhost:11434
REDIX_PORT=8000
```

### 3. Start Ollama (Optional but Recommended)

```bash
# Install Ollama: https://ollama.ai
ollama serve
ollama pull llama3.2
```

### 4. Run Redix

```bash
# Development
uvicorn main:app --reload --port 8000

# Production
uvicorn main:app --host 0.0.0.0 --port 8000
```

### 5. Docker (Alternative)

```bash
docker-compose up
```

## API Endpoints

### POST `/ask`
Single query with AI response

```bash
curl -X POST http://localhost:8000/ask \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is Redix?",
    "context": {"url": "https://example.com"},
    "options": {"useOllama": true}
  }'
```

### POST `/workflow`
Agentic workflows (RAG, research, multi-agent)

```bash
curl -X POST http://localhost:8000/workflow \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Research quantum computing",
    "workflowType": "rag",
    "options": {"useOllama": true}
  }'
```

### GET `/metrics`
Get current system metrics

```bash
curl http://localhost:8000/metrics
```

### WebSocket `/ws/metrics`
Real-time metrics streaming

```javascript
const ws = new WebSocket('ws://localhost:8000/ws/metrics');
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('CPU:', data.cpu, 'RAM:', data.ram);
};
```

### POST `/consent`
Log consent decision

```bash
curl -X POST http://localhost:8000/consent \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "action": "ai_summary",
    "approved": true
  }'
```

## Integration with OmniBrowser

The frontend already has integration points in:
- `src/components/SearchBar.tsx` - Uses `/ask` endpoint
- `src/components/layout/BottomStatus.tsx` - Uses `/workflow` endpoint
- `server/redix-core.ts` - TypeScript bridge (can be enhanced)

## Testing

```bash
# Run tests
pytest test_main.py

# Manual test
curl -X POST http://localhost:8000/ask \
  -H "Content-Type: application/json" \
  -d '{"query": "Hello Redix"}'
```

## Eco-Scoring

Green score calculation:
- **Local (Ollama)**: ~95-100 (excellent)
- **Cloud (GPT/Claude)**: ~70-90 (good)
- **Low battery**: -10 penalty
- **High CPU**: Energy penalty

## License

Part of OmniBrowser project.

