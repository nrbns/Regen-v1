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

const execAsync = promisify(exec);

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const WHISPER_MODEL = process.env.WHISPER_MODEL || 'base'; // base, small, medium, large
const USE_LOCAL_WHISPER = process.env.USE_LOCAL_WHISPER === 'true';

/**
 * Transcribe audio using OpenAI Whisper API
 */
async function transcribeWithOpenAI(audioBytes) {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not set');
  }

  const form = new FormData();
  form.append('file', audioBytes, {
    filename: 'audio.webm',
    contentType: 'audio/webm',
  });
  form.append('model', 'whisper-1');
  form.append('language', 'en');

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
 */
async function transcribeWithLocalWhisper(audioBytes) {
  // Save audio to temp file
  const tempFile = `/tmp/audio_${Date.now()}.webm`;
  fs.writeFileSync(tempFile, audioBytes);

  try {
    // Use whisper CLI (requires: pip install openai-whisper)
    const { stdout } = await execAsync(`whisper "${tempFile}" --model ${WHISPER_MODEL} --language en --output_format txt --fp16 False`);
    
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
 */
export async function transcribeAudio(audioBytes) {
  try {
    if (USE_LOCAL_WHISPER) {
      return await transcribeWithLocalWhisper(audioBytes);
    } else if (OPENAI_API_KEY) {
      return await transcribeWithOpenAI(audioBytes);
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
 */
export async function transcribeAudioFile(filePath) {
  const audioBytes = fs.readFileSync(filePath);
  return await transcribeAudio(audioBytes);
}




