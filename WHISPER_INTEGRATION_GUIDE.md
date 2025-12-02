# Whisper.cpp Integration Guide

## Overview

Whisper.cpp provides local, offline voice transcription. This guide documents how to integrate it into Regen.

## Current Status

The `transcribe_voice` command in `phase2_commands.rs` is currently a placeholder. To enable full voice transcription:

## Option 1: Rust Bindings (Recommended for Tauri)

### Step 1: Add Dependency

Uncomment in `Cargo.toml`:

```toml
whisper-rs = "0.11"  # Whisper.cpp bindings
```

Or use alternative:

```toml
whisper-rs = { git = "https://github.com/tazz4843/whisper-rs", branch = "main" }
```

### Step 2: Download Whisper Models

Download a Whisper model (e.g., `base.en.ggml` or `tiny.en.ggml`) and place it in:

```
tauri-migration/src-tauri/models/
```

### Step 3: Implement Transcription

Update `transcribe_voice` in `phase2_commands.rs`:

```rust
use whisper_rs::{FullParams, SamplingStrategy, WhisperContext};

pub async fn transcribe_voice(audio_data: Vec<u8>) -> Result<Value, String> {
    // Initialize Whisper context
    let ctx = WhisperContext::new("models/base.en.ggml")
        .map_err(|e| format!("Failed to load Whisper model: {}", e))?;

    // Convert audio data to f32 samples (assuming 16kHz, mono)
    let samples: Vec<f32> = audio_data
        .chunks_exact(2)
        .map(|chunk| {
            let sample = i16::from_le_bytes([chunk[0], chunk[1]]);
            sample as f32 / 32768.0
        })
        .collect();

    // Create params
    let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });
    params.set_n_threads(4);
    params.set_translate(false);
    params.set_language(Some("en"));
    params.set_print_progress(false);
    params.set_print_special(false);
    params.set_print_realtime(false);
    params.set_print_timestamps(true);

    // Run transcription
    let mut state = ctx.create_state()
        .map_err(|e| format!("Failed to create Whisper state: {}", e))?;

    state.full(params, &samples[..])
        .map_err(|e| format!("Transcription failed: {}", e))?;

    // Get result
    let num_segments = state.full_n_segments()
        .map_err(|e| format!("Failed to get segments: {}", e))?;

    let mut text = String::new();
    for i in 0..num_segments {
        let segment = state.full_get_segment_text(i)
            .map_err(|e| format!("Failed to get segment: {}", e))?;
        text.push_str(&segment);
        text.push(' ');
    }

    Ok(json!({
        "text": text.trim(),
        "intent": "unknown",  // Could use LLM to extract intent
        "confidence": 0.9,
        "entities": {}
    }))
}
```

## Option 2: External Whisper Service

If you prefer to use an external Whisper service (e.g., via HTTP API):

```rust
pub async fn transcribe_voice(audio_data: Vec<u8>) -> Result<Value, String> {
    let client = Client::builder()
        .timeout(Duration::from_secs(60))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    // Encode audio as base64
    let base64_audio = base64::encode(&audio_data);

    // Call Whisper API (example with OpenAI Whisper API)
    let response = client
        .post("https://api.openai.com/v1/audio/transcriptions")
        .header("Authorization", format!("Bearer {}", api_key))
        .multipart(
            reqwest::multipart::Form::new()
                .text("model", "whisper-1")
                .part("file", reqwest::multipart::Part::bytes(audio_data)
                    .file_name("audio.wav")
                    .mime_str("audio/wav")?)
        )
        .send()
        .await
        .map_err(|e| format!("Transcription request failed: {}", e))?;

    let result: Value = response.json().await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    Ok(json!({
        "text": result["text"].as_str().unwrap_or(""),
        "intent": "unknown",
        "confidence": 0.9,
        "entities": {}
    }))
}
```

## Option 3: Use Frontend Implementation

For now, the frontend can use Web Speech API as a fallback:

```typescript
// In src/core/os/omniOSLayer.ts
async transcribeVoice(audioBlob: Blob): Promise<string> {
  // Try Tauri backend first
  if (typeof window !== 'undefined' && window.__TAURI__) {
    try {
      const audioData = new Uint8Array(await audioBlob.arrayBuffer());
      const result = await window.__TAURI__!.invoke<{
        text: string;
        intent: string;
        confidence: number;
      }>('transcribe_voice', { audio_data: Array.from(audioData) });
      return result.text;
    } catch (error) {
      console.warn('[OmniOSLayer] Tauri transcription failed, using fallback:', error);
    }
  }

  // Fallback to Web Speech API
  return new Promise((resolve, reject) => {
    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      resolve(transcript);
    };

    recognition.onerror = (event: any) => {
      reject(new Error(`Speech recognition error: ${event.error}`));
    };

    recognition.start();
  });
}
```

## Recommended Approach

For Regen's offline-first architecture, **Option 1 (Rust bindings)** is recommended:

1. ✅ Fully offline
2. ✅ No API costs
3. ✅ Privacy-first
4. ✅ Fast (native Rust)
5. ✅ Works with Tauri

## Next Steps

1. Uncomment `whisper-rs` in `Cargo.toml`
2. Download a Whisper model (tiny.en.ggml for speed, base.en.ggml for accuracy)
3. Implement the transcription function as shown above
4. Test with sample audio files
5. Integrate with voice command system

## Model Sizes

- `tiny.en.ggml` - ~75MB, fastest, lower accuracy
- `base.en.ggml` - ~140MB, balanced
- `small.en.ggml` - ~460MB, better accuracy
- `medium.en.ggml` - ~1.4GB, best accuracy

For Regen, `base.en.ggml` is recommended for balance of speed and accuracy.
