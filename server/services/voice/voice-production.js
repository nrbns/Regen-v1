/* eslint-env node */
/**
 * Production Voice Mode
 * Whisper + Streaming LLM + VAD (Voice Activity Detection)
 * Converted from Python production code
 */

import { WebSocketServer } from 'ws';
import { streamLLMAnswer } from '../agent/llm.js';
// import { analyzeWithLLM } from '../agent/llm.js'; // Unused

// Note: For production, you'd use a proper Whisper service
// For now, we'll use the existing voice service and enhance it
import { transcribeAudio } from './whisper-service.js';

/**
 * Voice Activity Detection (VAD)
 * Simple threshold-based VAD
 */
function detectVoiceActivity(audioBuffer) {
  // Convert buffer to array
  const samples = new Int16Array(audioBuffer);
  
  // Calculate RMS (Root Mean Square) for volume
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i];
  }
  const rms = Math.sqrt(sum / samples.length);
  
  // Threshold: 0.01 (1% of max amplitude)
  const threshold = 3276; // 0.01 * 32768 (max int16)
  
  return rms > threshold;
}

/**
 * Voice to text using Whisper
 */
async function voiceToText(audioBytes) {
  try {
    // Use existing whisper service or fallback
    const text = await transcribeAudio(audioBytes);
    return text.trim();
  } catch (error) {
    console.warn('[VoiceProduction] Transcription failed:', error.message);
    // Fallback: Return placeholder (in production, use proper Whisper API)
    return null;
  }
}

/**
 * Create voice WebSocket server
 */
export function createVoiceWebSocketServer(httpServer) {
  const wss = new WebSocketServer({
    server: httpServer,
    path: '/ws/voice',
  });

  wss.on('connection', async (ws, _req) => {
    console.log('[VoiceWS] New voice connection');
    
    let buffer = Buffer.alloc(0);
    let _isSpeaking = false;
    let silenceFrames = 0;
    const SILENCE_THRESHOLD = 10; // Frames of silence before processing

    ws.on('message', async (data) => {
      try {
        if (Buffer.isBuffer(data)) {
          buffer = Buffer.concat([buffer, data]);
          
          // VAD: Check if speaking
          const hasVoice = detectVoiceActivity(data);
          
          if (hasVoice) {
            isSpeaking = true;
            silenceFrames = 0;
          } else {
            silenceFrames++;
          }

          // Process if we have enough data and silence detected
          if (buffer.length > 50000 && (!hasVoice && silenceFrames >= SILENCE_THRESHOLD)) {
            const audioChunk = buffer;
            buffer = Buffer.alloc(0);
            silenceFrames = 0;
            isSpeaking = false;

            // Transcribe
            const text = await voiceToText(audioChunk);
            
            if (!text) {
              ws.send(JSON.stringify({
                type: 'error',
                message: 'Transcription failed',
              }));
              return;
            }

            // Send transcription
            ws.send(JSON.stringify({
              type: 'transcription',
              text,
            }));

            // Stream LLM response (using Grok-4 or available model)
            try {
              const streamMeta = await streamLLMAnswer({
                task: 'qa',
                inputText: '',
                question: text,
                onToken: (token) => {
                  ws.send(JSON.stringify({
                    type: 'token',
                    text: token,
                  }));
                },
                temperature: 0.8,
              });

              ws.send(JSON.stringify({
                type: 'done',
                final: streamMeta.answer || '',
                query: text,
                model: streamMeta.model,
              }));
            } catch (error) {
              console.error('[VoiceWS] LLM streaming failed:', error);
              ws.send(JSON.stringify({
                type: 'error',
                message: 'LLM response failed',
              }));
            }
          }
        }
      } catch (error) {
        console.error('[VoiceWS] Message processing error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: error.message,
        }));
      }
    });

    ws.on('close', () => {
      console.log('[VoiceWS] Voice connection closed');
      buffer = Buffer.alloc(0);
    });

    ws.on('error', (error) => {
      console.error('[VoiceWS] WebSocket error:', error);
    });

    // Send connection confirmation
    ws.send(JSON.stringify({
      type: 'connected',
      message: 'Voice WebSocket connected',
    }));
  });

  return wss;
}







