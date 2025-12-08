# Redix Runtime Enforcement Implementation

## ✅ Implementation Complete

Redix mode runtime enforcement is now implemented with dynamic imports, tab eviction, and module unloading.

## 📋 What Was Implemented

### 1. Redix Mode Detection (`src/lib/redix-mode.ts`)

✅ **Runtime mode detection** (localStorage, URL param, env var)  
✅ **Configuration system** (max tabs, Monaco enable/disable, etc.)  
✅ **Module blocking** (prevents loading heavy libs in Redix mode)  
✅ **Toggle functions** (enable/disable/toggle)  

### 2. Tab Eviction System (`src/utils/tabEviction.ts`)

✅ **Tab snapshot creation** (save state before unload)  
✅ **Unload inactive tabs** (destroy webview, keep snapshot)  
✅ **Restore tabs** (recreate from snapshot)  
✅ **Automatic eviction** (based on inactivity threshold)  
✅ **Snapshot cleanup** (removes old snapshots)  

### 3. React Hook (`src/hooks/useRedixTabEviction.ts`)

✅ **Automatic eviction** (runs every 30 seconds in Redix mode)  
✅ **Respects max tabs limit** (evicts until under limit)  
✅ **Never evicts active/pinned tabs**  

### 4. UI Components

✅ **RedixModeToggle** (`src/components/redix/RedixModeToggle.tsx`) - Toggle button  
✅ **LazyMonacoEditor** (`src/components/lazy/LazyMonacoEditor.tsx`) - Conditional Monaco loading  

### 5. Integration Points

✅ **AppShell** - Tab eviction hook integrated  
✅ **main.tsx** - Heavy service loading conditional on Redix mode  
✅ **Home routes** - Mode lazy loading respects Redix mode  

## 🚀 Usage

### Enable Redix Mode

**Option 1: Via UI (Dev Mode)**
- Look for the Redix toggle button (bottom-right corner in dev mode)
- Click to enable/disable

**Option 2: Via URL**
```
http://localhost:1420/?redix=true
```

**Option 3: Via localStorage**
```javascript
localStorage.setItem('REDIX_MODE', 'true');
window.location.reload();
```

**Option 4: Via Environment Variable**
```bash
VITE_REDIX_MODE=true npm run dev
```

### Check Current Mode

```typescript
import { isRedixMode, getRedixConfig } from './lib/redix-mode';

const enabled = isRedixMode();
const config = getRedixConfig();

console.log('Redix enabled:', enabled);
console.log('Max tabs:', config.maxTabs);
console.log('Monaco enabled:', config.enableMonaco);
```

### Use Lazy Monaco Editor

Replace Monaco imports with lazy version:

```tsx
// Old
import Editor from '@monaco-editor/react';

// New
import { LazyMonacoEditor } from '../components/lazy/LazyMonacoEditor';

<LazyMonacoEditor
  value={code}
  onChange={setCode}
  language="typescript"
/>
```

## 📊 Redix Mode Configuration

When Redix mode is **enabled**:

- **Max Tabs**: 5 (vs 50 in full mode)
- **Monaco Editor**: Disabled (replaced with simple textarea)
- **Heavy Libraries**: Blocked (LangChain, Framer Motion, etc.)
- **Tab Eviction**: Enabled (evicts after 5 min inactivity)
- **Developer Mode**: Disabled
- **Vector Services**: Stubbed out

When Redix mode is **disabled** (Full Mode):

- **Max Tabs**: 50
- **Monaco Editor**: Enabled
- **Heavy Libraries**: All loaded
- **Tab Eviction**: Disabled
- **Developer Mode**: Enabled
- **All Services**: Fully available

## 🔧 Tab Eviction Details

### How It Works

1. **Monitor tabs** - Every 30 seconds, check tab activity
2. **Identify inactive tabs** - Tabs inactive for > 5 minutes
3. **Create snapshot** - Save URL, title, scroll position
4. **Unload webview** - Destroy iframe/webview, keep snapshot
5. **Restore on activate** - When tab becomes active, recreate from snapshot

### Eviction Rules

- ✅ Never evicts active tab
- ✅ Never evicts pinned tabs
- ✅ Only evicts if over max tabs limit
- ✅ Only evicts if inactive > 5 minutes
- ✅ Preserves tab state in snapshot

### Memory Savings

Expected memory reduction:
- **Per evicted tab**: ~50-200MB (depends on page)
- **Monaco Editor**: ~30-50MB (if disabled)
- **Heavy libs**: ~20-100MB (varies by lib)
- **Total reduction**: 40-60% in Redix mode

## 🎯 Integration Points

### 1. AppShell Integration

Tab eviction is automatically enabled in AppShell when Redix mode is active:

```tsx
// In AppShell.tsx (already integrated)
useRedixTabEviction(redixConfig.enabled && redixConfig.enableTabEviction);
```

### 2. Dynamic Component Loading

Heavy components should check Redix mode:

```tsx
import { getRedixConfig } from '../lib/redix-mode';

const config = getRedixConfig();

if (config.enabled && !config.enableMonaco) {
  return <SimpleTextarea />;
}

return <MonacoEditor />;
```

### 3. Service Initialization

Heavy services are conditionally loaded in `main.tsx`:

```typescript
// Only loads if not in Redix mode or if enabled in config
if (!redixConfig.enabled || redixConfig.enableHeavyLibs) {
  // Load heavy services
}
```

## 📝 Files Reference

- **Mode Detection**: `src/lib/redix-mode.ts`
- **Tab Eviction**: `src/utils/tabEviction.ts`
- **Hook**: `src/hooks/useRedixTabEviction.ts`
- **Toggle UI**: `src/components/redix/RedixModeToggle.tsx`
- **Lazy Monaco**: `src/components/lazy/LazyMonacoEditor.tsx`
- **Integration**: `src/components/layout/AppShell.tsx`, `src/main.tsx`

## 🧪 Testing

### Test Redix Mode Toggle

```bash
# 1. Start app
npm run dev

# 2. Enable Redix mode via URL
# Navigate to: http://localhost:1420/?redix=true

# 3. Check memory usage
# Open DevTools → Performance → Memory
# Compare Full Mode vs Redix Mode
```

### Test Tab Eviction

```typescript
// In browser console
import { evictInactiveTabs } from './utils/tabEviction';
import { useTabsStore } from './state/tabsStore';

const { tabs, activeId } = useTabsStore.getState();
const evicted = await evictInactiveTabs(tabs, activeId, 3);
console.log('Evicted tabs:', evicted);
```

### Verify Memory Reduction

1. Enable Redix mode
2. Open 10 tabs
3. Wait 5+ minutes (inactive tabs)
4. Check memory - should see eviction
5. Compare with full mode memory usage

## ✅ Verification Checklist

- [ ] Redix mode toggle works (UI or URL)
- [ ] Tab eviction runs in Redix mode
- [ ] Monaco Editor is disabled in Redix mode
- [ ] Heavy services don't load in Redix mode
- [ ] Memory reduction ≥40% in Redix mode
- [ ] Tabs restore correctly after eviction
- [ ] Active/pinned tabs never evicted

## 🎯 Next Steps

1. **Add Settings UI** - Move Redix toggle to Settings page
2. **Memory Monitoring** - Show real-time memory savings
3. **Custom Limits** - Let users customize max tabs
4. **Smart Eviction** - Evict based on memory pressure, not just time
5. **Thumbnail Generation** - Add visual snapshots for evicted tabs

## 📊 Expected Results

**Before (Full Mode):**
- Memory: ~500-800MB (10 tabs + Monaco)
- Startup: ~3-4s

**After (Redix Mode):**
- Memory: ~200-350MB (5 tabs, no Monaco)
- Startup: ~1.5-2s
- **Reduction: 50-60%**

The implementation is complete and ready for testing!


