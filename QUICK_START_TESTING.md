# Quick Start Testing Guide - Research Mode v0.4

## 🚀 Get Started in 5 Minutes

### Step 1: Start the App

```bash
npm run dev
# or for Tauri
npm run dev:tauri
```

### Step 2: Verify Integration (Optional)

Open browser console (F12) and run:

```javascript
window.verifyResearchIntegration();
```

### Step 3: Quick Test - Browser Search

1. Click in the omnibox (address bar)
2. Type: `test query`
3. Press Enter
4. **Expected**: Research mode should open and start researching automatically

### Step 4: Quick Test - Live Scraping

1. Open any web page (e.g., `https://example.com`)
2. Switch to Research mode
3. Enter: `Research this page`
4. Click Research
5. **Expected**: "Current Page" should appear in sources

---

## ✅ All Features Implemented

- ✅ **Live Tab Scraping** - Scrapes active browser tabs
- ✅ **Agentic Actions** - Auto-executes [SCRAPE], [SUMMARIZE], etc.
- ✅ **Parallel Execution** - AI + scraping run simultaneously
- ✅ **Browser Search Integration** - Omnibox triggers research
- ✅ **Realtime Source Updates** - WebSocket + polling fallback

---

## 📋 Full Test Checklist

See `TESTING_CHECKLIST.md` for complete testing guide.

---

## 🐛 If Something Doesn't Work

### Check Console

- Open browser console (F12)
- Look for errors with `[Research]`, `[LiveTabScraper]`, `[AgenticAction]` prefixes
- Check network tab for failed requests

### Common Issues

1. **"Current Page" not appearing**
   - Make sure a web page is open (not `about:blank`)
   - Check console for scraping errors
   - Try a different page (some may be cross-origin)

2. **Browser search not triggering research**
   - Check if `browser:search` event is dispatched (console)
   - Verify Research mode is active/loaded
   - Check for JavaScript errors

3. **Agentic actions not executing**
   - Check if AI response contains action markers: `[SCRAPE]`, `[SUMMARIZE]`
   - Check console for action parsing/execution logs
   - Verify no errors in action executor

4. **Slow first token**
   - Check if parallel execution is working (console timestamps)
   - Verify AI service is responding
   - Check network conditions

---

## 📊 Expected Performance

- First token: <2 seconds
- Live scrape: <500ms
- Action execution: <1 second
- Browser search → Research: <200ms

---

## 🎯 Success Criteria

Research Mode is working if:

- ✅ Browser search triggers research automatically
- ✅ Current page appears in sources when tab is open
- ✅ Agentic actions auto-execute
- ✅ First token appears in <2s
- ✅ No console errors

---

**Ready to test!** 🚀

For detailed testing, see `TESTING_CHECKLIST.md`
