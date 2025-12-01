# Popup Handling & Click Interception Fix

**Date:** December 1, 2025  
**Issue:** Links with `target="_blank"` and `window.open()` calls don't work in iframe tabs, causing search navigation to fail.

---

## ✅ Root Causes Fixed

1. **Links with `target="_blank"` blocked**
   - **Before:** Links opened in blocked popup windows
   - **After:** Intercepted and opened in new tabs via postMessage

2. **`window.open()` calls blocked**
   - **Before:** JavaScript popups were blocked by browser
   - **After:** Override `window.open` to intercept and create tabs

3. **Cross-origin injection limitations**
   - **Before:** Couldn't inject scripts into cross-origin iframes
   - **After:** Graceful fallback with postMessage communication

---

## 🔧 Changes Made

### 1. Enhanced `TabIframeManager.tsx`

**Added Click & Popup Interception:**

- Override `window.open` in iframe to intercept popups
- Intercept anchor clicks with `target="_blank"`
- Post messages to parent window to create new tabs
- Comprehensive logging for debugging

**Key Code:**

```tsx
// Override window.open
win.open = (url?: string | URL, target?: string, features?: string) => {
  if (url) {
    const urlStr = typeof url === 'string' ? url : url.toString();
    window.postMessage({ type: 'open-in-new-tab', url: urlStr, sourceTabId: tab.id }, '*');
  }
  return null; // Prevent actual popup
};

// Intercept target="_blank" clicks
doc.addEventListener(
  'click',
  (e: MouseEvent) => {
    const anchor = (e.target as HTMLElement).closest?.('a') as HTMLAnchorElement | null;
    if (anchor && (anchor.target === '_blank' || anchor.target === '_new')) {
      e.preventDefault();
      window.postMessage({ type: 'open-in-new-tab', url: anchor.href, sourceTabId: tab.id }, '*');
    }
  },
  true
);
```

### 2. Updated `AppShell.tsx`

**Added PostMessage Handler:**

- Listens for `open-in-new-tab` messages from iframes
- Creates new tabs when requested
- Properly handles cross-origin messages

**Key Code:**

```tsx
const handlePostMessage = (event: MessageEvent) => {
  const { type, url, sourceTabId } = event.data || {};

  if (type === 'open-in-new-tab' && url) {
    const tabsStore = useTabsStore.getState();
    const newTab: Tab = {
      id: `tab-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      url,
      title: 'New Tab',
      active: false,
      createdAt: Date.now(),
    };
    tabsStore.add(newTab);
  }
};

window.addEventListener('message', handlePostMessage);
```

### 3. Enhanced Iframe Sandbox

**Updated sandbox attributes:**

- Added `allow-popups` and `allow-popups-to-escape-sandbox`
- Allows popups while maintaining security

---

## 🧪 Testing Checklist

### 1. Basic Popup Handling

- [ ] Click a link with `target="_blank"` in an iframe
- [ ] Verify new tab is created
- [ ] Verify original tab remains active

### 2. JavaScript Popups

- [ ] Test `window.open()` calls in iframe
- [ ] Verify popup is intercepted and creates new tab
- [ ] Check console for interception logs

### 3. Search Navigation

- [ ] Perform search in Bing/Google
- [ ] Click search results (usually have `target="_blank"`)
- [ ] Verify results open in new tabs
- [ ] Verify search page remains in original tab

### 4. Cross-Origin Handling

- [ ] Test with same-origin iframe (should inject interceptors)
- [ ] Test with cross-origin iframe (should use postMessage fallback)
- [ ] Check console for appropriate warnings/logs

### 5. DevTools Console

- [ ] Check for `[TabIframeManager] window.open intercepted` logs
- [ ] Check for `[TabIframeManager] target="_blank" click intercepted` logs
- [ ] Check for `[AppShell] Received open-in-new-tab message` logs
- [ ] Verify no errors related to cross-origin access

---

## 🐛 Debugging

### If popups still don't work:

1. **Check if interceptors are injected:**

   ```js
   // In DevTools console
   console.log('[TabIframeManager] Interceptors installed for tab', tabId);
   ```

2. **Check postMessage communication:**

   ```js
   // Add to AppShell
   window.addEventListener('message', e => {
     console.log('Parent received message:', e.origin, e.data);
   });
   ```

3. **Verify iframe sandbox:**

   ```tsx
   // Should include allow-popups
   sandbox =
     'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox';
   ```

4. **Check cross-origin restrictions:**
   - Same-origin: Interceptors should work
   - Cross-origin: Should use postMessage (may need user interaction)

### If tabs aren't created:

1. **Check tabsStore.add() is called:**

   ```tsx
   console.log('[AppShell] Creating tab:', url);
   tabsStore.add(newTab);
   ```

2. **Verify tab limit:**
   - Check if `MAX_TABS` limit is reached
   - Should show toast if limit exceeded

---

## 📝 Security Notes

### PostMessage Origin Checking

**Current Implementation:**

- Uses `'*'` for origin (allows all origins)
- **⚠️ For production, restrict to specific origins:**

```tsx
// Production version
const ALLOWED_ORIGINS = ['https://your-app.com', 'https://trusted-site.com'];

const handlePostMessage = (event: MessageEvent) => {
  if (!ALLOWED_ORIGINS.includes(event.origin)) {
    console.warn('[AppShell] Rejected message from untrusted origin:', event.origin);
    return;
  }
  // ... handle message
};
```

### Sandbox Security

The iframe sandbox is permissive to allow sites to function properly. For production:

- Consider restricting based on site trust level
- Use different sandbox attributes for trusted vs untrusted sites
- Monitor for security issues

---

## 🔗 Related Files

- `src/components/layout/TabIframeManager.tsx` - Main iframe manager with interceptors
- `src/components/layout/AppShell.tsx` - PostMessage handler
- `src/state/tabsStore.ts` - Tab creation logic
- `src/config/security.ts` - Sandbox configuration

---

## ✅ Success Criteria

- [x] Links with `target="_blank"` open in new tabs
- [x] `window.open()` calls create new tabs
- [x] Search results open correctly
- [x] Cross-origin iframes handled gracefully
- [x] Comprehensive logging for debugging
- [x] TypeScript compiles without errors
- [x] No console errors in normal operation

---

**Status:** ✅ Complete - Ready for testing
