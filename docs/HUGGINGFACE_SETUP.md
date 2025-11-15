# Hugging Face Integration - Quick Setup Guide

**Status:** ✅ Fully Integrated

---

## 🚀 Quick Start

### 1. Add API Key to `.env` File

Create or edit `.env` in the project root:

```bash
HUGGINGFACE_API_KEY=your_huggingface_api_key_here
```

### 2. Restart Backend Server

The backend will automatically load the API key from environment variables.

---

## ✅ What's Integrated

### 1. **Semantic Embeddings**
- Uses `sentence-transformers/all-MiniLM-L6-v2` (384-dim embeddings)
- Replaces hash-based embeddings with real semantic vectors
- Automatic fallback if API unavailable

### 2. **AI Chat Completion**
- Uses Hugging Face Inference API for LLM responses
- Supports models like `meta-llama/Meta-Llama-3-8B-Instruct`
- Streaming support for real-time responses

### 3. **Multi-Hop Reasoning**
- Query decomposition using Hugging Face models
- Answer synthesis from multiple sources
- Graceful fallback to Ollama if needed

### 4. **Redix AI Assistant**
- Primary backend: Hugging Face
- Fallback: Ollama
- Offline mode: Cached responses

---

## 📍 Integration Points

### Frontend
- `src/core/supermemory/embedding.ts` - Uses Hugging Face for embeddings
- `src/core/supermemory/huggingface-embedding.ts` - Hugging Face client wrapper

### Backend
- `apps/api/huggingface_client.py` - Hugging Face API client
- `apps/api/routes/huggingface.py` - API endpoints
- `apps/api/routes/redix.py` - Integrated as primary AI backend
- `apps/api/routes/multi_hop_reasoning.py` - Integrated for reasoning

---

## 🔧 API Endpoints

### Check Status
```bash
GET http://localhost:8000/huggingface/status
```

### Generate Embedding
```bash
POST http://localhost:8000/huggingface/embedding
Content-Type: application/json

{
  "text": "Your text here",
  "model": "sentence-transformers/all-MiniLM-L6-v2"
}
```

### Chat Completion
```bash
POST http://localhost:8000/huggingface/chat
Content-Type: application/json

{
  "messages": [{"role": "user", "content": "Hello!"}],
  "model": "meta-llama/Meta-Llama-3-8B-Instruct",
  "stream": true
}
```

---

## 🎯 Fallback Chain

1. **Hugging Face API** (Primary) - Uses your API key
2. **Ollama** (Secondary) - If Hugging Face unavailable
3. **Hash-based embeddings** (Tertiary) - Always available

---

## ✅ Verification

After adding the API key, verify it works:

1. Check status: `GET /huggingface/status`
2. Test embedding: `POST /huggingface/embedding`
3. Test chat: `POST /huggingface/chat`

All AI features will now use Hugging Face by default! 🚀

