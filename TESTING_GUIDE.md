# Testing Guide - Phase 1 & 2 Features

## 🧪 Quick Test Checklist

### 1. Tab State Management

**Test**: Open/close tabs rapidly, switch between tabs

- [ ] No null tab states
- [ ] Tab IDs are UUIDs
- [ ] Tab switching is smooth (<50ms)
- [ ] Session replay works

**How to test**:

```typescript
// Open DevTools Console
// Rapidly create/close tabs
for (let i = 0; i < 10; i++) {
  await ipc.tabs.create({ url: 'https://example.com' });
  await new Promise(r => setTimeout(r, 100));
  const tabs = await ipc.tabs.list();
  console.log('Tabs:', tabs.length, 'Active:', tabs.find(t => t.active)?.id);
}
```

### 2. Streaming Orchestrator

**Test**: Start agent query, verify real-time updates

- [ ] WebSocket connects
- [ ] Messages stream in real-time
- [ ] Reconnection works
- [ ] Tab filtering works

**How to test**:

1. Open AgentConsole
2. Select agent mode
3. Enter query: "Summarize quantum computing"
4. Verify streaming text appears
5. Check console for connection logs

### 3. Multi-Agent System

**Test**: Switch between agent modes, verify routing

- [ ] Trade agent for trading queries
- [ ] Research agent for research queries
- [ ] Dev agent for code queries
- [ ] Document agent for document queries
- [ ] Workflow agent for automation

**How to test**:

1. Open AgentConsole
2. Select "Trade" mode
3. Query: "Buy 10 shares of AAPL"
4. Verify trade-specific actions generated
5. Switch to "Research" mode
6. Query: "Summarize this page"
7. Verify research-specific processing

### 4. Multi-Language AI

**Test**: Enter queries in different languages

- [ ] Hindi detection: "नमस्ते"
- [ ] Tamil detection: "வணக்கம்"
- [ ] Telugu detection: "హలో"
- [ ] Translation works
- [ ] Search in multiple languages

**How to test**:

1. Open Research Mode
2. Enter query in Hindi: "निफ्टी vs बैंक निफ्टी"
3. Verify auto-detection
4. Verify search works
5. Try translation: Enter English, select Hindi
6. Verify translated results

### 5. Privacy Controls

**Test**: Set trust levels, audit domains

- [ ] Trust level setting works
- [ ] Privacy audit runs
- [ ] Violations tracked
- [ ] Dashboard displays correctly

**How to test**:

1. Go to Settings → Safety
2. Scroll to "Privacy & Trust Controls"
3. Visit a website (e.g., example.com)
4. Set trust level to "trusted"
5. Run privacy audit
6. Verify results displayed

### 6. Local Cache & Queue

**Test**: Check cache persistence, queue operations

- [ ] Cache persists across sessions
- [ ] Queue items stored
- [ ] TTL works
- [ ] Tag-based invalidation works

**How to test**:

```typescript
// In DevTools Console
import { localCache } from './core/cache/localCache';

// Test cache
await localCache.set('test', { data: 'value' }, { ttl: 60 });
const value = await localCache.get('test');
console.log('Cached:', value);

// Test queue
const queueId = await localCache.enqueue('test', { data: 'value' });
const item = await localCache.dequeue();
console.log('Queued:', item);
```

### 7. Text Chunker

**Test**: Extract and chunk page content

- [ ] Page extraction works
- [ ] Chunking is correct
- [ ] Partial summary is fast (200-800ms)
- [ ] Progressive summarization works

**How to test**:

```typescript
import { extractAndChunkPage, getPartialSummary } from './core/extraction/chunker';

const { chunks, metadata } = await extractAndChunkPage('https://example.com');
console.log('Chunks:', chunks.length);
const partial = await getPartialSummary(chunks, 3);
console.log('Partial summary:', partial);
```

### 8. Safe Action Executor

**Test**: Execute actions with consent

- [ ] Action validation works
- [ ] Consent requested for risky actions
- [ ] Batch execution works
- [ ] Consent history tracked

**How to test**:

```typescript
import { safeActionExecutor } from './core/actions/safeExecutor';

const result = await safeActionExecutor.execute({
  type: 'navigate',
  args: { url: 'https://example.com' },
  requiresConsent: false,
});
console.log('Action result:', result);
```

## 🔍 Integration Tests

### Test AgentConsole Integration

1. Open AgentConsole route
2. Verify AgentModeSelector appears
3. Select different modes
4. Verify capabilities display
5. Enter query and verify routing

### Test Research Mode Integration

1. Open Research mode
2. Verify LanguageSelector in header
3. Enter query in different language
4. Verify auto-detection
5. Verify search works

### Test Privacy Dashboard Integration

1. Go to Settings → Safety
2. Scroll to Privacy & Trust Controls
3. Verify PrivacyDashboard renders
4. Test trust level setting
5. Test privacy audit

## 🐛 Common Issues & Fixes

### Issue: Tab state becomes null

**Fix**: Already fixed with UUID keys and reducer pattern
**Verify**: Check console for null warnings

### Issue: Streaming not connecting

**Fix**:

1. Check Tauri backend is running
2. Verify WebSocket server on port 18080
3. Check browser console for errors

### Issue: Language detection fails

**Fix**:

1. Check Tauri `detect_language` command exists
2. Verify Ollama is running
3. Check fallback detection

### Issue: Privacy audit fails

**Fix**:

1. Check Tauri `privacy_audit` command exists
2. Verify network access
3. Check console for errors

## 📊 Performance Benchmarks

### Expected Performance

- Tab switch: <50ms ✅
- Streaming latency: <100ms ✅
- Language detection: <50ms ✅
- Translation: <200ms ✅
- Partial summary: 200-800ms ✅
- Cache hit: <10ms ✅

### How to Measure

```typescript
// Performance measurement
const start = performance.now();
await operation();
const duration = performance.now() - start;
console.log(`Operation took ${duration}ms`);
```

## ✅ Success Criteria

All tests should pass:

- ✅ No null tab states
- ✅ Streaming works in real-time
- ✅ Multi-agent routing works
- ✅ Language detection accurate
- ✅ Privacy controls functional
- ✅ Cache persists
- ✅ Actions execute safely

## 🎯 Next Steps After Testing

1. Fix any issues found
2. Optimize performance bottlenecks
3. Add more test coverage
4. Document edge cases
5. Prepare for production
