# Testing Live Tab Scraping - Step by Step Guide

## 🎯 Goal

Verify that live tab scraping works: when you research with a page open, "Current Page" should appear in sources.

---

## ✅ Pre-Test Checklist

- [ ] App is running (`npm run dev` or `npm run dev:tauri`)
- [ ] Browser console is open (F12)
- [ ] At least one web page is open (not `about:blank`)

---

## 🧪 Test Steps

### Step 1: Open a Web Page

1. Navigate to any web page (e.g., `https://example.com`)
2. Wait for page to fully load
3. **Verify**: Page is visible in browser tab

### Step 2: Run Automated Test (Optional)

In browser console, run:

```javascript
window.testLiveScraping();
```

This will:

- Check if service exists
- Check for active tab
- Check for iframe
- Try scraping
- Show results

### Step 3: Manual Test - Research Mode

1. Switch to **Research mode** (click Research tab/button)
2. In the research input, type: `Research this page` or `Summarize current page`
3. Click **Research** button (or press Enter)
4. Wait for research to complete

### Step 4: Verify Results

**Expected Behavior**:

- ✅ Research answer starts streaming
- ✅ **"Current Page"** appears in sources list (at the top)
- ✅ Source shows the actual page title
- ✅ Source snippet contains page content (not generic)
- ✅ Answer references the current page content

**Check Sources Panel**:

- Look for source with title matching the open page
- Source should have URL matching the open page
- Source snippet should contain actual page text

---

## 🔍 Verification Checklist

- [ ] "Current Page" appears in sources
- [ ] Source URL matches the open page
- [ ] Source title matches page title
- [ ] Source snippet contains page content
- [ ] Answer mentions page-specific content
- [ ] No errors in console

---

## 🐛 Troubleshooting

### "Current Page" Not Appearing

**Possible Causes**:

1. **No active HTTP tab**
   - **Fix**: Open a web page (not `about:blank`)
   - **Check**: Console should show: `[LiveTabScraper] No active HTTP tab to scrape`

2. **Cross-origin page**
   - **Fix**: Try a same-origin page or different site
   - **Check**: Console may show: `[LiveTabScraper] Cross-origin, waiting for postMessage response`
   - **Note**: Falls back to Tauri IPC or backend scraper

3. **Scraping timeout**
   - **Fix**: Wait longer or try a simpler page
   - **Check**: Console may show: `[LiveTabScraper] Scrape timeout after 5s`
   - **Note**: 5-second timeout is normal

4. **Iframe not found**
   - **Fix**: This is normal if tab uses different rendering
   - **Check**: Console may show: `[LiveTabScraper] No iframe found, trying Tauri IPC fallback`
   - **Note**: Falls back gracefully

### Console Errors

**Check for these errors**:

- `[LiveTabScraper] Failed to scrape active tab` - General error
- `[Research] Live scraping failed` - Research mode error
- `[Research] Failed to add live scraped content` - Source addition error

**Common Fixes**:

- Refresh the page
- Try a different page
- Check network connectivity
- Verify tabs store is working

---

## 📊 Expected Console Output

### Successful Scrape

```
[LiveTabScraper] Scraping active tab: https://example.com
[LiveTabScraper] Scraped via browserScrape(): https://example.com
[Research] Live scraped active tab: https://example.com
[Research] Added live scraped content to sources
```

### Fallback Scenarios

```
[LiveTabScraper] No iframe found, trying Tauri IPC fallback
[LiveTabScraper] Scraped via Tauri IPC: https://example.com
```

Or:

```
[LiveTabScraper] Cross-origin, waiting for postMessage response
[LiveTabScraper] Scraped via postMessage: https://example.com
```

---

## ✅ Success Criteria

Test passes if:

- ✅ "Current Page" appears in sources
- ✅ Source contains actual page content
- ✅ Answer references the page
- ✅ No console errors
- ✅ Research completes successfully

---

## 🎯 Next Tests

After this test passes:

1. Test agentic actions - verify `[SCRAPE]` auto-executes
2. Test browser search integration
3. Test parallel execution
4. Test realtime source updates

---

**Ready to test!** 🚀
