# Regen Core - Sentinel AI Presence

**Self-contained core module for Regen's signature AI identity.**

This module provides a **presence-based M3GAN-inspired Sentinel Browser AI** that transforms Regen from a manual task-based UI into an intelligent, observant companion.

---

## 📁 Module Structure

```
/src/core/regen-core/
├─ RegenCore.tsx          ← Sentinel spine + state machine (main component)
├─ RegenCorePanel.tsx     ← Expanded AI panel (noticing/executing/reporting)
├─ regenCore.store.ts    ← Zustand store (AI state + events)
├─ regenCore.types.ts     ← Type definitions
├─ regenCore.anim.ts      ← Motion configurations
└─ README.md              ← This file
```

**This is self-contained. No refactor chaos.**

---

## 🎯 What This Module Does

### Default State: OBSERVING
- **14px vertical light core** on right edge
- Cold violet/blue glow
- Slow vertical movement (5s cycle)
- Micro flicker every 6 seconds
- **"I'm here. Watching. Calm."**

### When Triggered: NOTICING
- Spine expands (14px → 320px)
- Shows formal observation
- Offers action (e.g., "ELIMINATE", "CONDENSE")
- User can accept or dismiss

### When Executing: EXECUTING
- Horizontal scan line
- Mechanical progress indication
- Non-blocking (browser continues working)

### When Complete: REPORTING
- Cold precision results
- No praise, just facts
- "RESULT GENERATED", "Core points: 4", "Time saved: 6m"

---

## 🔌 Integration

### Already Wired In

The module is already integrated into `AppShell.tsx`:

```tsx
import RegenCore from '../../core/regen-core/RegenCore';

// In AppShell render:
<RegenCore />
```

**It's global - appears on all pages.**

---

## 🚀 How to Trigger AI (Real Events)

### Example 1: Tab Duplication

Wherever you manage tabs:

```ts
import { useRegenCore } from "@/core/regen-core/regenCore.store";

// When you detect duplicate tabs:
useRegenCore.getState().emitSignal("TAB_REDUNDANT", {
  signal: "TAB_REDUNDANT",
  statement: "3 redundant tabs detected.",
  action: "close_duplicates",
  actionLabel: "ELIMINATE",
  reasoning: "Multiple tabs with similar content detected",
});
```

### Example 2: Search Loop

When user searches multiple times:

```ts
import { useRegenCore } from "@/core/regen-core/regenCore.store";

// After 3+ searches:
useRegenCore.getState().emitSignal("SEARCH_LOOP", {
  signal: "SEARCH_LOOP",
  statement: "Query intent unclear. Refinement suggested.",
  action: "refine_search",
  actionLabel: "REFINE",
  reasoning: "Repeated searches suggest query refinement needed",
});
```

### Example 3: Long Scroll

When user scrolls 80%+ on article:

```ts
import { useRegenCore } from "@/core/regen-core/regenCore.store";

// On scroll depth >= 80%:
useRegenCore.getState().emitSignal("LONG_SCROLL", {
  signal: "LONG_SCROLL",
  statement: "Page credibility score: Moderate. Bias indicators present.",
  action: "summarize",
  actionLabel: "ANALYZE",
  reasoning: "Long scroll on article suggests analysis needed",
});
```

### Example 4: Idle Time

When user idle 22+ minutes:

```ts
import { useRegenCore } from "@/core/regen-core/regenCore.store";

// After 22 minutes idle:
useRegenCore.getState().emitSignal("IDLE", {
  signal: "IDLE",
  statement: "Focus degradation detected after extended period.",
  action: "save_for_later",
  actionLabel: "STORE",
  reasoning: "Extended idle time suggests potential interest but distraction",
});
```

### Example 5: Error Detection

When page fails to load:

```ts
import { useRegenCore } from "@/core/regen-core/regenCore.store";

// On error:
useRegenCore.getState().emitSignal("ERROR", {
  signal: "ERROR",
  statement: "This request failed. Local alternative available.",
  action: "use_cache",
  actionLabel: "USE CACHE",
  reasoning: "Page load failed, cached version available",
});
```

---

## 📊 State Management

### Store API

```ts
import { useRegenCore } from "@/core/regen-core/regenCore.store";

// Get current state
const { state, signal, observation, report } = useRegenCore();

// Set state directly
useRegenCore.getState().setState("executing");

// Emit signal (triggers noticing state)
useRegenCore.getState().emitSignal("TAB_REDUNDANT", observation);

// Set report (triggers reporting state)
useRegenCore.getState().setReport({
  title: "RESULT GENERATED",
  metrics: ["Core points: 4", "Time saved: 6m"],
  points: ["Point 1", "Point 2"],
});

// Reset to observing
useRegenCore.getState().reset();
```

---

## 🎨 Customization

### Animation Timing

Edit `regenCore.anim.ts`:

```ts
export const MECHANICAL_EASING = [0.4, 0, 0.2, 1]; // Linear mechanical
export const spineVariants = {
  observing: { width: 14, transition: { duration: 0.28 } },
  expanded: { width: 320, transition: { duration: 0.28 } },
};
```

### Colors

Edit `RegenCore.tsx`:

```tsx
background: isExpanded
  ? "linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.95))"
  : "linear-gradient(180deg, rgba(139, 92, 246, 0.4), rgba(139, 92, 246, 0.1))",
```

### Language Style

Edit `RegenCorePanel.tsx` to change the formal, system-like language.

---

## 🔄 Complete Flow Example

```ts
import { useRegenCore } from "@/core/regen-core/regenCore.store";

// 1. Detect context (e.g., duplicate tabs)
const duplicates = findDuplicateTabs(tabs);
if (duplicates.length >= 3) {
  // 2. Emit signal (triggers NOTICING state)
  useRegenCore.getState().emitSignal("TAB_REDUNDANT", {
    signal: "TAB_REDUNDANT",
    statement: `${duplicates.length} redundant tabs detected.`,
    action: "close_duplicates",
    actionLabel: "ELIMINATE",
    reasoning: "Multiple tabs with similar content detected",
  });
}

// 3. User accepts → Transition to EXECUTING
// (Handled in RegenCorePanel when user clicks action button)

// 4. Execute action
async function executeAction() {
  useRegenCore.getState().setState("executing");
  
  // Do work...
  const result = await closeDuplicateTabs(duplicates);
  
  // 5. Set report (triggers REPORTING state)
  useRegenCore.getState().setReport({
    title: "REDUNDANCY ELIMINATED",
    metrics: [`Tabs closed: ${result.closed}`],
    points: ["Redundant tabs removed"],
  });
}

// 6. User dismisses → Returns to OBSERVING
// (Handled in RegenCorePanel when user clicks dismiss)
```

---

## ✅ What You'll See

After integration:

1. **Sentinel spine breathing** on right edge (14px vertical light core)
2. **Expands only when needed** (context triggers)
3. **Speaks like a system** (formal, declarative language)
4. **Returns to silence** (after action or dismiss)
5. **UI feels premium + alive** (even with mock data)

---

## 🚫 What NOT to Do

- ❌ Don't put RegenCore inside page routes (it's global)
- ❌ Don't trigger signals too frequently (respect user)
- ❌ Don't use friendly language (keep it formal/system-like)
- ❌ Don't block the browser (all actions are async)

---

## 📝 All Triggers Implemented

✅ **All triggers are now hooked up automatically:**

1. **Tab Redundancy** → `TAB_REDUNDANT` ✅
   - Monitors tabs every 30 seconds
   - Detects 3+ tabs from same domain
   - Auto-triggers signal

2. **Search Loop** → `SEARCH_LOOP` ✅
   - Listens for `regen:search` events
   - Tracks 3+ searches in 60-second window
   - Auto-triggers signal

3. **Long Scroll** → `LONG_SCROLL` ✅
   - Monitors scroll depth on pages
   - Detects 80%+ scroll on articles
   - Uses topic detection to identify articles
   - Auto-triggers signal

4. **Idle Detection** → `IDLE` ✅
   - Tracks mouse/keyboard/scroll activity
   - Detects 22+ minutes idle on same page
   - Auto-triggers signal

5. **Error Handling** → `ERROR` ✅
   - Listens for page load errors
   - Listens for network failures
   - Auto-triggers signal

2. **Connect actions** to your existing systems:
   - `close_duplicates` → Tab closing logic
   - `summarize` → Summarization service
   - `refine_search` → Search refinement
   - `save_for_later` → Workspace storage

3. **Test and refine** based on user feedback

---

## 🎯 Status

✅ **Module Complete**
✅ **Integrated into AppShell**
✅ **Builds successfully**
✅ **Ready for trigger integration**

**The Sentinel AI presence is now live.**
