# API Keys Guide - RegenBrowser

## Overview

RegenBrowser supports **offline-first** mode (no API keys needed) and **online mode** (optional API keys for advanced features).

## Quick Start

1. **Copy example.env**: `cp example.env .env`
2. **For offline mode**: No keys needed! Just install Ollama.
3. **For online features**: Add API keys to `.env` file.

---

## 🆕 NEW APIs (Added in Latest Version)

These are the **new APIs** that were added for the latest features:

### 1. **Ollama (Local AI) - NEW** ⭐

- **Status**: NEW - Core feature
- **Required**: Yes (for offline AI)
- **Setup**: Install from https://ollama.com/download
- **No API Key Needed**: Runs locally
- **Usage**:
  ```bash
  ollama pull phi3:mini
  ollama pull llava:7b
  ```
- **Environment Variables**:
  - `OLLAMA_BASE_URL=http://localhost:11434` (default)
  - `OLLAMA_ORIGINS=*` (auto-set by app)

### 2. **Vision APIs (GPT-4 Vision / llava) - NEW** ⭐

- **Status**: NEW - For WISPR vision features
- **Required**: Optional (offline uses llava:7b)
- **Options**:
  - **Offline**: Uses Ollama's llava:7b (no key needed)
  - **Online**: OpenAI GPT-4 Vision (requires key)
- **Get Key**: https://platform.openai.com/api-keys
- **Environment Variable**: `OPENAI_API_KEY=sk-...`

### 3. **Grammar Correction (Ollama phi3:mini) - NEW** ⭐

- **Status**: NEW - For auto-grammar feature
- **Required**: No (uses local Ollama)
- **No API Key Needed**: Uses phi3:mini locally
- **Usage**: Auto-injected into all webviews

### 4. **Trade Signals (Ollama) - NEW** ⭐

- **Status**: NEW - For auto-trade signals
- **Required**: No (uses local Ollama)
- **No API Key Needed**: Uses phi3:mini for analysis
- **Usage**: Auto-analyzes charts every 30 seconds

### 5. **Zerodha Trading API - NEW** ⭐

- **Status**: NEW - For auto trade execution
- **Required**: Optional (for real trading)
- **Get Keys**: https://kite.trade/apps/
- **Environment Variables**:
  - `ZERODHA_API_KEY=your-key`
  - `ZERODHA_API_SECRET=your-secret`
  - `ZERODHA_ACCESS_TOKEN=your-token`

---

## 📋 EXISTING APIs (From Previous Versions)

These APIs were already in the codebase:

### 1. **OpenAI API** (Existing)

- **Status**: Existing - For GPT-4, GPT-3.5
- **Required**: Optional
- **Get Key**: https://platform.openai.com/api-keys
- **Environment Variable**: `OPENAI_API_KEY=sk-...`

### 2. **Anthropic Claude API** (Existing)

- **Status**: Existing - For Claude Sonnet
- **Required**: Optional
- **Get Key**: https://console.anthropic.com/
- **Environment Variable**: `ANTHROPIC_API_KEY=sk-ant-...`

### 3. **Groq API** (Existing)

- **Status**: Existing - For fast inference
- **Required**: Optional
- **Get Key**: https://console.groq.com/
- **Environment Variable**: `GROQ_API_KEY=gsk_...`

### 4. **Hugging Face API** (Existing)

- **Status**: Existing - For model hosting
- **Required**: Optional
- **Get Key**: https://huggingface.co/settings/tokens
- **Environment Variable**: `HUGGINGFACE_API_KEY=hf_...`

### 5. **Analytics APIs** (Existing)

- **Sentry**: Error tracking
- **PostHog**: Analytics
- **Status**: Optional monitoring

---

## 🎯 Recommended Setup

### For Most Users (Offline Mode)

```bash
# No API keys needed!
# Just install Ollama and pull models
ollama pull phi3:mini
ollama pull llava:7b
```

### For Power Users (Online Mode)

```bash
# Add to .env:
OPENAI_API_KEY=sk-...          # For GPT-4 Vision
ANTHROPIC_API_KEY=sk-ant-...   # For Claude Sonnet
GROQ_API_KEY=gsk_...           # For fast inference
```

### For Traders

```bash
# Add to .env:
ZERODHA_API_KEY=...
ZERODHA_API_SECRET=...
ZERODHA_ACCESS_TOKEN=...
FINNHUB_API_KEY=...            # For real-time market data
```

---

## 📝 Summary

| API                | Status   | Required | Key Needed | New?     |
| ------------------ | -------- | -------- | ---------- | -------- |
| **Ollama**         | Core     | Yes      | No         | ✅ NEW   |
| **GPT-4 Vision**   | Optional | No       | Yes        | ✅ NEW   |
| **Grammar (phi3)** | Core     | No       | No         | ✅ NEW   |
| **Trade Signals**  | Core     | No       | No         | ✅ NEW   |
| **Zerodha**        | Optional | No       | Yes        | ✅ NEW   |
| OpenAI             | Optional | No       | Yes        | Existing |
| Anthropic          | Optional | No       | Yes        | Existing |
| Groq               | Optional | No       | Yes        | Existing |
| HuggingFace        | Optional | No       | Yes        | Existing |

---

## 🔒 Security Notes

1. **Never commit `.env`** - It's in `.gitignore`
2. **Keep keys secret** - Don't share publicly
3. **Rotate regularly** - Change keys every 90 days
4. **Use environment-specific keys** - Dev/staging/prod

---

## 📚 More Info

- See `example.env` for all available options
- See `README.md` for setup instructions
- See `docs/` for detailed documentation
