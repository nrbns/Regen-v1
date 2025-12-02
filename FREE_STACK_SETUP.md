# Free Stack Setup Guide - Perplexity-Style Research Mode

## 🎯 Zero-Cost Architecture

This guide sets up a **100% free** research pipeline using:

- ✅ **Local LLM** (Ollama) - Unlimited usage
- ✅ **Brave Search API** - 2,000 queries/day free
- ✅ **Your own scraper** - Already implemented
- ✅ **Local reranker** - Free TF-IDF or HuggingFace

## 📋 Prerequisites

1. **Ollama installed** - https://ollama.ai
2. **Brave Search API key** (free) - https://api.search.brave.com/app/documentation/web-search/free-api
3. **Node.js** (already installed)

## 🚀 Step 1: Install Ollama

### Windows

```bash
# Download from https://ollama.ai/download
# Or use winget:
winget install Ollama.Ollama
```

### Mac/Linux

```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

## 🚀 Step 2: Pull Recommended Models

```bash
# Research summarization (fast, accurate)
ollama pull llama3.1

# Web reasoning (more factual)
ollama pull qwen2.5:14b

# Long responses & reasoning
ollama pull deepseek-r1:14b

# Multi-lingual (for Indian languages)
ollama pull gemma2:9b
```

**Note:** Start with `llama3.1` (8B) - it's fast and works great for research.

## 🚀 Step 3: Start Ollama Server

```bash
ollama serve
```

Keep this running. It will start on `http://localhost:11434` by default.

## 🚀 Step 4: Get Brave Search API Key

1. Go to https://api.search.brave.com/app/documentation/web-search/free-api
2. Sign up for free account
3. Get your API key (starts with `BSA...`)
4. Free tier: **2,000 queries/day**

## 🚀 Step 5: Update `.env` File

Add these to your `.env`:

```bash
# ============================================
# FREE STACK CONFIGURATION
# ============================================

# Ollama (Local LLM - FREE)
OLLAMA_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.1
LLM_PROVIDER=ollama

# Brave Search (FREE - 2k queries/day)
BRAVE_API_KEY=BSA_your_key_here
BRAVE_SEARCH_API_KEY=BSA_your_key_here

# Disable paid APIs (optional - for safety)
FORCE_OPENAI=false
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
BING_API_KEY=

# Reranker (optional - uses simple TF-IDF by default)
USE_HF_RERANKER=false
HUGGINGFACE_API_KEY=
```

## 🚀 Step 6: Test the Setup

### Test Ollama

```bash
curl http://localhost:11434/api/tags
# Should return list of installed models
```

### Test Brave Search

```bash
curl -X GET "https://api.search.brave.com/res/v1/web/search?q=test" \
  -H "X-Subscription-Token: YOUR_BRAVE_KEY"
```

### Test Research Pipeline

```bash
# Start server
npm run dev:server

# In another terminal, test research
curl -X POST http://localhost:3000/api/research/run \
  -H "Content-Type: application/json" \
  -d '{"query":"What is AI?","lang":"en","clientId":"test"}'
```

## 📊 Architecture Flow

```
User Query
    ↓
1. Brave Search API (FREE)
    → Get 20 results
    ↓
2. Your Scraper (FREE)
    → Extract clean text from URLs
    ↓
3. Local Reranker (FREE)
    → Pick top 5 most relevant
    ↓
4. Ollama LLM (FREE)
    → Generate summary with citations
    ↓
Response with Sources
```

## 🎯 Model Recommendations

| Use Case              | Model             | Size | Speed     |
| --------------------- | ----------------- | ---- | --------- |
| **General Research**  | `llama3.1`        | 8B   | ⚡ Fast   |
| **Factual/Technical** | `qwen2.5:14b`     | 14B  | 🐢 Slower |
| **Reasoning/Logic**   | `deepseek-r1:14b` | 14B  | 🐢 Slower |
| **Multi-lingual**     | `gemma2:9b`       | 9B   | ⚡ Fast   |

**Start with `llama3.1`** - best balance of speed and quality.

## 🔧 Advanced: HuggingFace Reranker (Optional)

If you want better reranking quality:

1. Get free HuggingFace API key: https://huggingface.co/settings/tokens
2. Add to `.env`:
   ```bash
   USE_HF_RERANKER=true
   HUGGINGFACE_API_KEY=hf_...
   ```

**Note:** Free tier has rate limits. Simple TF-IDF reranker works great for most cases.

## 🐛 Troubleshooting

### Ollama not starting?

```bash
# Check if running
curl http://localhost:11434/api/tags

# Restart Ollama
ollama serve
```

### Model not found?

```bash
# List installed models
ollama list

# Pull missing model
ollama pull llama3.1
```

### Brave Search 401 error?

- Check API key in `.env`
- Verify key starts with `BSA`
- Check free tier limit (2k/day)

### Research returns empty?

- Check Ollama is running: `curl http://localhost:11434/api/tags`
- Check Brave API key is set
- Check server logs for errors

## ✅ Verification Checklist

- [ ] Ollama installed and running
- [ ] At least one model pulled (e.g., `llama3.1`)
- [ ] Brave Search API key in `.env`
- [ ] `.env` has `LLM_PROVIDER=ollama`
- [ ] Server starts without errors
- [ ] Test research query works

## 🎉 You're Done!

Your research mode now runs **100% free** with:

- ✅ Unlimited LLM usage (local)
- ✅ 2,000 searches/day (Brave)
- ✅ No API costs
- ✅ No quota limits (except Brave's 2k/day)
- ✅ Full control over your data

## 📈 Scaling

If you need more than 2k searches/day:

1. Upgrade Brave Search (paid tier)
2. Or add more free sources (DuckDuckGo, Reddit, Wikipedia)
3. Or implement your own search scraper

For unlimited LLM usage, Ollama is already unlimited! 🚀
