# Hugging Face Integration Testing Guide

**Status:** ✅ Test Suite Created

---

## 🧪 Test Suites

### 1. Node.js Test Script
**File:** `scripts/test-huggingface-integration.js`

**Run:**
```bash
npm run test:huggingface
```

**Tests:**
- ✅ Hugging Face API status check
- ✅ Single embedding generation
- ✅ Batch embedding generation
- ✅ Chat completion streaming
- ✅ Redix status with Hugging Face
- ✅ Redix /ask endpoint with Hugging Face

**Requirements:**
- Backend server must be running on `http://localhost:8000`

---

### 2. Python Test Script
**File:** `apps/api/test_huggingface.py`

**Run:**
```bash
cd apps/api
python test_huggingface.py
```

**Tests:**
- ✅ API key configuration check
- ✅ Hugging Face API availability
- ✅ Single embedding generation
- ✅ Batch embedding generation
- ✅ Chat completion streaming

**Requirements:**
- `HUGGINGFACE_API_KEY` environment variable set
- Python dependencies installed (`pip install -r requirements.txt`)

---

### 3. Playwright E2E Tests
**File:** `tests/integration/huggingface-test.ts`

**Run:**
```bash
npm run test:e2e tests/integration/huggingface-test.ts
```

**Tests:**
- ✅ Status endpoint
- ✅ Embedding generation
- ✅ Batch embedding
- ✅ Chat streaming
- ✅ Redix integration

---

## 🚀 Quick Start Testing

### Step 1: Set API Key

Make sure your `.env` file has:
```bash
HUGGINGFACE_API_KEY=your_huggingface_api_key_here
```

### Step 2: Start Backend Server

```bash
cd apps/api
python -m uvicorn main:app --reload
```

### Step 3: Run Tests

**Option A: Node.js Test (requires backend running)**
```bash
npm run test:huggingface
```

**Option B: Python Test (standalone)**
```bash
cd apps/api
python test_huggingface.py
```

**Option C: Playwright E2E**
```bash
npm run test:e2e tests/integration/huggingface-test.ts
```

---

## 📊 Expected Results

### ✅ All Tests Pass
- API key is configured
- Hugging Face API is accessible
- Embeddings are generated (384 dimensions)
- Chat completion streams tokens
- Redix integration works

### ⚠️ Partial Pass
- API key missing → Status test fails, others skip
- API unavailable → Tests skip gracefully
- Network issues → Tests fail with error messages

### ❌ Tests Fail
- Backend not running → Node.js test fails immediately
- Invalid API key → API returns 401/403 errors
- Rate limiting → API returns 429 errors

---

## 🔧 Troubleshooting

### Backend Not Running
```bash
# Start backend
cd apps/api
python -m uvicorn main:app --reload
```

### API Key Not Found
```bash
# Check .env file
cat .env | grep HUGGINGFACE

# Or set in environment
export HUGGINGFACE_API_KEY=your_key_here
```

### API Unavailable
- Check internet connection
- Verify API key is valid at https://huggingface.co/settings/tokens
- Check Hugging Face API status: https://status.huggingface.co/

### Import Errors
```bash
# Install Python dependencies
cd apps/api
pip install -r requirements.txt
```

---

## 📝 Test Output Examples

### Successful Test Run
```
🚀 Starting Hugging Face Integration Tests
============================================================

✅ API key found: hf_gSYOuH...

📊 Testing Hugging Face Status...
   Available: True
   Has API Key: True
✅ Hugging Face API is available

🔢 Testing Embedding Generation...
✅ Embedding generation passed
   Dimensions: 384
   First 5 values: [0.1234, -0.5678, 0.9012, ...]

📦 Testing Batch Embedding...
✅ Batch embedding passed
   Count: 3
   Dimensions: 384

💬 Testing Chat Completion...
   Streaming response:
Hello from Hugging Face!
✅ Chat completion passed

============================================================
📊 Test Results Summary:
============================================================

✅ Status Check: PASS
✅ Embedding: PASS
✅ Batch Embedding: PASS
✅ Chat Completion: PASS

📈 Overall: 4/4 tests passed

🎉 All tests passed! Hugging Face integration is working correctly.
```

---

## 🎯 Next Steps

After running tests:

1. **If all tests pass**: Integration is working! You can use Hugging Face features.
2. **If some tests fail**: Check the error messages and troubleshoot.
3. **If API key is missing**: Add it to `.env` and restart the backend.

---

**Test Suite Ready!** 🚀

