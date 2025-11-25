# Regen Hands-Free Mode (Jarvis Mode)

## Overview

Hands-Free Mode enables **voice-only browsing** - users can search, navigate, scroll, open links, and get summaries **entirely by voice**, no keyboard or mouse needed.

---

## Features

### Core Capabilities

- ✅ **Continuous voice listening** (push-to-talk or always-on)
- ✅ **TTS (Text-to-Speech)** for spoken responses
- ✅ **Browser command execution** (scroll, click, navigate, open tabs)
- ✅ **Multi-step automation** (open N results, collect data, compare)
- ✅ **Auto-reading** (read page content, summarize key points)
- ✅ **Stop/interrupt** commands ("stop", "cancel")

---

## User Experience

### Activation

1. **Toggle Hands-Free Mode** in Regen sidebar
2. **Click mic button** to start listening
3. **Speak commands** naturally
4. **Browser responds** with actions + spoken feedback

### Example Flow

**User:** "Search for fitness laptops under 50K"

**Regen:**

- 🔍 Searches web
- 📊 Opens top 3 results automatically
- 🎙️ Speaks: "I've opened 3 top results. They are HP X, Lenovo Y, Asus Z. Want a comparison?"

**User:** "Yes, compare them for gaming and battery life"

**Regen:**

- 📄 Scrapes the 3 open tabs
- 📊 Builds comparison table
- 🎙️ Speaks: "Here's the comparison: HP X has 8 hours battery, Lenovo Y has 10 hours..."

---

## Architecture

### Components

#### 1. **Hands-Free Mode Component** (`src/components/regen/HandsFreeMode.tsx`)

- Continuous voice recognition
- TTS for responses
- Visual status indicators
- Command execution

#### 2. **State Machine** (`electron/services/regen/hands-free/state-machine.ts`)

- Manages session states: `IDLE`, `LISTENING`, `EXECUTING`, `CONFIRMING`, `READING`
- Handles interruptions
- Tracks current actions

#### 3. **Command Bus** (`electron/services/regen/hands-free/command-bus.ts`)

- Sends browser commands via WebSocket/SSE
- Routes commands to Electron IPC
- Supports multiple sessions

#### 4. **Enhanced Browser Tools** (`electron/services/regen/tools/browserTools.ts`)

- `goBack()` - Navigate back
- `goForward()` - Navigate forward
- `switchTab()` - Switch between tabs
- `closeTab()` - Close tabs
- All support command bus for hands-free mode

---

## Voice Commands

### Navigation Commands

- **"Scroll down"** / **"Scroll up"** → Scrolls page
- **"Go back"** → Browser back button
- **"Go forward"** → Browser forward button
- **"Open first result"** / **"Click second link"** → Clicks elements
- **"Switch to next tab"** → Tab navigation
- **"Close this tab"** → Closes current tab

### Search Commands

- **"Search for [query]"** → Web search + auto-open results
- **"Open top 5 results"** → Opens multiple tabs
- **"Compare these pages"** → Scrapes and compares open tabs

### Content Commands

- **"Read this page"** → Extracts content + TTS
- **"Summarize key points"** → DOM extraction + summary + TTS
- **"Stop reading"** → Interrupts TTS

### Control Commands

- **"Stop"** / **"Cancel"** → Interrupts current action
- **"Turn off hands-free"** → Exits hands-free mode

---

## State Machine

### States

1. **IDLE** - Waiting for next command
2. **LISTENING** - Recording audio
3. **EXECUTING** - Running actions (searching, scrolling, scraping)
4. **CONFIRMING** - Asking user to confirm risky action
5. **READING** - TTS is speaking

### State Transitions

```
IDLE → LISTENING (mic activated)
LISTENING → EXECUTING (command received)
EXECUTING → IDLE (action complete)
EXECUTING → CONFIRMING (risky action detected)
CONFIRMING → EXECUTING (user confirmed)
Any → IDLE (user says "stop")
```

---

## Multi-Step Automation Examples

### Example 1: Multi-Page Search

**User:** "Search for freelance web developer jobs in Chennai, open the first 10 results, and read out which ones are remote friendly"

**Flow:**

1. STT → text
2. Regen searches web
3. Opens 10 tabs automatically
4. Scrapes each page (title, location, remote?)
5. TTS: "Out of 10, 4 are remote: Site A, B, C, D. Do you want me to mark them or keep only those tabs open?"
6. User: "Keep only remote ones"
7. Regen closes non-remote tabs

### Example 2: Price Monitoring

**User:** "Watch this crypto page and alert me if Bitcoin drops below 5% today"

**Flow:**

1. Regen extracts URL from current tab
2. Creates n8n workflow `watch_price_change`
3. n8n monitors price every X minutes
4. When condition met → WebSocket notification
5. Browser TTS: "Bitcoin dropped 5.2%. Do you want to open chart or close all related tabs?"
6. User: "Open chart"
7. Regen opens TradingView/Binance

---

## TTS (Text-to-Speech)

### Implementation

- Uses **Web Speech API** (`window.speechSynthesis`)
- Language-aware (matches user's input language)
- Can be toggled on/off
- Supports interruption ("stop reading")

### Configuration

- **Rate**: 1.0 (normal speed)
- **Pitch**: 1.0 (normal pitch)
- **Volume**: 1.0 (full volume)
- **Language**: Auto-detected from session

---

## Command Execution Flow

```
User Voice
  ↓
STT (Speech-to-Text)
  ↓
Regen Intent Detection
  ↓
Tool Execution
  ↓
Command Bus
  ↓
Electron IPC
  ↓
Browser Action
  ↓
TTS Response
```

---

## Files

### Frontend

- `src/components/regen/HandsFreeMode.tsx` - Main hands-free component
- `src/components/regen/RegenSidebar.tsx` - Toggle + integration

### Backend

- `electron/services/regen/hands-free/state-machine.ts` - State management
- `electron/services/regen/hands-free/command-bus.ts` - Command routing
- `electron/services/regen/tools/browserTools.ts` - Enhanced browser tools

---

## Testing Examples

### Basic Navigation

```
User: "Scroll down slowly"
→ Regen scrolls page
→ TTS: "Scrolling down"
```

### Search + Open

```
User: "Search for best laptops under 50K and open top 3"
→ Regen searches
→ Opens 3 tabs
→ TTS: "I've opened 3 top results..."
```

### Multi-Step

```
User: "Open first 5 results and compare prices"
→ Regen opens 5 tabs
→ Scrapes prices
→ TTS: "Here's the price comparison..."
```

### Interruption

```
User: "Stop"
→ Regen interrupts current action
→ TTS: "Stopped hands-free actions"
```

---

## Future Enhancements

1. **Wake Word** ("Regen...") for always-on listening
2. **Voice Biometrics** for user identification
3. **Custom Voice Commands** (user-defined shortcuts)
4. **Multi-language TTS** (Tamil, Hindi, etc.)
5. **Gesture Control** (optional, for accessibility)

---

**Hands-Free Mode is now fully operational! 🎙️✨**

Users can browse the web entirely by voice, making Regen truly accessible and hands-free.
