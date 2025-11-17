# Redix Quick Start Guide

## 5-Minute Setup

### 1. Install Python Dependencies

```bash
cd redix-core
pip install -r requirements.txt
```

### 2. Configure API Keys

```bash
# Copy example env file
cp .env.example .env

# Edit .env and add your API keys
# At minimum, you need one of:
# - OPENAI_API_KEY (for GPT)
# - ANTHROPIC_API_KEY (for Claude)
# - Or start Ollama for local models
```

### 3. Start Ollama (Optional but Recommended)

```bash
# Install Ollama: https://ollama.ai
ollama serve

# Pull a model
ollama pull llama3.2
```

### 4. Run Redix

```bash
# Development mode
uvicorn main:app --reload --port 8000

# Production mode
uvicorn main:app --host 0.0.0.0 --port 8000
```

### 5. Test It

```bash
# Health check
curl http://localhost:8000/health

# Ask a question
curl -X POST http://localhost:8000/ask \
  -H "Content-Type: application/json" \
  -d '{"query": "What is Redix?"}'
```

## Integration with OmniBrowser

The frontend is already configured to use Redix:

1. **SearchBar** automatically uses `http://localhost:8000/ask`
2. **BottomStatus** uses `http://localhost:8000/workflow`
3. **Metrics** poll `http://localhost:8000/metrics`

Just start Redix and the frontend will connect automatically!

## Docker Alternative

```bash
# Start everything (Redix + Ollama + Redis)
docker-compose up

# Redix will be available at http://localhost:8000
```

## Troubleshooting

### "No models available"
- Check your `.env` file has API keys
- Or start Ollama: `ollama serve`

### "Ollama connection failed"
- Make sure Ollama is running: `ollama serve`
- Check `OLLAMA_BASE_URL` in `.env`

### Port already in use
- Change `REDIX_PORT` in `.env`
- Or use: `uvicorn main:app --port 8001`

## Next Steps

- Read `README.md` for full documentation
- Check `test_main.py` for examples
- See `REDIX_BACKEND_IMPLEMENTATION.md` for architecture

