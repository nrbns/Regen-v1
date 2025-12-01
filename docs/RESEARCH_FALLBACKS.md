# Research Mode Fallback Chain

## Overview

Research Mode now has a robust 4-tier fallback system to ensure queries always get answered, even if one service fails.

## Fallback Order

### 1. 🦆 DuckDuckGo (Primary - Free, No API Key)
- **Status**: Always tried first
- **Pros**: Free, real search results, structured data
- **Cons**: Limited to public web data
- **Use Case**: General queries, comparisons, factual information

### 2. 🤖 OpenAI GPT-4o-mini (Fallback 1)
- **Status**: Used if DuckDuckGo fails AND `OPENAI_API_KEY` is set
- **Model**: `gpt-4o-mini` (cost-effective, fast)
- **Pros**: High quality, multilingual, good reasoning
- **Cons**: Requires API key, costs money
- **Setup**: Add to `.env`:
  ```env
  OPENAI_API_KEY=sk-your-openai-api-key-here
  ```

### 3. 🧠 Claude 3.5 Sonnet (Fallback 2)
- **Status**: Used if OpenAI fails AND `ANTHROPIC_API_KEY` is set
- **Model**: `claude-3-5-sonnet-20241022`
- **Pros**: Excellent reasoning, long context, safe outputs
- **Cons**: Requires API key, costs money
- **Setup**: Add to `.env`:
  ```env
  ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key-here
  ```

### 4. 🦙 Ollama llama3.2:3b (Final Fallback - Offline)
- **Status**: Always available as last resort
- **Model**: `llama3.2:3b` (local, offline)
- **Pros**: Free, offline, private, no API limits
- **Cons**: Lower quality than GPT-4/Claude, requires local setup
- **Setup**: Auto-starts on app launch, auto-pulls model

## How It Works

```rust
// 1. Try DuckDuckGo
if duckduckgo_success {
    return results;
}

// 2. Try OpenAI (if API key available)
if openai_key_set && openai_success {
    return results;
}

// 3. Try Claude (if API key available)
if claude_key_set && claude_success {
    return results;
}

// 4. Fallback to Ollama (always available)
return ollama_results;
```

## API Key Detection

The system automatically detects API keys from:
1. `.env` file (loaded via `dotenv` crate)
2. System environment variables
3. Keys are validated (not empty, not placeholder values)

## Streaming Support

All providers support real-time streaming:
- **DuckDuckGo**: Instant results (no streaming needed)
- **OpenAI**: Server-Sent Events (SSE) streaming
- **Claude**: Server-Sent Events (SSE) streaming
- **Ollama**: Native streaming API

## Example Usage

### With API Keys (Best Quality)
```env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

Query: "Compare Nifty vs BankNifty"
1. DuckDuckGo → Real search results
2. If fails → OpenAI → High-quality analysis
3. If fails → Claude → Excellent reasoning
4. If fails → Ollama → Offline fallback

### Without API Keys (Free Mode)
```env
# No API keys needed
```

Query: "Compare Nifty vs BankNifty"
1. DuckDuckGo → Real search results
2. If fails → Ollama → Offline fallback

## Benefits

1. **Always Works**: At least Ollama will respond (offline)
2. **Best Quality**: Uses best available service
3. **Cost Effective**: Free by default, paid only if needed
4. **Privacy**: Falls back to local Ollama if preferred
5. **Resilient**: Multiple fallbacks ensure reliability

## Configuration

### Enable OpenAI
1. Get API key from https://platform.openai.com/api-keys
2. Add to `.env`:
   ```env
   OPENAI_API_KEY=sk-your-key-here
   ```
3. Restart app

### Enable Claude
1. Get API key from https://console.anthropic.com/
2. Add to `.env`:
   ```env
   ANTHROPIC_API_KEY=sk-ant-your-key-here
   ```
3. Restart app

### Use Only Ollama (Offline Mode)
- Don't set any API keys
- Ollama will be used after DuckDuckGo fails
- Works completely offline

## Testing

```bash
# Test with API keys
OPENAI_API_KEY=sk-... cargo tauri dev

# Test without API keys (free mode)
cargo tauri dev

# Test offline (disconnect internet)
# → Should fallback to Ollama
```

## Status

✅ **All fallbacks implemented and working!**

- ✅ DuckDuckGo integration
- ✅ OpenAI streaming
- ✅ Claude streaming
- ✅ Ollama fallback
- ✅ Environment variable loading
- ✅ Automatic key detection




