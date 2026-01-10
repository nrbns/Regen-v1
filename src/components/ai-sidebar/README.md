# Sentinel Spine - REGEN CORE AI Presence

**Not an assistant. Not a friend. A protective, precise, observant presence.**

Inspired by M3GAN's controlled intelligence - loyal to the user, but not friendly. This is **Regen's signature AI identity**.

---

## Core Identity

> **"Regen's AI is not friendly. It is protective, precise, observant — and loyal to the user."**

**Not:**
- ❌ Cute
- ❌ Chatty
- ❌ Spooky
- ❌ Friendly assistant

**Is:**
- ✅ Controlled intelligence
- ✅ Silent guardian
- ✅ Protective presence
- ✅ Precision-focused

---

## Visual Form: Sentinel Spine

Instead of a normal sidebar panel, Regen uses a **12-16px vertical light core** that stands guard on the right edge.

```
│
│   ▍   ← animated vertical light core
│
│
```

**Default State:**
- Width: 16px (collapsed)
- Position: Right edge
- Visual: Vertical light core with soft pulsing glow
- Animation: Slow up/down movement + micro flicker every 5-7 seconds

**This alone makes Regen unique.**

---

## 4 Core States (M3GAN-Style Behavior)

### 🟢 STATE 1: OBSERVING (Silent Guardian)

**Visual:**
- 16px vertical spine
- Cold violet/blue light core
- Slow vertical movement (5s cycle)
- Micro flicker every 6 seconds
- No text, no UI chrome

**Animation:**
- Vertical light moves up/down (y: 0 → -20px → 0)
- Opacity pulse (0.3 → 0.6 → 0.3)
- Micro white flash (0 → 0.3 → 0) every 6 seconds
- Duration: 5s (vertical), 3s (opacity), 6s (flicker)

**Emotion conveyed:**
> "I'm here. Watching. Calm."

---

### 🟡 STATE 2: NOTICING (Controlled Expansion)

**Triggered when:**
- 6+ redundant tabs detected
- 3+ repeated searches
- 80%+ scroll on article
- 22+ minutes idle on page

**Visual:**
```
┌──────────────────┐
│ OBSERVATION      │
│ 3 redundant tabs │
│ detected         │
│                  │
│ [ELIMINATE] [DISMISS] │
└──────────────────┘
```

**Expansion:**
- Spine splits open (16px → 280px)
- Linear mechanical easing: `[0.4, 0, 0.2, 1]`
- Duration: 0.4s
- Border: Violet glow (`border-violet-500/30`)

**Language:**
- Formal, system-like
- Uppercase labels: `OBSERVATION`, `ELIMINATE`, `DISMISS`
- Mono font: `font-mono tracking-wider`
- No emojis
- No "Hey!" or "Hi!"
- Feels like a system alert, not chat

**Examples:**
- "3 redundant tabs detected."
- "Query intent unclear. Refinement suggested."
- "Page credibility score: Moderate. Bias indicators present."
- "Focus degradation detected after 22 minutes."

---

### 🔵 STATE 3: EXECUTING (Machine at Work)

**Triggered when:** User accepts observation

**Visual:**
```
┌──────────────────┐
│ EXECUTING        │
│ Analyzing        │
│ structure…       │
│                  │
│ [Horizontal scan line] │
└──────────────────┘
```

**Animation:**
- Horizontal scan line (left to right)
- Continuous loop (2s duration, infinite repeat)
- Blue glow (`border-blue-500/30`)
- Vertical light indicator: pulsing opacity (1s cycle)

**Language:**
- Formal, mechanical
- Examples:
  - "Analyzing structure…"
  - "Cross-checking sources…"
  - "Reducing redundancy…"

**Behavior:**
- Browser NEVER blocks
- AI works async
- User can continue browsing

---

### ⚪ STATE 4: REPORTING (Cold Precision)

**Triggered when:** Action completes

**Visual:**
```
┌──────────────────┐
│ RESULT GENERATED │
│ Core points: 4   │
│ Time saved: 7m 42s │
│                  │
│ • Point 1        │
│ • Point 2        │
│ • Point 3        │
│                  │
│ [STORE] [DISMISS] │
└──────────────────┘
```

**Language:**
- Results only
- No praise
- No "Hope this helps!"
- Just facts

**Examples:**
- "RESULT GENERATED" (not "Summary ready!")
- "Core points: 4" (not "Here are 4 key points:")
- "Time saved: 7m 42s" (not "You saved 7 minutes!")
- "REDUNDANCY ELIMINATED" (not "Tabs closed!")
- "STORED" (not "Saved successfully!")

**Feels like a system report, not a conversation.**

---

## Color & Light System

### Base UI
- Dark: `bg-slate-900/98` (semi-transparent)
- Border: `border-slate-800/50`
- Text: `text-slate-200` (primary), `text-slate-400` (secondary)

### AI Light Color (Cold Violet/Blue)
- **Observing State:** Violet (`violet-500/40`, `violet-400/60`)
- **Noticing State:** Violet (`border-violet-500/30`, `text-violet-300`)
- **Executing State:** Blue (`border-blue-500/30`, `blue-400/80`)
- **Reporting State:** Emerald (`border-emerald-500/30`, `emerald-400/80`)

### Glow Rules
- Glow only during activity
- No rainbow colors
- No gradients everywhere
- Subtle neon edge
- Controlled intensity

---

## Motion Language (M3GAN Vibe)

### ✅ Allowed (Linear, Mechanical, Engineered)

- **Linear motion** - Straight lines, no curves
- **Smooth mechanical easing** - `[0.4, 0, 0.2, 1]` (cubic-bezier)
- **Predictable rhythm** - Consistent timing (0.4s, 2s, 5s)
- **Vertical/horizontal scans** - Straight-line movement
- **Opacity pulses** - Simple fade in/out (0.6 → 1 → 0.6)

### ❌ Forbidden (Playful, Elastic, Cute)

- ❌ Bounce
- ❌ Elastic
- ❌ Overshoot
- ❌ Cute transitions
- ❌ Spring physics
- ❌ Ease-out-in

**Everything feels engineered, not playful.**

---

## Language Style (System-Like)

### ❌ NEVER SAY

- "Hi"
- "How can I help?"
- "Sure!"
- "Hope this helps!"
- "Great job!"
- "😊" (any emojis)
- "Hey!"
- "I noticed..."

### ✅ ALWAYS SAY

- Declarative sentences
- Neutral tone
- Observational phrasing
- System-like formatting

**Examples:**
- ✅ "3 redundant tabs detected."
- ❌ "Hey! I noticed you have 3 similar tabs open. Want me to close them?"

- ✅ "Query intent unclear. Refinement suggested."
- ❌ "I'm not sure what you're looking for. Want to try a different search?"

- ✅ "Page credibility score: Moderate. Bias indicators present."
- ❌ "This article might be biased. Want me to summarize it objectively?"

- ✅ "Focus degradation detected after 22 minutes."
- ❌ "You've been on this page for a while. Still useful?"

- ✅ "Action available if required."
- ❌ "I can help with that if you want!"

- ✅ "No further intervention recommended."
- ❌ "I think that's all for now!"

**This is what makes it distinct from other AI browsers.**

---

## Context Observations (Without Asking)

### Browsing
> "Page credibility score: Moderate."

### Searching
> "Query intent unclear. Refinement suggested."

### Tabs
> "3 redundant tabs detected."

### Time
> "Focus degradation detected after 22 minutes."

### Errors (Future)
> "This request failed. Local alternative available."

**It feels like a guardian system, not a friend.**

---

## Technical Implementation

### State Machine
```typescript
type SentinelState = 'OBSERVING' | 'NOTICING' | 'EXECUTING' | 'REPORTING';
```

**Transitions:**
- `OBSERVING` → `NOTICING` (context trigger)
- `NOTICING` → `EXECUTING` (user accepts)
- `NOTICING` → `OBSERVING` (user dismisses)
- `EXECUTING` → `REPORTING` (action completes)
- `REPORTING` → `OBSERVING` (user dismisses)

### Performance
- ✅ Isolated component tree
- ✅ Memoized callbacks (`useCallback`)
- ✅ Event-driven updates
- ✅ Hardware-accelerated transforms
- ✅ **Sentinel Spine NEVER causes re-render of main web view**

### Animation System
- **Framer Motion** for smooth transitions
- **Linear mechanical easing:** `[0.4, 0, 0.2, 1]`
- **Predictable timing:** 0.1s (micro), 0.4s (expansion), 2s (scan), 5s (pulse)
- **Hardware-accelerated:** `transform`, `opacity` only

---

## Integration Points

### Context Tracking
- ✅ Tab count monitoring (`useTabsStore`)
- ✅ Search event listening (`regen:search`)
- ✅ Scroll depth tracking (passive listener)
- ✅ Idle time tracking (mouse/keyboard activity)
- ✅ Active tab observation

### Action Execution
- ✅ Integrates with `CommandController` (`executeCommand`)
- ✅ Uses `TaskRunner` for tasks (summarize, analyze)
- ✅ Saves to `WorkspaceStore` (auto-save results)
- ✅ Records in `ContextMemory` (learns from actions)

### Event System
```typescript
// Search trigger
window.dispatchEvent(new CustomEvent('regen:search'));

// Error trigger (future)
window.dispatchEvent(new CustomEvent('regen:error', { detail: { url, error } }));
```

---

## Difference from Normal AI Browsers

| Normal AI Browser | Regen (M3GAN-Inspired) |
| ----------------- | ---------------------- |
| Chat based        | Presence based         |
| Friendly          | Protective             |
| Interruptive      | Observational          |
| Text heavy        | Signal + action        |
| Assistant         | Sentinel               |
| "Hi! How can I help?" | "3 redundant tabs detected." |
| Rainbow colors    | Cold violet/blue       |
| Playful animations | Linear, mechanical     |
| Emoji spam        | Formal, system-like    |

**This is a new category of AI browser.**

---

## Why This Stands Out

1. **No one else dares to make AI quiet + authoritative**
   - Everyone wants friendly chatbots
   - Regen wants a guardian presence

2. **Feels premium, cinematic, serious**
   - M3GAN-inspired controlled intelligence
   - Not a toy, not a friend - a loyal protector

3. **Developers respect it**
   - Precise, observant, non-intrusive
   - Doesn't get in the way

4. **Investors remember it**
   - Unique visual identity
   - Clear differentiation

5. **Users trust it**
   - Not trying to be your friend
   - Just trying to protect your time and focus

**This is brand-level differentiation, not just UI.**

---

## Usage

The Sentinel Spine is automatically integrated into `AppShell` and appears on the right edge of the main content area.

**Default:** 16px vertical light core (OBSERVING state)  
**Expanded:** 280px when NOTICING/EXECUTING/REPORTING

**No configuration needed** - it just works.

---

## Future Enhancements

1. **Error Detection Integration** ⏳
   - Listen for page load errors
   - Suggest cached version
   - Offer retry options

2. **Advanced Pattern Learning** ⏳
   - Cross-session patterns
   - Time-based suggestions
   - User behavior modeling

3. **Voice Integration** ⏳
   - Voice-activated observations
   - Formal, declarative voice responses

4. **Multi-language Support** ⏳
   - Localized observations
   - Language-aware context detection

---

## Summary

This Sentinel Spine is **Regen's signature AI identity**.

When done right:
- ✅ Regen stops feeling like a tool
- ✅ Starts feeling like a guardian presence
- ✅ Investors understand vision instantly
- ✅ Users trust it, not because it's friendly, but because it's precise

**It's the difference between a browser with AI and a browser with a mind of its own.**

---

**Status:** ✅ **FULLY IMPLEMENTED**

**Ready for:**
- User testing
- Refinement based on feedback
- Integration with real error tracking
- Advanced pattern learning

**The missing soul of Regen is now implemented with M3GAN-inspired controlled intelligence.**
