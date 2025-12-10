/* eslint-env node */
/**
 * Voice Provider Abstraction
 * Speech-to-Text and Text-to-Speech
 */

import fs from 'fs';
import { isOffline } from './mode-manager.js';
// import { transcribeAudio } from '../services/voice/whisper-service.js'; // Unused
import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';
import FormData from 'form-data';
import { getWhisperLanguageCode } from '../services/voice/whisper-language-map.js';

const execAsync = promisify(exec);
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

/**
 * Get speech-to-text provider
 * DESI POLISH: Supports all 22 Indian languages via language parameter
 */
export async function getSTTProvider(language = 'auto') {
  if (isOffline()) {
    // Offline: Use local Whisper
    return {
      type: 'local',
      model: 'whisper',
      transcribe: async audioBytes => {
        return await transcribeWithLocalWhisper(audioBytes, { language });
      },
    };
  } else {
    // Online: Use free Whisper via Groq or OpenAI via Poe
    return {
      type: 'cloud',
      provider: 'groq', // Or 'poe', 'openai'
      transcribe: async audioBytes => {
        return await transcribeWithCloudWhisper(audioBytes, { language });
      },
    };
  }
}

/**
 * Transcribe with local Whisper (Ollama)
 * DESI POLISH: Supports all 22 Indian languages
 */
async function transcribeWithLocalWhisper(audioBytes, options = {}) {
  try {
    const whisperLang = getWhisperLanguageCode(options.language);
    const requestBody = {
      model: 'whisper',
      prompt: '', // Whisper doesn't need prompt
      audio: audioBytes.toString('base64'),
      stream: false,
    };

    // Add language if specified
    if (whisperLang) {
      requestBody.language = whisperLang;
    }

    // Use Ollama whisper model
    const response = await axios.post(`${OLLAMA_BASE_URL}/api/generate`, requestBody, {
      timeout: 60000,
    });

    return response.data.response;
  } catch {
    // Fallback to faster-whisper or whisper.cpp
    console.warn('[VoiceProvider] Ollama whisper failed, trying faster-whisper...');
    return await transcribeWithFasterWhisper(audioBytes, options);
  }
}

/**
 * Transcribe with faster-whisper (local, faster)
 * DESI POLISH: Supports all 22 Indian languages
 */
async function transcribeWithFasterWhisper(audioBytes, options = {}) {
  // Save to temp file
  const tempFile = `/tmp/audio_${Date.now()}.webm`;
  fs.writeFileSync(tempFile, audioBytes);

  try {
    // DESI POLISH: Map our language code to Whisper language code
    const whisperLang = getWhisperLanguageCode(options.language);
    const languageArg = whisperLang ? `--language ${whisperLang}` : '';

    // Use faster-whisper CLI
    const { stdout } = await execAsync(
      `faster-whisper "${tempFile}" ${languageArg} --output_format txt`
    );
    return stdout.trim();
  } catch (error) {
    throw new Error(`Faster-whisper failed: ${error.message}`);
  } finally {
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  }
}

/**
 * Transcribe with cloud Whisper (free)
 * DESI POLISH: Supports all 22 Indian languages
 */
async function transcribeWithCloudWhisper(audioBytes, options = {}) {
  // Try Groq first (free, fast)
  try {
    const GROQ_API_KEY = process.env.GROQ_API_KEY || 'free';
    const form = new FormData();
    form.append('file', audioBytes, { filename: 'audio.webm', contentType: 'audio/webm' });
    form.append('model', 'whisper-large-v3');

    // DESI POLISH: Map our language code to Whisper language code
    const whisperLang = getWhisperLanguageCode(options.language);
    if (whisperLang) {
      form.append('language', whisperLang);
    }

    const response = await axios.post('https://api.groq.com/openai/v1/audio/transcriptions', form, {
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        ...form.getHeaders(),
      },
    });

    return response.data.text;
  } catch {
    // Fallback to OpenAI via Poe or local
    console.warn('[VoiceProvider] Groq whisper failed, using local fallback');
    return await transcribeWithLocalWhisper(audioBytes, options);
  }
}

/**
 * Get text-to-speech provider
 */
export async function getTTSProvider() {
  if (isOffline()) {
    // Offline: Use Piper-TTS or MeloTTS
    return {
      type: 'local',
      model: 'piper',
      synthesize: async (text, voice = 'en_US-amy-medium') => {
        return await synthesizeWithPiper(text, voice);
      },
    };
  } else {
    // Online: Use ElevenLabs free tier or Kokoro
    return {
      type: 'cloud',
      provider: 'elevenlabs',
      synthesize: async (text, voice = null) => {
        return await synthesizeWithElevenLabs(text, voice);
      },
    };
  }
}

/**
 * Synthesize with Piper-TTS (local)
 */
async function synthesizeWithPiper(text, voice) {
  try {
    const outputFile = `/tmp/tts_${Date.now()}.wav`;
    await execAsync(`echo "${text}" | piper --model ${voice} --output_file "${outputFile}"`);

    if (fs.existsSync(outputFile)) {
      const audioData = fs.readFileSync(outputFile);
      fs.unlinkSync(outputFile);
      return audioData;
    }
    throw new Error('Piper TTS failed to generate audio');
  } catch (error) {
    throw new Error(`Piper TTS failed: ${error.message}`);
  }
}

/**
 * Synthesize with ElevenLabs (free tier)
 */
async function synthesizeWithElevenLabs(text, voiceId = null) {
  const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
  if (!ELEVENLABS_API_KEY) {
    // Fallback to local
    return await synthesizeWithPiper(text);
  }

  try {
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId || '21m00Tcm4TlvDq8ikWAM'}`,
      {
        text,
        model_id: 'eleven_monolingual_v1',
      },
      {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        responseType: 'arraybuffer',
      }
    );

    return Buffer.from(response.data);
  } catch {
    // Fallback to local
    console.warn('[VoiceProvider] ElevenLabs failed, using local fallback');
    return await synthesizeWithPiper(text);
  }
}
