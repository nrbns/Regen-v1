# Regen Architecture - Unified All-in-One Design

## Overview

Regen is the **AI brain of OmniBrowser** - a unified system that handles Research, Trade, Multilingual, and Hands-Free modes. It's built as **4 layers** around your existing browser, making it feel like one seamless experience.

---

## Architecture Layers

```
┌─────────────────────────────────────────────────────────┐
│  Layer 4: Browser & UI (Your Running App)              │
│  - RegenSidebar.tsx                                     │
│  - HandsFreeMode.tsx                                    │
│  - Electron IPC handlers                                │
└─────────────────────────────────────────────────────────┘
                        ▲
                        │
┌─────────────────────────────────────────────────────────┐
│  Layer 3: Multilingual & Hands-Free Support            │
│  - language/detector.ts                                 │
│  - language/commands.ts                                 │
│  - hands-free/state-machine.ts                          │
│  - hands-free/command-bus.ts                            │
└─────────────────────────────────────────────────────────┘
                        ▲
                        │
┌─────────────────────────────────────────────────────────┐
│  Layer 2: Tools (Everything Regen Can Do)              │
│  - browserTools.ts (openTab, scroll, click, etc.)      │
│  - searchTools.ts (searchWeb, scrapeUrl)               │
│  - tradeTools.ts (paper trading, automations)           │
│  - n8nTools.ts (workflow execution)                    │
└─────────────────────────────────────────────────────────┘
                        ▲
                        │
┌─────────────────────────────────────────────────────────┐
│  Layer 1: Regen Core (Brain)                            │
│  - Mode routing (research/trade/browser/automation)     │
│  - Intent detection                                     │
│  - Language detection + session management             │
│  - Tool orchestration                                   │
│  - Response generation (in correct language)             │
└─────────────────────────────────────────────────────────┘
```

---

## Layer 1: Regen Core (Brain)

**Location:** `electron/services/regen/core.ts`

**Responsibility:**

- Mode routing (`research | trade | browser | automation | handsFree`)
- Intent detection
- Language detection + session language tracking
- Calling tools: search, trade, browser, n8n
- Generating final answer in correct language

**Key Function:**

```typescript
export async function handleMessage(msg: RegenMessage): Promise<RegenResponse> {
  // Step 1: Load session (includes lastUserLanguage, mode, etc.)
  const session = await getSession(msg.sessionId);

  // Step 2: Detect language
  const detectedLang = detectLanguage(msg.message);
  updateSessionLanguage(msg.sessionId, detectedLang);

  // Step 3: Enrich message with language and intent
  const enriched = {
    ...msg,
    detectedLanguage: detectedLang,
    responseLanguage: session.lastUserLanguage || detectedLang,
  };

  // Step 4: Route to mode-specific handler
  if (enriched.mode === 'trade') {
    return await handleTradeQuery(enriched, session);
  }
  if (enriched.mode === 'research') {
    return await handleResearchQuery(enriched, session);
  }
  if (enriched.mode === 'browser') {
    return await handleBrowserNav(enriched, session);
  }
  if (enriched.mode === 'automation') {
    return await handleAutomation(enriched, session);
  }

  // Default: research mode
  return await handleResearchQuery(enriched, session);
}
```

**Regen Core does NOT know about UI** - just input → tools → output.

---

## Layer 2: Tools (Everything Regen Can "Do")

### `tools/browserTools.ts`

Browser navigation and control.

**Functions:**

- `openTab(url)` - Open new tab
- `closeTab(tabId)` - Close tab
- `switchTab(indexOrId)` - Switch between tabs
- `getDom(tabId)` - Extract simplified DOM
- `clickElement(tabId, elementId)` - Click element
- `scroll(tabId, amount)` - Scroll page
- `goBack(tabId)` - Navigate back
- `goForward(tabId)` - Navigate forward
- `typeInto(tabId, selector, text)` - Type into form field

**Implementation:** Electron IPC → webview injected JS → DOM manipulation

### `tools/searchTools.ts`

Web search and content extraction.

**Functions:**

- `searchWeb(query, { lang, region })` - Language-aware search
- `scrapeUrl(url)` - Extract page content (uses existing scraper)

### `tools/tradeTools.ts`

Paper trading and automation.

**Functions:**

- `placePaperTrade(intent)` - Execute paper trade
- `listPaperTrades(userId)` - Get user's paper trades
- `createAutomation(rule)` - Create automation rule
- `stopAutomation(id)` - Stop specific automation
- `stopAllAutomations(userId)` - Stop all automations

**Safety:** Only paper trading for now (no real money)

### `tools/n8nTools.ts`

Workflow automation.

**Functions:**

- `runWorkflow(workflowId, payload)` - Execute n8n workflow
- `runResearchWorkflow(query, options)` - Multi-source research
- `runWatchPageWorkflow(url, threshold, userId)` - Page monitoring
- `checkN8NAvailability()` - Health check

---

## Layer 3: Multilingual & Hands-Free Support

### `language/detector.ts`

**Function:** `detectLanguage(text: string): LanguageCode`

Detects language from text using Unicode script ranges:

- Tamil: `\u0B80-\u0BFF`
- Hindi: `\u0900-\u097F`
- Telugu, Kannada, Malayalam, etc.
- Hinglish detection (Hindi words in English script)

Sets `session.lastUserLanguage` for response generation.

### `language/commands.ts`

**Function:** `findCommandAction(text: string, lang: LanguageCode): CommandAction`

Maps navigation verbs across languages:

- "கிளிக் பண்ணு" / "क्लिक करो" / "click" → `ACTION_CLICK`
- "ஸ்க்ரோல் பண்ணு" / "स्क्रोल करो" / "scroll down" → `ACTION_SCROLL`
- "திற" / "खोलो" / "open" → `ACTION_OPEN`

### `hands-free/state-machine.ts`

**States:**

- `IDLE` - Waiting for next command
- `LISTENING` - Recording audio
- `EXECUTING` - Running actions
- `CONFIRMING` - Asking user to confirm risky action
- `READING` - TTS is speaking

**Functions:**

- `setSessionState(sessionId, state, action?)`
- `interruptSession(sessionId)` - Handle "stop", "cancel"
- `isInterrupted(sessionId)` - Check if interrupted

### `hands-free/command-bus.ts`

**Function:** Routes Regen commands to browser via WebSocket/SSE

Takes commands like:

```json
{ "type": "OPEN_TAB", "payload": { "url": "..." } }
{ "type": "SCROLL", "payload": { "tabId": "...", "amount": 500 } }
```

Sends to Electron → IPC → browser execution.

### Voice Endpoints

- `/api/voice/recognize` - STT (Speech-to-Text)
  - Returns: `{ text, detectedLanguage }`
  - Forwards to Regen Core
- TTS (Text-to-Speech) - Frontend Web Speech API
  - Speaks responses in user's language

---

## Layer 4: Browser & UI (Your Running App)

### Frontend Components

#### `RegenSidebar.tsx`

Main UI component:

- Mode toggles: Research | Trade
- Text input box
- 🎙️ Voice button
- Hands-Free Mode toggle
- Message history
- Command execution status

#### `HandsFreeMode.tsx`

Hands-free overlay:

- Continuous voice listening
- TTS toggle
- Visual status indicators
- Command execution callbacks

### Electron IPC

#### `ipc.ts` & `ipc-trade.ts`

Maps Regen commands to browser actions:

- `OPEN_TAB` → `ipc.tabs.create()`
- `SCROLL` → `browserTools.scrollTab()`
- `CLICK_ELEMENT` → `browserTools.clickElement()`
- `GO_BACK` → `ipc.tabs.goBack()`

**Existing tab system stays the same** - Regen just **drives it**.

---

## End-to-End Request Flows

### A. Research Mode (Tamil, with auto tabs)

**User (Tamil):**

> "50 ஆயிரம் கீழே சிறந்த லேப்டாப்புகளை கண்டுபிடி மற்றும் 5 இணைய தளங்களை திற"

**Flow:**

1. **Frontend** → `POST /api/agent/query`

   ```json
   {
     "mode": "research",
     "message": "50 ஆயிரம் கீழே சிறந்த லேப்டாப்புகளை...",
     "sessionId": "abc123",
     "tabId": "tab-2"
   }
   ```

2. **Regen Core:**
   - `detectLanguage()` → `ta` (Tamil)
   - `updateSessionLanguage()` → sets `lastUserLanguage = "ta"`
   - Routes to `handleResearchQuery()`

3. **Research Handler:**
   - Intent: `research_and_open`
   - Params: `{ query: "laptops under 50000 INR", limit: 5 }`
   - Calls `runWorkflow("multi_source_research", { query, lang: "ta", region: "IN" })`
   - Gets structured data (items + URLs)
   - Calls `browserTools.openTab(url)` for top 5
   - Builds answer in **Tamil** using LLM

4. **Backend streams:**
   - `{ type: "message", text: "🔍 தேடுகிறது..." }`
   - `{ type: "message", text: "📊 5 ஆதாரங்கள் பகுப்பாய்வு செய்யப்பட்டது..." }`
   - `{ type: "command", command: { type: "OPEN_TAB", url: "..." } }` (×5)

5. **UI:**
   - Shows Tamil response in chat
   - Opens 5 tabs automatically
   - (If hands-free on → TTS reads summary in Tamil)

---

### B. Trade Mode (Paper Trading)

**User:**

> "Buy 10 shares of TCS at market"

**Flow:**

1. **Frontend** → `{ mode: "trade", message: "Buy 10 shares of TCS at market" }`

2. **Trade Handler:**
   - Parses: `{ symbol: "TCS", side: "buy", qty: 10, type: "market" }`
   - **Confirmation required** → Sets state to `CONFIRMING`
   - Response: `"⚠️ You are about to BUY 10 TCS @ market. Confirm? (Yes/No)"`

3. **User:** `"Yes"`

4. **Trade Handler:**
   - Calls `tradeTools.placePaperTrade(intent)`
   - Stores `PaperTrade` in database
   - Response: `"✅ Paper trade executed at ₹X (simulated price)."`

5. **UI:**
   - Shows trade in `Paper Portfolio` panel
   - Updates position list

---

### C. Hands-Free Navigation (Voice)

**User (voice):**

> "Scroll down slowly and read the key points."

**Flow:**

1. **Mic** → `/api/voice/recognize` → `{ text: "Scroll down slowly...", language: "en" }`

2. **Regen Core:**
   - Intent: `scroll_and_summarize`
   - Calls `browserTools.getDom(tabId)` → extracts headings & bullets
   - Sends `SCROLL` commands via command bus (in steps: 200px every 500ms)
   - Generates summary from extracted content

3. **State Machine:**
   - State: `EXECUTING` → `READING`
   - TTS: "Here are the key points: ..."

4. **User:** `"Stop"` → State machine → `interruptSession()` → `IDLE`
   - Stops scrolling
   - Stops TTS
   - Response: "Stopped hands-free actions."

---

## File Structure

```
electron/services/regen/
├── core.ts                    # Main router (Layer 1)
├── session.ts                 # Session management
│
├── modes/
│   ├── research.ts            # Research mode handler
│   ├── trade.ts               # Trade mode handler
│   ├── browser.ts             # Browser navigation handler
│   └── automation.ts          # Automation handler
│
├── tools/
│   ├── browserTools.ts        # Browser control (Layer 2)
│   ├── searchTools.ts         # Web search
│   ├── tradeTools.ts          # Paper trading
│   └── n8nTools.ts            # n8n workflows
│
├── language/
│   ├── detector.ts            # Language detection (Layer 3)
│   └── commands.ts            # Multilingual command mapping
│
├── hands-free/
│   ├── state-machine.ts       # State management (Layer 3)
│   └── command-bus.ts         # Command routing
│
└── ipc.ts                     # IPC handlers (Layer 4)
    └── ipc-trade.ts           # Trade-specific IPC

src/components/regen/
├── RegenSidebar.tsx           # Main UI (Layer 4)
└── HandsFreeMode.tsx          # Hands-free UI (Layer 4)

server/api/
├── regen-controller.js        # API endpoints
└── voice-controller.js        # Voice recognition
```

---

## Session Management

```typescript
interface RegenSession {
  sessionId: string;
  preferredLanguage: LanguageCode; // First detected language
  lastUserLanguage: LanguageCode; // Updated every message
  mode: 'research' | 'trade' | 'browser' | 'automation';
  history: Array<{
    role: 'user' | 'assistant';
    content: string;
    language: LanguageCode;
    timestamp: number;
  }>;
  createdAt: number;
  updatedAt: number;
}
```

**Key Behavior:**

- First language becomes `preferredLanguage`
- Each message updates `lastUserLanguage`
- Responses always in `lastUserLanguage`
- Mode persists across messages

---

## Integration Points

### With Existing Browser

1. **Tab System:**
   - Regen uses existing `electron/services/tabs.ts`
   - No changes to tab management
   - Regen just calls `createTab()`, `activateTab()`, etc.

2. **IPC System:**
   - Regen registers handlers via `registerHandler()`
   - Uses existing IPC router with validation
   - Commands flow: Regen → IPC → Browser Tools → Tabs

3. **UI Components:**
   - Regen sidebar integrates into `AppShell.tsx`
   - Uses existing Zustand stores
   - No changes to main browser UI

### With n8n

1. **Workflow Execution:**
   - Regen calls n8n webhooks
   - n8n returns structured data
   - Regen processes and presents to user

2. **Callbacks:**
   - n8n calls `/api/regen/event` when conditions met
   - Backend broadcasts via WebSocket
   - UI shows notifications

---

## Security & Safety

### Trade Mode

- **Paper trading only** (no real money)
- **Confirmation required** for all trades
- **Automation limits** (max 10 per user)
- **Risk checks** before execution

### Browser Control

- **Rate limiting** on IPC calls
- **Element validation** before clicking
- **URL validation** before opening tabs
- **User confirmation** for destructive actions

### Voice

- **Local STT** (no cloud by default)
- **Opt-in TTS** (user can disable)
- **Privacy-first** (no voice data stored)

---

## Performance

### Optimizations

1. **Lazy Loading:**
   - Regen sidebar loads on demand
   - Tools loaded when needed
   - n8n workflows cached

2. **Caching:**
   - Session data cached in memory
   - Search results cached (5 min TTL)
   - DOM extraction cached per tab

3. **Batching:**
   - Multiple tab opens batched
   - IPC calls batched when possible
   - WebSocket messages batched

---

## Testing Strategy

### Unit Tests

- Language detection accuracy
- Command parsing (all languages)
- Intent classification
- Tool execution

### Integration Tests

- End-to-end research flow
- Trade confirmation flow
- Hands-free voice flow
- n8n workflow integration

### E2E Tests

- Full user journey (search → open → compare)
- Multilingual commands
- Voice navigation
- Automation triggers

---

## Future Enhancements

1. **Wake Word** ("Regen...") for always-on listening
2. **Custom Workflows** (user-created automation)
3. **Real Broker Integration** (after paper trading validated)
4. **Mobile App** (same engine, different UI)
5. **Plugin System** (third-party tools)

---

**Regen is designed as a unified system - all modes, all languages, all interaction methods work together seamlessly! 🚀**
