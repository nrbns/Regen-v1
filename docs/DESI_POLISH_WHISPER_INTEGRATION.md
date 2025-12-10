# Desi Polish: Whisper Voice Integration

## Overview

This document describes the integration of all 22 official Indian languages into the Whisper voice recognition system.

## Changes Made

### 1. Language Mapping Utility (`server/services/voice/whisper-language-map.js`)

- Created a new utility to map our language codes to Whisper-supported ISO 639-1 codes
- Supports all 22 official Indian languages:
  - Directly supported: hi, ta, te, bn, mr, kn, ml, gu, pa, ur, or, as, ne, sa
  - Fallback mapping: mai→hi, kok→hi, brx→hi, doi→hi, ks→ur, sat→bn, mni→bn
- Auto-detection support when language is 'auto' or null

### 2. Whisper Service Updates

#### `server/services/voice/whisper-service.cjs`

- Updated `_transcribeOllama()` to accept and use language parameter
- Updated `_transcribeOpenAI()` to map language codes and pass to Whisper API
- Enhanced `detectLanguage()` with Indian language script patterns

#### `server/services/voice/whisper-service.js`

- Updated `transcribeWithOpenAI()` to accept language options
- Updated `transcribeWithLocalWhisper()` to pass language to CLI
- Updated `transcribeAudio()` and `transcribeAudioFile()` to accept language options

#### `server/core/voice-provider.js`

- Updated `getSTTProvider()` to accept language parameter
- Updated `transcribeWithLocalWhisper()` to use language mapping
- Updated `transcribeWithFasterWhisper()` to pass language to CLI
- Updated `transcribeWithCloudWhisper()` to pass language to Groq API

### 3. WebSocket Server Update (`server/services/voice/voice-websocket.cjs`)

- Added session language tracking
- Updated to pass language from client requests to Whisper service
- Language is extracted from control messages and persisted per session

### 4. Client-Side Updates (`src/hooks/useVoiceStream.ts`)

- Added `language` option to `UseVoiceStreamOptions`
- Updated `startRecording()` to pass language in WebSocket message
- Updated `stopRecording()` to pass language for final transcription
- Language defaults to 'auto' for auto-detection

## Usage

### Server-Side

```javascript
const { getWhisperService } = require('./whisper-service.cjs');
const whisperService = getWhisperService();

// Transcribe with specific language
const result = await whisperService.transcribe(audioBuffer, {
  language: 'hi', // Hindi
});

// Auto-detect language
const result = await whisperService.transcribe(audioBuffer, {
  language: 'auto',
});
```

### Client-Side

```typescript
import { useVoiceStream } from '../hooks/useVoiceStream';
import { useSettingsStore } from '../state/settingsStore';

const language = useSettingsStore(state => state.language || 'auto');
const { startRecording, stopRecording } = useVoiceStream({
  language, // Pass language from settings
  onFinalTranscript: text => {
    console.log('Transcribed:', text);
  },
});
```

## Supported Languages

### Directly Supported by Whisper

- Hindi (hi)
- Tamil (ta)
- Telugu (te)
- Bengali (bn)
- Marathi (mr)
- Kannada (kn)
- Malayalam (ml)
- Gujarati (gu)
- Punjabi (pa)
- Urdu (ur)
- Odia (or)
- Assamese (as)
- Nepali (ne)
- Sanskrit (sa)

### Fallback Mappings

- Maithili (mai) → Hindi (Devanagari script)
- Konkani (kok) → Hindi (Devanagari script)
- Bodo (brx) → Hindi (Devanagari script)
- Dogri (doi) → Hindi (Devanagari script)
- Kashmiri (ks) → Urdu (Perso-Arabic script)
- Santali (sat) → Bengali (closest regional language)
- Manipuri (mni) → Bengali (closest regional language)

## Testing

To test the integration:

1. Set language in settings to an Indian language (e.g., 'hi' for Hindi)
2. Start voice recording
3. Speak in the selected language
4. Verify transcription accuracy

## Notes

- Whisper auto-detection works well for mixed-language audio
- For best results, specify the language explicitly when known
- Fallback languages are used when a language is not directly supported by Whisper
- The language parameter is optional and defaults to 'auto' for auto-detection
