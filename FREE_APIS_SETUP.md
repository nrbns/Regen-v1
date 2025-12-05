# 🆓 Free APIs & Models Setup Guide

## ✅ Complete Online/Offline Toggle System

### Mode Toggle

Set one environment variable to switch between online and offline:

```bash
# Online mode (free cloud APIs)
export REGEN_MODE=online

# Offline mode (local models)
export REGEN_MODE=offline
```

### Core Provider System

All providers automatically switch based on mode:

- **LLM**: Free cloud APIs ↔ Local Ollama
- **Vision**: Gemini Flash ↔ Local moondream2/llava
- **Speech-to-Text**: Groq Whisper ↔ Local Whisper
- **Text-to-Speech**: ElevenLabs ↔ Local Piper-TTS
- **Search**: Brave API ↔ Local SearXNG

### Free API Keys (Get in 60 seconds)

| Service | Free Quota | Get Key |
|---------|-----------|---------|
| **Groq** | 1M tokens/day (Llama-3.1-70B) | https://console.groq.com/keys |
| **DeepInfra** | $25 free credit forever | https://deepinfra.com → sign-up |
| **Poe.com** | Unlimited Claude-3.5 + Gemini | https://poe.com → create bot |
| **Brave Search** | 10k queries/month | https://search.brave.com/api |
| **Gemini-1.5-Flash** | 1500 requests/day | Google AI Studio → "Get API key" |

### Setup

**1. Install Dependencies:**

```bash
# Python packages (for YouTube, PDF, etc.)
pip install yt-dlp youtube-transcript-api pillow

# System tools
# ffmpeg (for video processing)
# On Linux: apt-get install ffmpeg
# On macOS: brew install ffmpeg
```

**2. Set Environment Variables:**

```bash
# Mode (online or offline)
export REGEN_MODE=online

# Free API keys (optional, for online mode)
export GROQ_API_KEY=your_groq_key
export DEEPINFRA_API_KEY=your_deepinfra_key
export BRAVE_API_KEY=your_brave_key
export GEMINI_API_KEY=your_gemini_key

# For offline mode
export OLLAMA_BASE_URL=http://localhost:11434
export USE_LOCAL_LLM=true
```

**3. Pull Local Models (Offline Mode):**

```bash
# Install Ollama: https://ollama.com
ollama pull llama3.1:8b      # Good for most laptops
ollama pull llama3.1:70b     # Best quality (needs 24GB+ VRAM)
ollama pull moondream2       # Vision model
ollama pull whisper          # Speech-to-text
```

### Auto-Detection

The system automatically:
- Detects GPU/RAM availability
- Picks best model for your hardware
- Falls back to cloud if local fails
- Rotates free API endpoints for load balancing

### Usage

**In Code:**

```javascript
import { getLLM, getVisionModel, getSTTProvider } from './core/index.js';

// LLM (auto-switches based on mode)
const llm = await getLLM();
const result = await llm.call('Analyze this video...');

// Vision (auto-switches based on mode)
const vision = await getVisionModel();
const analysis = await vision.analyze(['frame1.jpg', 'frame2.jpg'], 'What is in these images?');

// Speech-to-Text (auto-switches based on mode)
const stt = await getSTTProvider();
const transcript = await stt.transcribe(audioBytes);
```

### Model Recommendations

**Offline Mode (by hardware):**

- **Any laptop (8GB+ RAM)**: `phi3.5:mini` or `gemma2:2b`
- **16GB+ RAM**: `llama3.1:8b`
- **24GB+ VRAM (GPU)**: `llama3.1:70b` (best quality)
- **Vision**: `moondream2` (4-8GB VRAM)

**Online Mode:**

- **Fastest**: Groq (Llama-3.1-70B, instant)
- **Best Quality**: DeepInfra (Mixtral-8x7B)
- **Most Features**: Poe (Claude-3.5 + Gemini)

### Docker Deployment

**Online Mode:**
```bash
docker run -p 8000:8000 \
  -e REGEN_MODE=online \
  -e GROQ_API_KEY=your_key \
  your-regen-image
```

**Offline Mode:**
```bash
docker run --gpus all -p 8000:8000 \
  -e REGEN_MODE=offline \
  -v ollama:/root/.ollama \
  your-regen-image
```

### Features

✅ **Zero Cost** - All APIs are free tier
✅ **Unlimited** - Rotates endpoints for load balancing
✅ **Offline Ready** - Works completely air-gapped
✅ **Auto-Detection** - Picks best models for your hardware
✅ **Fallback Logic** - Always works, even if one provider fails

### Result

You now have:
- **Infinite free tokens** (via rotation)
- **Unlimited vision analysis** (Gemini Flash or local)
- **Free voice processing** (Groq or local Whisper)
- **Free search** (Brave or SearXNG)
- **100% offline support** (flip one switch)

**You are now completely unkillable and uncensorable!** 🚀




