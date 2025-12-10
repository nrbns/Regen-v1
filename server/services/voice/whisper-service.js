/* eslint-env node */
/**
 * Whisper Service
 * Handles audio transcription
 * Supports OpenAI Whisper API or local Whisper
 */

import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getWhisperLanguageCode } from './whisper-language-map.js';

const execAsync = promisify(exec);

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const WHISPER_MODEL = process.env.WHISPER_MODEL || 'base'; // base, small, medium, large
const USE_LOCAL_WHISPER = process.env.USE_LOCAL_WHISPER === 'true';

/**
 * Transcribe audio using OpenAI Whisper API
 * DESI POLISH: Supports all 22 Indian languages
 */
async function transcribeWithOpenAI(audioBytes, options = {}) {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not set');
  }

  const form = new FormData();
  form.append('file', audioBytes, {
    filename: 'audio.webm',
    contentType: 'audio/webm',
  });
  form.append('model', 'whisper-1');

  // DESI POLISH: Map our language code to Whisper language code
  const whisperLang = getWhisperLanguageCode(options.language);
  if (whisperLang) {
    form.append('language', whisperLang);
  }
  // If null, let Whisper auto-detect (better for mixed languages)

  const response = await axios.post('https://api.openai.com/v1/audio/transcriptions', form, {
    headers: {
      ...form.getHeaders(),
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
  });

  return response.data.text;
}

/**
 * Transcribe audio using local Whisper (via Python)
 * DESI POLISH: Supports all 22 Indian languages
 */
async function transcribeWithLocalWhisper(audioBytes, options = {}) {
  // Save audio to temp file
  const tempFile = `/tmp/audio_${Date.now()}.webm`;
  fs.writeFileSync(tempFile, audioBytes);

  try {
    // DESI POLISH: Map our language code to Whisper language code
    const whisperLang = getWhisperLanguageCode(options.language);
    const languageArg = whisperLang ? `--language ${whisperLang}` : '';

    // Use whisper CLI (requires: pip install openai-whisper)
    const { stdout: _stdout } = await execAsync(
      `whisper "${tempFile}" --model ${WHISPER_MODEL} ${languageArg} --output_format txt --fp16 False`
    );

    // Read transcription
    const txtFile = tempFile.replace('.webm', '.txt');
    const transcription = fs.readFileSync(txtFile, 'utf-8');

    // Cleanup
    fs.unlinkSync(tempFile);
    if (fs.existsSync(txtFile)) {
      fs.unlinkSync(txtFile);
    }

    return transcription.trim();
  } catch (error) {
    // Cleanup on error
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
    throw error;
  }
}

/**
 * Transcribe audio bytes
 * DESI POLISH: Supports all 22 Indian languages via options.language
 * @param {Buffer} audioBytes - Audio data
 * @param {Object} options - Options including language code
 * @param {string} options.language - Language code (e.g., 'hi', 'ta', 'en', 'auto')
 */
export async function transcribeAudio(audioBytes, options = {}) {
  try {
    if (USE_LOCAL_WHISPER) {
      return await transcribeWithLocalWhisper(audioBytes, options);
    } else if (OPENAI_API_KEY) {
      return await transcribeWithOpenAI(audioBytes, options);
    } else {
      // Fallback: Return placeholder (in production, always have one method available)
      console.warn('[WhisperService] No Whisper service configured');
      return 'Transcription service not available';
    }
  } catch (error) {
    console.error('[WhisperService] Transcription failed:', error);
    throw error;
  }
}

/**
 * Transcribe audio file
 * DESI POLISH: Supports all 22 Indian languages via options.language
 * @param {string} filePath - Path to audio file
 * @param {Object} options - Options including language code
 * @param {string} options.language - Language code (e.g., 'hi', 'ta', 'en', 'auto')
 */
export async function transcribeAudioFile(filePath, options = {}) {
  const audioBytes = fs.readFileSync(filePath);
  return await transcribeAudio(audioBytes, options);
}
