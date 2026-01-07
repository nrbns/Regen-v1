# Voice Module - Hands-Free Agent Control

Real-time speech-to-text, text-to-speech, and voice command execution.

## Components

### Audio Processor
Captures and processes microphone input.

```typescript
import { audioProcessor } from './audioProcessor';

// Start recording
await audioProcessor.startRecording();

// Stop and get audio blob
const audioBlob = await audioProcessor.stopRecording();
```

**Features:**
- Echo cancellation
- Noise suppression
- Auto gain control
- Configurable sample rate (16kHz recommended)

### Whisper Service
Speech-to-Text using OpenAI Whisper API.

```typescript
import { whisperService } from './whisperService';

// Transcribe audio
const result = await whisperService.transcribe(audioBlob, 'en');
// { text: "Summarize my emails", language: "en", duration: 2.5 }

// Detect language
const lang = await whisperService.detectLanguage(audioBlob);
```

**Supported:**
- 99+ languages
- Confidence scores (demo includes mock)
- Automatic speech recognition

### Streaming Transcriber
Real-time partial transcriptions while speaking.

```typescript
import { StreamingTranscriber } from './streamingTranscriber';

const transcriber = new StreamingTranscriber({
  chunkDurationMs: 500,
  language: 'en-US',
  includePartial: true,
  onChunk: (chunk) => {
    console.log(`Partial: "${chunk.partial}"`); // "Summarize my..." (live)
    if (chunk.isFinal) {
      console.log(`Final: "${chunk.partial}"`);
    }
  },
  onError: (error) => console.error(error),
});

// Start streaming
await transcriber.start();

// Stop when done
const fullText = await transcriber.stop();
```

### Text-to-Speech (TTS)
Converts text to audio with multiple providers.

```typescript
import { ttsService } from './ttsService';

// Synthesize
const result = await ttsService.synthesize('Summarizing your emails...');

// Play back
await ttsService.play(result.audioBlob);
```

**Providers:**
- Browser Web Speech API (fallback)
- Google Cloud TTS
- ElevenLabs (natural voices)
- Azure TTS

### Voice Agent
Complete voice-controlled workflow.

```typescript
import { createVoiceAgent } from './voiceAgent';

const voiceAgent = createVoiceAgent({
  userId: 'alice@example.com',
  language: 'en-US',
  enableSpokenFeedback: true,
  autoExecute: false, // Require approval for risky actions
});

// Start listening
await voiceAgent.startListening();

// User speaks: "Summarize my emails"
// Agent listens, transcribes, plans, and executes

// Stop listening and get result
const result = await voiceAgent.stopListening();
// {
//   command: "Summarize my emails",
//   planId: "plan-123",
//   status: "completed",
//   result: "{ summariesCreated: 5 }"
// }
```

## Supported Voice Commands

### Mail Agent
- "Summarize my emails"
- "Read unread messages"
- "Send a reply to that email"
- "Summarize the last 10 emails"
- "Show me urgent emails"

### PPT Agent
- "Create a presentation about sales"
- "Generate a deck for Q4 roadmap"
- "Make slides about our new feature"

### Booking Agent
- "Book me a flight to New York"
- "Find hotels in San Francisco for next week"
- "Search for car rentals in LA"

### General
- "Show my calendar"
- "What's my schedule tomorrow"
- "Set a reminder"

## Usage Examples

### Example 1: Basic Voice Command

```typescript
const agent = createVoiceAgent({
  userId: 'user@example.com',
  enableSpokenFeedback: true,
});

// Listen for single command
await agent.startListening();
// User speaks: "Summarize my emails"
const result = await agent.stopListening();
console.log(result.status); // "completed"
```

### Example 2: Continuous Voice Interface

```typescript
const agent = createVoiceAgent({
  userId: 'user@example.com',
  enableSpokenFeedback: true,
  autoExecute: true, // Skip approval for non-critical tasks
});

// Listen for multiple commands
while (true) {
  await agent.startListening();
  const result = await agent.stopListening();

  if (result?.status === 'completed') {
    console.log('Command completed:', result.command);
  } else if (result?.status === 'failed') {
    console.log('Command failed:', result.error);
  }

  // Repeat or break
}
```

### Example 3: Transcription with Feedback

```typescript
import { StreamingTranscriber } from './services/voice/streamingTranscriber';
import { ttsService } from './services/voice/ttsService';

const transcriber = new StreamingTranscriber({
  chunkDurationMs: 500,
  language: 'en-US',
  includePartial: true,
  onChunk: async (chunk) => {
    console.log(`You said: "${chunk.partial}"`);

    if (chunk.isFinal) {
      // Speak back what we heard
      const feedback = `I heard: ${chunk.partial}`;
      const audio = await ttsService.synthesize(feedback);
      await ttsService.play(audio.audioBlob);
    }
  },
  onError: (error) => console.error('Error:', error),
});

await transcriber.start();
const text = await transcriber.stop();
```

## TTS Providers

### Browser Web Speech API (Built-in)
- ✅ Works offline
- ❌ Limited voice quality
- ❌ Limited languages

### Google Cloud TTS
- ✅ Natural sounding
- ✅ 220+ voices
- ❌ Requires API key
- Pricing: $16 per 1M characters

### ElevenLabs
- ✅ Most natural voices
- ✅ Voice cloning
- ❌ Requires API key
- Pricing: $0.30 per 1K characters (or $5/mo basic)

### Azure TTS
- ✅ Good quality
- ✅ 400+ voices
- ❌ Requires API key
- Pricing: $1 per 1M characters

## STT Providers

### OpenAI Whisper
- ✅ Highest accuracy
- ✅ Supports 99 languages
- ✅ Timestamps available
- ❌ Requires API key
- Pricing: $0.02 per 60 seconds

### Google Cloud Speech-to-Text
- ✅ Streaming support
- ✅ Automatic punctuation
- ❌ Requires API key
- Pricing: $0.006 per 15 seconds

### Azure Speech Services
- ✅ Streaming support
- ✅ Speaker identification
- ❌ Requires API key
- Pricing: $1 per hour

## Configuration

### Environment Variables

```bash
# Whisper (STT)
OPENAI_API_KEY=sk-...

# TTS Provider
TTS_PROVIDER=elevenlabs # google, elevenlabs, azure, browser
TTS_API_KEY=sk-... # If not using browser

# Azure specific
AZURE_REGION=eastus
AZURE_SPEECH_KEY=...

# Google Cloud
GOOGLE_CLOUD_PROJECT=my-project
```

### Audio Settings

```typescript
const processor = new AudioProcessor({
  sampleRate: 16000, // Whisper recommended
  channels: 1, // Mono
  bitDepth: 16,
  format: 'wav',
});
```

## Performance

### Latency
- Audio capture: <50ms
- Transcription: 1-3 seconds (Whisper)
- Plan creation: <500ms
- Execution: 2-10 seconds
- **Total: ~5-15 seconds** per command

### Accuracy
- Whisper: 95%+ accuracy (English)
- TTS: Native quality varies by provider
- Voice command recognition: 90%+ (with fallback)

## Security Considerations

- Audio encrypted in transit (HTTPS/WSS)
- Sensitive data masked before TTS (passwords, SSNs)
- User microphone access requires explicit consent
- Rate limiting on voice commands (prevent abuse)
- Audit logging of all voice actions

## Deployment Checklist

- [ ] Obtain API keys (Whisper, TTS provider)
- [ ] Configure audio input permissions
- [ ] Test microphone access in target browser
- [ ] Implement audio encryption for sensitive data
- [ ] Setup audio logging for compliance
- [ ] Test with multiple accents/languages
- [ ] Add noise testing (loud environments)
- [ ] Implement voice authentication (optional)
- [ ] Cache common TTS responses
- [ ] Monitor STT/TTS API costs

## Future Enhancements

- [ ] Voice authentication (speaker recognition)
- [ ] Accent/language auto-detection
- [ ] Custom voice training
- [ ] Emotion detection
- [ ] Multi-language conversation
- [ ] Offline speech recognition (WebRTC)
- [ ] Audio quality optimization
- [ ] Conversation history context
