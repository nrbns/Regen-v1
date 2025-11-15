# Hugging Face Integration Guide

**Date:** $(date)  
**Status:** Fully Integrated ✅

---

## 🎯 Overview

Hugging Face API key has been integrated to enable local AI capabilities using Hugging Face Inference API. This provides:

- **Semantic Embeddings**: Real embeddings using `sentence-transformers/all-MiniLM-L6-v2`
- **Chat Completion**: LLM inference using models like `meta-llama/Meta-Llama-3-8B-Instruct`
- **Fallback Support**: Graceful fallback to Ollama or hash-based embeddings

---

## 🔑 API Key Configuration

### Environment Variable

Add your Hugging Face API key to `.env` file:

```bash
HUGGINGFACE_API_KEY=your_huggingface_api_key_here
```

### Optional Configuration

```bash
# Custom Hugging Face base URL (defaults to Inference API)
HUGGINGFACE_BASE_URL=https://api-inference.huggingface.co
```

---

## 📁 Files Created/Modified

### New Files
- `apps/api/huggingface_client.py` - Hugging Face client with embeddings and chat
- `apps/api/routes/huggingface.py` - API routes for Hugging Face endpoints
- `src/core/supermemory/huggingface-embedding.ts` - Frontend integration for embeddings
- `.env.example` - Example environment file with API key

### Modified Files
- `apps/api/main.py` - Added Hugging Face router
- `apps/api/routes/redix.py` - Integrated Hugging Face as primary AI backend
- `apps/api/routes/multi_hop_reasoning.py` - Added Hugging Face support
- `src/core/supermemory/embedding.ts` - Updated to use Hugging Face API

---

## 🚀 API Endpoints

### Embedding Generation

**POST** `/huggingface/embedding`

```json
{
  "text": "Your text here",
  "model": "sentence-transformers/all-MiniLM-L6-v2"
}
```

**Response:**
```json
{
  "embedding": [0.123, -0.456, ...],
  "dimensions": 384,
  "model": "sentence-transformers/all-MiniLM-L6-v2"
}
```

### Batch Embedding

**POST** `/huggingface/embedding/batch`

```json
{
  "texts": ["text1", "text2", "text3"],
  "model": "sentence-transformers/all-MiniLM-L6-v2"
}
```

### Chat Completion

**POST** `/huggingface/chat`

```json
{
  "messages": [
    {"role": "user", "content": "Hello!"}
  ],
  "model": "meta-llama/Meta-Llama-3-8B-Instruct",
  "temperature": 0.7,
  "max_tokens": 4096,
  "stream": true
}
```

**Response:** SSE stream with tokens

### Status Check

**GET** `/huggingface/status`

**Response:**
```json
{
  "available": true,
  "has_api_key": true
}
```

---

## 🔄 Integration Points

### 1. SuperMemory Embeddings

The embedding pipeline now uses Hugging Face by default:

```typescript
// src/core/supermemory/embedding.ts
export async function generateEmbedding(text: string): Promise<number[]> {
  // Tries Hugging Face first, falls back to hash-based
  const { generateHuggingFaceEmbedding } = await import('./huggingface-embedding');
  return await generateHuggingFaceEmbedding(text);
}
```

### 2. Redix AI Chat

The `/redix/ask` endpoint now prefers Hugging Face:

```python
# apps/api/routes/redix.py
hf = get_huggingface_client()
hf_available = await hf.check_available()

if hf_available:
    # Use Hugging Face for streaming
    async for chunk in hf.stream_chat(...):
        ...
else:
    # Fallback to Ollama
    async for chunk in ollama.stream_chat(...):
        ...
```

### 3. Multi-Hop Reasoning

Multi-hop reasoning now supports Hugging Face:

```python
# apps/api/routes/multi_hop_reasoning.py
ai_client = hf if hf_available else ollama
steps = await decompose_query(request.query, ai_client)
```

---

## 🎯 Features

### ✅ Semantic Embeddings
- Real 384-dimensional embeddings using `all-MiniLM-L6-v2`
- Batch embedding support for multiple texts
- Automatic fallback to hash-based embeddings if API unavailable

### ✅ Chat Completion
- Streaming support for real-time responses
- Multiple model support (configurable)
- Graceful error handling

### ✅ Fallback Chain
1. **Hugging Face API** (primary)
2. **Ollama** (secondary, if available)
3. **Hash-based embeddings** (tertiary, always available)

---

## 🔧 Usage Examples

### Generate Embedding (Frontend)

```typescript
import { generateHuggingFaceEmbedding } from './core/supermemory/huggingface-embedding';

const embedding = await generateHuggingFaceEmbedding("Your text here");
console.log(`Embedding dimensions: ${embedding.length}`); // 384
```

### Generate Embedding (Backend)

```python
from apps.api.huggingface_client import get_huggingface_client

hf = get_huggingface_client()
embedding = await hf.generate_embedding("Your text here")
print(f"Embedding dimensions: {len(embedding)}")  # 384
```

### Chat Completion (Backend)

```python
from apps.api.huggingface_client import get_huggingface_client

hf = get_huggingface_client()
messages = [{"role": "user", "content": "Hello!"}]

async for chunk in hf.stream_chat(messages=messages):
    if chunk.get("text"):
        print(chunk["text"], end="", flush=True)
    if chunk.get("done"):
        break
```

---

## 🛠️ Troubleshooting

### API Key Not Working

1. Check `.env` file has `HUGGINGFACE_API_KEY` set
2. Verify API key is valid at https://huggingface.co/settings/tokens
3. Check API status: `GET /huggingface/status`

### Model Loading Timeout

- Some models take time to load on first use
- Increase timeout in `huggingface_client.py` if needed
- Consider using smaller/faster models

### Fallback to Hash Embeddings

- If Hugging Face is unavailable, system automatically falls back
- Check logs for error messages
- Verify API key and network connectivity

---

## 📊 Performance

- **Embedding Generation**: ~200-500ms per text (API dependent)
- **Batch Embeddings**: More efficient for multiple texts
- **Chat Streaming**: Real-time token streaming
- **Fallback**: Instant hash-based embeddings if API unavailable

---

## 🔒 Security

- API key stored in `.env` file (not committed to git)
- Key passed via HTTP headers (Bearer token)
- No key exposure in frontend code
- Secure HTTPS communication with Hugging Face API

---

## ✅ Integration Complete!

All AI features now support Hugging Face as the primary backend:

- ✅ Embeddings use Hugging Face API
- ✅ Chat completion uses Hugging Face models
- ✅ Multi-hop reasoning supports Hugging Face
- ✅ Graceful fallback to Ollama/hash-based
- ✅ Status checking and error handling

**Everything works locally with your Hugging Face API key!** 🚀

