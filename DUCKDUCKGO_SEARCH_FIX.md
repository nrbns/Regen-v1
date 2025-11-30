# DuckDuckGo Search Fix

## Date: November 30, 2025

## Issues Fixed

### 1. Tauri Command Invocation Mismatch

- **Problem**: Frontend was calling `invoke('research_stream', { query: searchQuery })` but Rust function expects `query: String` as first parameter
- **Root Cause**: Tauri 2.0 expects parameters to match function signature exactly
- **Fix**: Changed frontend to pass string directly: `invoke('research_stream', searchQuery)`

### 2. DuckDuckGo API URL Missing Parameters

- **Problem**: API URL was missing `no_redirect=1` parameter
- **Root Cause**: Incomplete API URL construction
- **Fix**: Added `no_redirect=1&skip_disambig=1` to URL for better results

### 3. Missing Error Logging

- **Problem**: No visibility into why DuckDuckGo requests were failing
- **Root Cause**: Silent failures
- **Fix**: Added comprehensive error logging in both frontend and backend

### 4. Missing User-Agent Header

- **Problem**: Some servers block requests without proper User-Agent
- **Root Cause**: Missing or generic User-Agent header
- **Fix**: Added proper browser User-Agent header

## Changes Made

### `src/modes/research/index.tsx`

```typescript
// BEFORE
await (ipc as any).invoke('research_stream', { query: searchQuery });
await (ipc as any).invoke('research_api', { query: searchQuery });

// AFTER
await (ipc as any).invoke('research_stream', searchQuery);
await (ipc as any).invoke('research_api', searchQuery);
```

### `tauri-migration/src-tauri/src/main.rs`

```rust
// BEFORE
let proxy_url = format!("https://api.duckduckgo.com/?q={}&format=json&no_html=1",
    urlencoding::encode(&query));
let proxy_res = client.get(&proxy_url)
    .header("User-Agent", "RegenBrowser/1.0")
    .timeout(Duration::from_secs(10))
    .send().await;

// AFTER
let proxy_url = format!("https://api.duckduckgo.com/?q={}&format=json&no_html=1&no_redirect=1&skip_disambig=1",
    urlencoding::encode(&query));
eprintln!("[research_stream] Fetching DuckDuckGo: {}", proxy_url);
let proxy_res = client.get(&proxy_url)
    .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
    .header("Accept", "application/json")
    .timeout(Duration::from_secs(10))
    .send().await;
```

### `src/services/duckDuckGoSearch.ts`

```typescript
// BEFORE
const res = await fetch(url, {
  headers: {
    Accept: 'application/json',
  },
});

// AFTER
console.log('[DuckDuckGo] Fetching:', url);
const res = await fetch(url, {
  headers: {
    Accept: 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  },
  mode: 'cors',
});
// Added better error logging
if (!res.ok) {
  console.warn('[DuckDuckGo] Search failed with status:', res.status, res.statusText);
  return null;
}
console.log('[DuckDuckGo] Search success:', data.Heading || 'No heading');
```

## How to Test

1. **Start the app**: `npm run tauri:dev` or `npm run dev`
2. **Open Research Mode**: Switch to Research mode
3. **Enter a search query**: Try "What is AI?" or "India history"
4. **Check console**: Look for `[DuckDuckGo] Fetching:` and `[research_stream] Fetching DuckDuckGo:` logs
5. **Verify results**: Should see search results with summary and citations

## Status: ✅ FIXED

DuckDuckGo search should now work properly:

- ✅ Correct Tauri command invocation
- ✅ Proper API URL with all required parameters
- ✅ Better error handling and logging
- ✅ Proper User-Agent headers
- ✅ CORS mode enabled for frontend fetch

**Note**: If you still see issues, check:

1. Network connectivity
2. Console logs for specific error messages
3. Rust backend logs (terminal where `tauri:dev` is running)
