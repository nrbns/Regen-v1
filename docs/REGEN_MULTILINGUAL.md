# Regen Multilingual Support

## Overview

Regen now supports **any Indian language** (Tamil, Hindi, Telugu, Kannada, Malayalam, Marathi, Gujarati, Punjabi, Bengali) with full power:

- ✅ **Search** in any language
- ✅ **Navigation commands** (click, scroll, open) in any language
- ✅ **Voice input/output** in any language
- ✅ **Automation** triggered in any language
- ✅ **Responses** always in the same language as input

---

## Architecture

### Language-Agnostic Design

Regen is **language-agnostic** but **session-aware**:

```typescript
type RegenSession = {
  sessionId: string;
  preferredLanguage: LanguageCode; // "ta", "hi", "en", etc.
  lastUserLanguage: LanguageCode; // Updated every message
  mode: 'research' | 'trade' | 'browser' | 'automation';
  history: RegenMessage[];
};
```

### Pipeline Flow

1. **User Input** (any language) → UTF-8 text
2. **Language Detection** → Detects script/patterns
3. **Intent Classification** → Language-independent understanding
4. **Tool Execution** → Language-aware search/navigation
5. **Response Generation** → Same language as input

---

## Language Detection

### Supported Languages

- **Tamil** (`ta-IN`) - தமிழ்
- **Hindi** (`hi-IN`) - हिंदी
- **English** (`en-IN`)
- **Telugu** (`te-IN`) - తెలుగు
- **Kannada** (`kn-IN`) - ಕನ್ನಡ
- **Malayalam** (`ml-IN`) - മലയാളം
- **Marathi** (`mr-IN`) - मराठी
- **Gujarati** (`gu-IN`) - ગુજરાતી
- **Punjabi** (`pa-IN`) - ਪੰਜਾਬੀ
- **Bengali** (`bn-IN`) - বাংলা

### Detection Method

Uses **Unicode script ranges** for accurate detection:

- Tamil: `\u0B80-\u0BFF`
- Hindi (Devanagari): `\u0900-\u097F`
- Telugu: `\u0C00-\u0C7F`
- etc.

Also detects **Hinglish** (Hindi words in English script).

---

## Multilingual Commands

### Command Dictionary

Regen understands navigation verbs in all supported languages:

#### Tamil Examples

- **Click**: "கிளிக் பண்ணு", "அழுத்து"
- **Scroll**: "ஸ்க்ரோல் பண்ணு", "கீழே"
- **Open**: "திற", "திறக்க"
- **Search**: "தேடு", "வேலை"

#### Hindi Examples

- **Click**: "क्लिक करो", "दबाएं"
- **Scroll**: "स्क्रोल करो", "नीचे"
- **Open**: "खोलो", "खोलें"
- **Search**: "ढूंढो", "खोज"

#### English Examples

- **Click**: "click", "press"
- **Scroll**: "scroll", "scroll down"
- **Open**: "open", "launch"
- **Search**: "search", "find"

---

## Research Mode - Multilingual

### Example: Tamil Search

**User Input:**

> "50 ஆயிரம் கீழே சிறந்த லேப்டாப்புகளை கண்டுபிடி மற்றும் 5 இணைய தளங்களை திற"

**Flow:**

1. **Detect**: `ta` (Tamil)
2. **Intent**: Research + open tabs
3. **Search**: Language-aware search with `lang: "ta"`, `region: "IN"`
4. **Open**: Auto-opens 5 sites
5. **Response**: In Tamil

**Response:**

> "📊 5 ஆதாரங்கள் கண்டுபிடிக்கப்பட்டது. விரிவான ஒப்பீட்டைத் தயாரிக்கிறது...
>
> ✅ 5 தாவல்கள் அதிகாரப்பூர்வ ஆதாரங்களுடன் திறக்கப்பட்டது."

### Example: Hindi Search

**User Input:**

> "50 हजार के अंदर अच्छे लैपटॉप ढूंढो और 5 साइट खोलो"

**Flow:**

1. **Detect**: `hi` (Hindi)
2. **Intent**: Research + open tabs
3. **Search**: Language-aware search
4. **Response**: In Hindi

**Response:**

> "📊 5 स्रोत मिले। विस्तृत तुलना तैयार कर रहा है...
>
> ✅ 5 टैब आधिकारिक स्रोतों के साथ खोले गए।"

---

## Navigation Commands - Multilingual

### Tamil Navigation

**User:**

> "இந்த தேடல் முடிவில் இரண்டாவது லிங்க் கிளிக் பண்ணு"

**Regen:**

1. Detects: `ta` + command "கிளிக்" → `CLICK`
2. Gets DOM from current tab
3. Finds second search result link
4. Executes click command

### Hindi Navigation

**User:**

> "इस पेज को नीचे स्क्रोल करो"

**Regen:**

1. Detects: `hi` + command "स्क्रोल" → `SCROLL`
2. Executes scroll command
3. Confirms in Hindi: "✅ पेज स्क्रोल किया गया"

---

## Voice Support

### Voice Pipeline

1. **User speaks** in Tamil/Hindi → Browser captures audio
2. **STT** (Speech-to-Text) → Detects language + converts to text
3. **Regen processes** → Same pipeline as text
4. **Response** → In same language
5. **TTS** (optional) → Speaks response back

### STT Integration

Backend endpoint: `POST /api/voice/recognize`

**Request:**

```json
{
  "transcription": "50 ஆயிரம் கீழே லேப்டாப்பு தேடு",
  "detectedLanguage": "ta",
  "sessionId": "abc123",
  "mode": "research"
}
```

**Response:**

```json
{
  "success": true,
  "transcription": "50 ஆயிரம் கீழே லேப்டாப்பு தேடு",
  "detectedLanguage": "ta",
  "response": {
    "text": "🔍 சிறந்த ஆதாரங்களைத் தேடுகிறது...",
    "commands": [...]
  }
}
```

### STT Services (Production)

Recommended services for Indian languages:

- **Google Cloud Speech-to-Text** - Excellent Indian language support
- **Azure Speech Services** - Good Indian language support
- **Whisper** - Multilingual, may need fine-tuning

---

## n8n Workflow Integration

### Language-Aware Workflows

When calling n8n workflows, pass language context:

```typescript
await runWorkflow('multi_source_research', {
  query: 'laptops under 50000',
  inputLanguage: 'ta', // User's input language
  outputLanguage: 'ta', // Response language
  region: 'IN', // Region bias
  maxResults: 5,
});
```

### n8n Workflow Logic

Inside n8n workflows:

1. **Branch** on `inputLanguage`
2. **Search** with language preferences
3. **Return** structured data (language-agnostic)
4. **Regen** handles final translation to user's language

---

## Session Management

### Language Tracking

```typescript
// First message in Tamil
updateSessionLanguage(sessionId, 'ta');
// preferredLanguage = "ta"
// lastUserLanguage = "ta"

// Next message in Hindi
updateSessionLanguage(sessionId, 'hi');
// preferredLanguage = "ta" (unchanged)
// lastUserLanguage = "hi"

// Response will be in Hindi (lastUserLanguage)
```

### Response Language

Regen always responds in `lastUserLanguage`:

- If user switches languages, response follows
- First language becomes `preferredLanguage`
- Can be overridden by user preference

---

## Implementation Files

### Core

- `electron/services/regen/language/detector.ts` - Language detection
- `electron/services/regen/language/commands.ts` - Command dictionary
- `electron/services/regen/session.ts` - Session management

### Tools

- `electron/services/regen/tools/searchTools.ts` - Language-aware search
- `electron/services/regen/tools/n8nTools.ts` - Language-aware workflows

### Handlers

- `electron/services/regen/modes/research.ts` - Multilingual research
- `electron/services/regen/modes/trade.ts` - Multilingual trading
- `server/api/voice-controller.js` - Multilingual voice

---

## Testing Examples

### Tamil

```
User: "50 ஆயிரம் கீழே சிறந்த லேப்டாப்புகளை கண்டுபிடி"
Regen: "🔍 சிறந்த ஆதாரங்களைத் தேடுகிறது..."
```

### Hindi

```
User: "50 हजार के अंदर अच्छे लैपटॉप ढूंढो"
Regen: "🔍 सर्वोत्तम स्रोतों की खोज कर रहा है..."
```

### Hinglish

```
User: "50k ke andar achhe laptop dhoondo"
Regen: "🔍 सर्वोत्तम स्रोतों की खोज कर रहा है..."
```

### Navigation (Tamil)

```
User: "கீழே ஸ்க்ரோல் பண்ணு"
Regen: Executes scroll command
```

### Navigation (Hindi)

```
User: "थोड़ा नीचे स्क्रोल करो"
Regen: Executes scroll command
```

---

## Why This Beats Others

### Global AI Browsers

- ❌ English-only
- ❌ Don't understand commands in Indian languages
- ❌ No voice support for Indian languages

### Regen + Regen

- ✅ **Any Indian language** input (text/voice)
- ✅ **Full power**: search, navigate, automate, trade
- ✅ **Natural commands** in user's language
- ✅ **One unified experience**

---

**Regen is now a true multilingual AI operating system for the web! 🌍🇮🇳**
