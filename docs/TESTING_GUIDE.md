# Testing Guide for OmniBrowser

## Overview

This guide covers all testing procedures for OmniBrowser, including LLM Assistant and AI Search features.

---

## 🚀 Quick Start

### 1. Start the API Server

Before running tests, ensure the FastAPI server is running:

```bash
cd apps/api
python -m uvicorn main:app --reload --port 8000
```

Or use the dev script:

```bash
npm run dev:all
```

### 2. Run Tests

```bash
# Check API health
npm run test:api-health

# Test LLM Assistant features
npm run test:llm-assistant

# Test all functionality
npm run test:all

# Test AI offline fallback
npm run test:ai-offline

# Test Hugging Face integration
npm run test:huggingface

# Test OpenAI integration
npm run test:openai
```

---

## 📋 Test Suites

### 1. API Health Check

**Script:** `scripts/test-api-health.js`

**Purpose:** Verifies API server is running and endpoints are accessible.

**Tests:**
- ✅ Root endpoint (`/`)
- ✅ Extract endpoint (`/extract/extract`)
- ✅ LLM Assistant endpoints (`/llm/*`)
- ✅ Search endpoints (`/search`, `/search/ai-search`)

**Usage:**
```bash
npm run test:api-health
```

---

### 2. LLM Assistant Tests

**Script:** `scripts/test-llm-assistant.js`  
**Python:** `apps/api/test_llm_assistant.py`

**Purpose:** Tests all LLM Assistant features including page extraction, ask about page, and summarization.

**Tests:**
- ✅ Page Content Extraction
- ✅ Ask About Page (with streaming)
- ✅ Page Summarization (with streaming)
- ✅ General LLM Assistant
- ✅ AI Search with Summary
- ✅ Search with Summary

**Usage:**
```bash
# Node.js version
npm run test:llm-assistant

# Python version
cd apps/api
python test_llm_assistant.py
```

**Expected Output:**
```
🧪 Starting LLM Assistant & AI Search Tests

📄 Testing Page Extraction...
✅ Page extraction successful
   Title: TypeScript - Wikipedia
   Content length: 15234 chars
   Language: en

❓ Testing Ask About Page...
✅ Ask about page successful
   Answer length: 245 chars
   Preview: TypeScript is a programming language developed by Microsoft...

📝 Testing Page Summarization...
✅ Page summarization successful
   Summary length: 198 chars
   Summary: TypeScript is a statically typed superset of JavaScript...

🤖 Testing LLM Assistant...
✅ LLM Assistant successful
   Model: gpt-4o-mini
   Response length: 312 chars

🔍 Testing AI Search...
✅ AI Search successful
   Total results: 15
   Summary length: 187 chars

🔎 Testing Search with Summary...
✅ Search with summary successful
   Total results: 20
   Sources used: duckduckgo, bing
   Summary: TypeScript best practices include...

==================================================
📊 Test Results Summary
==================================================
✅ Passed: 6/6
❌ Failed: 0/6

🎉 All tests passed!
```

---

### 3. AI Offline Tests

**Script:** `scripts/test-ai-offline.js`

**Purpose:** Tests fallback mechanisms when AI services are unavailable.

**Tests:**
- ✅ Ollama local fallback
- ✅ Error handling
- ✅ User-friendly error messages

**Usage:**
```bash
npm run test:ai-offline
```

---

### 4. Integration Tests

**Script:** `tests/integration/`

**Purpose:** End-to-end integration tests using Playwright.

**Tests:**
- ✅ Electron app smoke tests
- ✅ Backend API tests
- ✅ Full workflow tests

**Usage:**
```bash
npm run test:e2e
npm run test:smoke
npm run test:backend
```

---

## 🧪 Manual Testing

### Test Page Extraction

```bash
curl -X POST http://localhost:8000/extract/extract \
  -H "Content-Type: application/json" \
  -d '{"url": "https://en.wikipedia.org/wiki/TypeScript"}'
```

### Test Ask About Page

```bash
curl -X POST http://localhost:8000/llm/ask-about-page \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://en.wikipedia.org/wiki/TypeScript",
    "question": "What is TypeScript?",
    "stream": true
  }'
```

### Test Page Summarization

```bash
curl -X POST http://localhost:8000/llm/summarize-page \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://en.wikipedia.org/wiki/TypeScript",
    "style": "concise",
    "max_words": 200
  }'
```

### Test AI Search

```bash
curl -X POST http://localhost:8000/search/ai-search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "React performance optimization",
    "max_results": 10,
    "include_summary": true,
    "stream": false
  }'
```

### Test Search with Summary

```bash
curl -X POST http://localhost:8000/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "TypeScript best practices",
    "max_results": 15,
    "include_summary": true,
    "summary_length": 150
  }'
```

---

## 🔍 Debugging Tests

### Check API Server Status

```bash
curl http://localhost:8000/
```

Expected response:
```json
{
  "message": "OmniBrowser API v1.0",
  "status": "ok"
}
```

### Check Environment Variables

Ensure these are set in `.env` or `example.env`:

```bash
OPENAI_API_KEY=sk-...
HUGGINGFACE_API_KEY=hf_...
OLLAMA_BASE_URL=http://localhost:11434
BING_API_KEY=...
```

### View API Logs

When running the API server, logs will show:
- Request/response details
- AI backend selection
- Error messages
- Fallback triggers

---

## 📊 Test Coverage

### Week 3: LLM Assistant
- ✅ Page Content Extraction
- ✅ Ask About Page
- ✅ Page Summarization
- ✅ General LLM Assistant
- ✅ Multi-backend support (OpenAI, Hugging Face, Ollama)
- ✅ Streaming responses
- ✅ Error handling and fallbacks

### Week 4: AI Search
- ✅ Search Aggregator (DuckDuckGo + Bing)
- ✅ AI Summarization Pipeline
- ✅ Source Ranking
- ✅ Deduplication
- ✅ Domain Authority Scoring
- ✅ Streaming Search Results

---

## 🐛 Troubleshooting

### API Server Not Starting

**Problem:** `Connection refused` or `All connection attempts failed`

**Solution:**
1. Check if port 8000 is in use: `netstat -ano | findstr :8000` (Windows) or `lsof -i :8000` (Mac/Linux)
2. Start the server: `cd apps/api && python -m uvicorn main:app --reload --port 8000`
3. Check Python dependencies: `pip install -r apps/api/requirements.txt`

### AI Services Not Available

**Problem:** Tests fail with "AI services unavailable"

**Solution:**
1. Check API keys in `.env` file
2. For OpenAI: Verify API key is valid and has quota
3. For Hugging Face: Verify API key is valid
4. For Ollama: Start local Ollama server: `ollama serve`

### Streaming Tests Fail

**Problem:** SSE stream parsing errors

**Solution:**
1. Check response headers include `Content-Type: text/event-stream`
2. Verify SSE format: `data: {...}\n\n`
3. Check network connectivity

---

## 📝 Writing New Tests

### Test Structure

```javascript
async function testFeature() {
  console.log('\n🧪 Testing Feature...');
  try {
    const response = await fetch(`${API_URL}/endpoint`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ /* test data */ }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Feature test successful');
    return true;
  } catch (error) {
    console.error('❌ Feature test failed:', error.message);
    return false;
  }
}
```

### Test Checklist

- [ ] Test happy path
- [ ] Test error cases
- [ ] Test edge cases
- [ ] Test with invalid input
- [ ] Test with missing parameters
- [ ] Test streaming responses (if applicable)
- [ ] Test fallback mechanisms (if applicable)

---

## 🎯 Continuous Integration

Tests are run automatically in CI/CD:

```yaml
# .github/workflows/ci.yml
- name: Run Tests
  run: |
    npm run test:api-health
    npm run test:llm-assistant
    npm run test:all
```

---

## 📚 Additional Resources

- [FastAPI Testing](https://fastapi.tiangolo.com/tutorial/testing/)
- [Playwright Testing](https://playwright.dev/docs/intro)
- [Jest Testing](https://jestjs.io/docs/getting-started)

---

**Last Updated:** November 15, 2025  
**Status:** ✅ Complete




